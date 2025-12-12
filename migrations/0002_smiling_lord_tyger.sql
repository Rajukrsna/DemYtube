CREATE TABLE "text_chunks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" varchar NOT NULL,
	"transcript_id" varchar NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"start_time" integer NOT NULL,
	"end_time" integer NOT NULL,
	"token_count" integer NOT NULL,
	"embedding" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_transcripts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" varchar NOT NULL,
	"transcript" text NOT NULL,
	"source" varchar(20) NOT NULL,
	"language" varchar(10) DEFAULT 'en',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "text_chunks" ADD CONSTRAINT "text_chunks_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "text_chunks" ADD CONSTRAINT "text_chunks_transcript_id_video_transcripts_id_fk" FOREIGN KEY ("transcript_id") REFERENCES "public"."video_transcripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_transcripts" ADD CONSTRAINT "video_transcripts_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_text_chunks_lesson" ON "text_chunks" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "IDX_text_chunks_transcript" ON "text_chunks" USING btree ("transcript_id");--> statement-breakpoint
CREATE INDEX "IDX_video_transcripts_lesson" ON "video_transcripts" USING btree ("lesson_id");