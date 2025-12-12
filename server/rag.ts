import OpenAI from "openai";
import { google } from "googleapis";
import { storage } from "./storage";
import type { Lesson, VideoTranscript, TextChunk } from "@shared/schema";

export class RAGService {
  private openai: OpenAI | null;

  constructor() {
    this.openai = process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;
  }

  /**
   * Get transcript for a YouTube video
   * Priority: YouTube captions > Whisper ASR
   */
  async getVideoTranscript(lesson: Lesson): Promise<string | null> {
    const videoId = lesson.youtubeVideoId;

    // Try YouTube captions first
    try {
      const captions = await this.getYouTubeCaptions(videoId);
      if (captions) {
        await storage.createVideoTranscript({
          lessonId: lesson.id,
          transcript: captions,
          source: "youtube_captions",
          language: "en",
        });
        return captions;
      }
    } catch (error) {
      console.error("YouTube captions failed:", error);
    }

    // Fallback to Whisper ASR (placeholder - would need video download)
    try {
      // This is a placeholder. In production, you'd:
      // 1. Download the video/audio
      // 2. Run Whisper ASR
      // 3. Save the transcript
      console.log("Whisper ASR not implemented yet for video:", videoId);
      return null;
    } catch (error) {
      console.error("Whisper ASR failed:", error);
      return null;
    }
  }

  /**
   * Get YouTube captions/subtitles
   */
  private async getYouTubeCaptions(videoId: string): Promise<string | null> {
    if (!process.env.YOUTUBE_API_KEY) {
      return null;
    }

    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });

    try {
      // Get caption tracks
      const captionResponse = await youtube.captions.list({
        part: ['snippet'],
        videoId: videoId,
      });

      if (!captionResponse.data.items || captionResponse.data.items.length === 0) {
        return null;
      }

      // Find English captions
      const englishCaption = captionResponse.data.items.find(
        item => item.snippet?.language === 'en' || item.snippet?.language?.startsWith('en')
      );

      if (!englishCaption?.id) {
        return null;
      }

      // Download the caption track
      const downloadResponse = await youtube.captions.download({
        id: englishCaption.id,
        tfmt: 'srt', // SubRip format
      });

      // Parse SRT to plain text (simplified)
      const srtText = downloadResponse.data as string;
      const plainText = this.parseSRT(srtText);

      return plainText;
    } catch (error) {
      console.error("YouTube captions download failed:", error);
      return null;
    }
  }

  /**
   * Parse SRT subtitle format to plain text
   */
  private parseSRT(srtContent: string): string {
    // Remove subtitle numbers and timestamps, keep only text
    const lines = srtContent.split('\n');
    const textLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines, numbers, and timestamps
      if (!line || /^\d+$/.test(line) || /\d{2}:\d{2}:\d{2}/.test(line)) {
        continue;
      }

      textLines.push(line);
    }

    return textLines.join(' ').replace(/\s+/g, ' ').trim();
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
    if (!this.openai) {
      throw new Error("OpenAI API key not configured");
    }

    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });

    return response.data.map(item => item.embedding);
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
      console.log(`No transcript available for lesson ${lesson.id}`);
      return;
    }

    // Chunk the transcript
    const chunks = this.chunkTranscript(transcript);

    // Generate embeddings for all chunks
    const chunkTexts = chunks.map(chunk => chunk.content);
    const embeddings = await this.generateEmbeddings(chunkTexts);

    // Save chunks with embeddings
    for (let i = 0; i < chunks.length; i++) {
      await storage.createTextChunk({
        lessonId: lesson.id,
        transcriptId: existingTranscript!.id,
        chunkIndex: i,
        content: chunks[i].content,
        startTime: chunks[i].startTime,
        endTime: chunks[i].endTime,
        tokenCount: chunks[i].content.split(' ').length, // Rough estimate
        embedding: JSON.stringify(embeddings[i]),
      });
    }

    console.log(`Processed ${chunks.length} chunks for lesson ${lesson.id}`);
  }

  /**
   * Search for relevant chunks using semantic similarity
   */
  async semanticSearch(query: string, lessonId?: string, limit: number = 5): Promise<TextChunk[]> {
    // For now, return chunks from the specified lesson or all chunks
    // In production, implement proper vector similarity search with pgvector
    const chunks = await storage.getTextChunksByLesson(lessonId || "");

    // Simple text-based relevance scoring (placeholder for vector search)
    const queryLower = query.toLowerCase();
    const scoredChunks = chunks
      .map(chunk => ({
        ...chunk,
        score: chunk.content.toLowerCase().includes(queryLower) ? 1 : 0
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scoredChunks;
  }

  /**
   * Generate RAG-enhanced response
   */
  async generateRAGResponse(
    question: string,
    courseTitle: string,
    courseDescription: string,
    relevantChunks: TextChunk[]
  ): Promise<{ answer: string; sources: Array<{ lessonId: string; timestamp: number; snippet: string }> }> {
    if (!this.openai) {
      return {
        answer: "AI assistant is not configured. Please check OpenAI API key.",
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

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      max_tokens: 500,
    });

    const answer = response.choices[0].message.content || "I couldn't generate a response.";

    return { answer, sources };
  }
}

// Export singleton instance
export const ragService = new RAGService();