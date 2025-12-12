import { storage } from "./storage";
import { ragService } from "./rag";

/**
 * Process all lessons in the database for RAG
 * This script should be run periodically or after adding new lessons
 */
async function processAllLessonsForRAG() {
  console.log("Starting RAG processing for all lessons...");

  try {
    // Get all courses
    const courses = await storage.getCourses();
    console.log(`Found ${courses.length} courses`);

    let totalLessons = 0;
    let processedLessons = 0;

    for (const course of courses) {
      console.log(`Processing course: ${course.title}`);

      // Get sections for this course
      const sections = await storage.getSectionsByCourse(course.id);

      for (const section of sections) {
        for (const lesson of section.lessons) {
          totalLessons++;
          console.log(`Processing lesson: ${lesson.title} (${lesson.id})`);

          try {
            await ragService.processLessonForRAG(lesson);
            processedLessons++;
            console.log(`✅ Processed lesson: ${lesson.title}`);
          } catch (error) {
            console.error(`❌ Failed to process lesson ${lesson.id}:`, error);
          }

          // Add a small delay to avoid overwhelming APIs
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    console.log(`\n🎉 RAG processing complete!`);
    console.log(`Total lessons: ${totalLessons}`);
    console.log(`Successfully processed: ${processedLessons}`);
    console.log(`Failed: ${totalLessons - processedLessons}`);

  } catch (error) {
    console.error("Error in RAG processing:", error);
  }
}

// Run if called directly
if (require.main === module) {
  processAllLessonsForRAG()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { processAllLessonsForRAG };