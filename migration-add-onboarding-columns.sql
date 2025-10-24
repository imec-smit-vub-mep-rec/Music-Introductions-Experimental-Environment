-- Migration script to add onboarding_answers and song_answers columns
-- Run this if you already have an existing experiment_sessions table

-- Add new columns
ALTER TABLE experiment_sessions 
ADD COLUMN IF NOT EXISTS onboarding_answers JSONB NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS song_answers JSONB NOT NULL DEFAULT '[]';

-- Migrate existing data from the old 'answers' column to new columns
UPDATE experiment_sessions 
SET 
  onboarding_answers = COALESCE(answers->'onboarding', '{}'::jsonb),
  song_answers = COALESCE(answers->'songs', '[]'::jsonb)
WHERE answers IS NOT NULL;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_onboarding_answers ON experiment_sessions USING GIN (onboarding_answers);
CREATE INDEX IF NOT EXISTS idx_song_answers ON experiment_sessions USING GIN (song_answers);

-- Drop existing views first (they reference the old 'answers' column)
DROP VIEW IF EXISTS session_data_export;
DROP VIEW IF EXISTS session_analytics;

-- Drop the old 'answers' column
ALTER TABLE experiment_sessions DROP COLUMN IF EXISTS answers;

-- Recreate the views with the new column structure
CREATE VIEW session_data_export AS
SELECT 
    session_id,
    group_type,
    chosen_genre,
    start_time,
    onboarding_answers,
    song_answers,
    engagement_metrics,
    created_at,
    updated_at
FROM experiment_sessions
ORDER BY created_at DESC;

-- Recreate analytics view
CREATE VIEW session_analytics AS
SELECT 
    group_type,
    chosen_genre,
    COUNT(*) as session_count,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_session_duration_seconds,
    COUNT(CASE WHEN jsonb_array_length(song_answers) > 0 THEN 1 END) as completed_sessions,
    DATE_TRUNC('day', created_at) as session_date
FROM experiment_sessions
GROUP BY group_type, chosen_genre, DATE_TRUNC('day', created_at)
ORDER BY session_date DESC;
