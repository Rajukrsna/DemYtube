import { GoogleGenerativeAI } from "@google/generative-ai";
import { google } from "googleapis";
import { OpenAI } from "openai";
import { storage } from "./storage";
import { spawn } from "child_process";
import { join } from "path";
import { promises as fs } from "fs";
import * as path from "path";
import ytdlp from "yt-dlp-exec";
import type { Lesson, VideoTranscript, TextChunk } from "@shared/schema";

export class RAGService {
  private genAI: GoogleGenerativeAI | null;
  private embeddingModel: any;
  private chatModel: any;
  private openai: OpenAI | null;

  constructor() {
    if (process.env.GOOGLE_GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
      this.embeddingModel = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
      this.chatModel = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    } else {
      this.genAI = null;
      this.embeddingModel = null;
      this.chatModel = null;
    }

    // Initialize OpenAI for Whisper
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } else {
      this.openai = null;
    }
  }

  /**
   * Get transcript for a YouTube video using Whisper ASR
   */
  async getVideoTranscript(lesson: Lesson): Promise<string | null> {
    const videoId = lesson.youtubeVideoId;

    try {
      // Download audio from YouTube
      const audioPath = await this.downloadYouTubeAudio(videoId);
      if (!audioPath) {
        console.log(`Failed to download audio for video ${videoId}`);
        return null;
      }

      // Transcribe using Whisper
      const transcript = await this.transcribeWithWhisper(audioPath);
      if (!transcript) {
        console.log(`Failed to transcribe audio for video ${videoId}`);
        return null;
      }

      // Clean up temporary audio file
      await this.cleanupFile(audioPath);

      // Save transcript to database
      await storage.createVideoTranscript({
        lessonId: lesson.id,
        transcript: transcript,
        source: "whisper_asr",
        language: "en",
      });

      console.log(`Successfully transcribed video ${videoId} (${transcript.length} characters)`);
      return transcript;

    } catch (error) {
      console.error("Whisper transcription failed:", error);
      return null;
    }
  }

  /**
   * Download audio from YouTube video
   */
  private async downloadYouTubeAudio(videoId: string): Promise<string | null> {
    try {
      // Create temp directory if it doesn't exist
      const tempDir = path.join(process.cwd(), 'temp');
      await fs.mkdir(tempDir, { recursive: true });

      const audioPath = path.join(tempDir, `${videoId}.mp3`);
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      console.log(`Downloading audio for video ${videoId}...`);

      // Use yt-dlp-exec to download audio
      await ytdlp(videoUrl, {
        extractAudio: true,
        audioFormat: 'mp3',
        audioQuality: 0, // Best quality
        output: audioPath,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
      });

      // Check if file exists and has content
      const stats = await fs.stat(audioPath);
      if (stats.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      console.log(`Successfully downloaded audio: ${audioPath} (${stats.size} bytes)`);
      return audioPath;

    } catch (error) {
      console.error('YouTube audio download failed:', error);
      return null;
    }
  }

  /**
   * Transcribe audio using local Whisper
   */
  private async transcribeWithWhisper(audioPath: string): Promise<string | null> {
    try {
      console.log(`Transcribing audio file: ${audioPath}`);

      // Path to the Python script
      const scriptPath = join(process.cwd(), 'script', 'transcribe.py');

      // Run the Python script
      const transcript = await new Promise<string | null>((resolve, reject) => {
        const pythonProcess = spawn('python', [scriptPath, audioPath], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
          if (code === 0) {
            resolve(stdout.trim());
          } else {
            console.error('Python script failed:', stderr);
            resolve(null);
          }
        });

        pythonProcess.on('error', (error) => {
          console.error('Failed to start Python process:', error);
          resolve(null);
        });
      });

      if (transcript) {
        console.log(`Transcription completed: ${transcript.length} characters`);
        return transcript;
      } else {
        return null;
      }

    } catch (error) {
      console.error('Whisper transcription failed:', error);
      return null;
    }
  }

  /**
   * Clean up temporary files
   */
  private async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      console.log(`Cleaned up temporary file: ${filePath}`);
    } catch (error) {
      console.error('Failed to cleanup file:', filePath, error);
    }
  }

  /**
   * Chunk transcript into overlapping pieces
   */
  chunkTranscript(
    transcript: string,
    chunkSize: number = 500,
    overlap: number = 100
  ): Array<{ content: string; startTime: number; endTime: number }> {
    const words = transcript.split(' ');
    const chunks: Array<{ content: string; startTime: number; endTime: number }> = [];

    // Estimate timing (rough approximation)
    const totalWords = words.length;
    const duration = 300; // Assume 5 minutes = 300 seconds for demo

    for (let i = 0; i < words.length; i += (chunkSize - overlap)) {
      const chunkWords = words.slice(i, i + chunkSize);
      const chunkText = chunkWords.join(' ');

      // Estimate time range for this chunk
      const startProgress = i / totalWords;
      const endProgress = Math.min((i + chunkSize) / totalWords, 1);

      const startTime = Math.floor(startProgress * duration);
      const endTime = Math.floor(endProgress * duration);

      chunks.push({
        content: chunkText,
        startTime,
        endTime,
      });
    }

    return chunks;
  }

  /**
   * Generate embeddings for text chunks
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.embeddingModel) {
      throw new Error("Google Gemini API key not configured");
    }

    try {
      const embeddings: number[][] = [];

      // Process each text individually (Gemini embedding API works per text)
      for (const text of texts) {
        const result = await this.embeddingModel.embedContent({
          content: { parts: [{ text }] }
        });
        embeddings.push(result.embedding.values);
      }
      return embeddings;
    } catch (error) {
      console.error("Gemini embedding error:", error);
      throw new Error("Failed to generate embeddings with Gemini");
    }
  }

  /**
   * Process a lesson: get transcript, chunk it, generate embeddings
   */
  async processLessonForRAG(lesson: Lesson): Promise<void> {
    // Check if already processed
    const existingTranscript = await storage.getVideoTranscript(lesson.id);
    if (existingTranscript) {
      console.log(`Lesson ${lesson.id} already has transcript`);
      return;
    }

    // Get transcript
    const transcript = await this.getVideoTranscript(lesson);
    if (!transcript) {
      console.log(`No transcript available for lesson ${lesson.id} (${lesson.title}) - skipping RAG processing`);
      return;
    }

    // Retrieve the transcript record that was just created
    const transcriptRecord = await storage.getVideoTranscript(lesson.id);
    if (!transcriptRecord) {
      console.error(`Failed to retrieve transcript record for lesson ${lesson.id}`);
      return;
    }

    console.log(`Processing lesson "${lesson.title}" for RAG...`);

    // Chunk the transcript
    const chunks = this.chunkTranscript(transcript);
    console.log(`Created ${chunks.length} chunks for lesson ${lesson.id}`);

    // Generate embeddings for all chunks
    const chunkTexts = chunks.map(chunk => chunk.content);
    const embeddings = await this.generateEmbeddings(chunkTexts);
    console.log(`Generated embeddings for ${embeddings.length} chunks`);

    // Save chunks with embeddings
    for (let i = 0; i < chunks.length; i++) {
      await storage.createTextChunk({
        lessonId: lesson.id,
        transcriptId: transcriptRecord.id,
        chunkIndex: i,
        content: chunks[i].content,
        startTime: chunks[i].startTime,
        endTime: chunks[i].endTime,
        tokenCount: chunks[i].content.split(' ').length, // Rough estimate
        embedding: embeddings[i],
      });
    }

    console.log(`✅ Successfully processed ${chunks.length} chunks for lesson ${lesson.id}`);
  }

  /**
   * Search for relevant chunks using semantic similarity
   */
  async semanticSearch(query: string, lessonId?: string, limit: number = 5, similarityThreshold: number = 0.3): Promise<TextChunk[]> {
    // Generate embedding for the query
    const queryEmbedding = await this.generateEmbeddings([query]);
    if (queryEmbedding.length === 0) {
      throw new Error("Failed to generate embedding for query");
    }

    // Use pgvector for efficient similarity search
    const relevantChunks = await storage.searchTextChunksByVector(
      queryEmbedding[0],
      lessonId,
      limit,
      similarityThreshold
    );

    return relevantChunks;
  }

  /**
   * Generate RAG-enhanced response using Gemini
   */
  async generateRAGResponse(
    question: string,
    courseTitle: string,
    courseDescription: string,
    relevantChunks: TextChunk[]
  ): Promise<{ answer: string; sources: Array<{ lessonId: string; timestamp: number; snippet: string }> }> {
    if (!this.chatModel) {
      return {
        answer: "AI assistant is not configured. Please check Google Gemini API key.",
        sources: []
      };
    }

    // If no relevant chunks, provide a helpful response
    if (relevantChunks.length === 0) {
      return {
        answer: `I don't have specific information from the course content about "${question}". The course "${courseTitle}" may not have been processed for AI assistance yet, or this topic might not be covered in the available video transcripts. Try asking about specific topics you see in the course lessons.`,
        sources: []
      };
    }

    // Build context from relevant chunks
    const context = relevantChunks
      .map(chunk => `[${Math.floor(chunk.startTime / 60)}:${(chunk.startTime % 60).toString().padStart(2, '0')}] ${chunk.content}`)
      .join('\n\n');

    const sources = relevantChunks.map(chunk => ({
      lessonId: chunk.lessonId,
      timestamp: chunk.startTime,
      snippet: chunk.content.substring(0, 200) + (chunk.content.length > 200 ? '...' : ''),
    }));

    const systemPrompt = `You are a helpful course assistant for "${courseTitle}".
Course description: ${courseDescription}

Answer the student's question based ONLY on the provided context from the course content.
If the context doesn't contain enough information to answer the question, say "I don't have enough information about that in the course content."

Include specific timestamps when relevant to help students navigate to the exact part of the video.

Context from course videos:
${context}`;

    try {
      const chat = this.chatModel.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: systemPrompt }]
          },
          {
            role: "model",
            parts: [{ text: "I understand. I'll help students with questions about this course using only the provided context." }]
          }
        ]
      });

      const result = await chat.sendMessage(question);
      const answer = result.response.text() || "I couldn't generate a response.";

      return { answer, sources };
    } catch (error) {
      console.error("Gemini chat error:", error);
      return {
        answer: "Sorry, I encountered an error while generating a response. Please try again.",
        sources
      };
    }
  }
}

// Export singleton instance
export const ragService = new RAGService();