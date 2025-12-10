-- Add total_duration column to certificates table
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS total_duration INTEGER DEFAULT 0;
