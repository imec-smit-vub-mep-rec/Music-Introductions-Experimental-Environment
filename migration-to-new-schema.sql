-- Migration: Convert from old schema to new redesigned schema
-- This migration converts the existing experiment_sessions table to the new structure
-- Date: 2024-12-19

-- Step 1: Create backup table with old structure
CREATE TABLE IF NOT EXISTS experiment_sessions_backup AS 
SELECT * FROM experiment_sessions;

-- Step 2: Drop existing indexes and views
DROP INDEX IF EXISTS idx_onboarding_answers;
DROP INDEX IF EXISTS idx_song_answers;
DROP VIEW IF EXISTS session_data_export;
DROP VIEW IF EXISTS session_analytics;

-- Step 3: Add new columns to existing table
ALTER TABLE experiment_sessions 
ADD COLUMN IF NOT EXISTS demographics_answers JSONB NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS post_listening_answers JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS final_answers JSONB NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS raw_session_data JSONB NOT NULL DEFAULT '{}';

-- Step 4: Rename existing columns to match new structure
ALTER TABLE experiment_sessions 
RENAME COLUMN song_answers TO post_listening_answers_old;

-- Step 5: Migrate existing data to new structure
-- Extract demographic answers from onboarding_answers
UPDATE experiment_sessions 
SET demographics_answers = jsonb_build_object(
    'QID10', onboarding_answers->'QID10',  -- Gender
    'QID11', onboarding_answers->'QID11',  -- Age
    'QID1218898227', onboarding_answers->'QID1218898227'  -- Country
)
WHERE onboarding_answers ? 'QID10' 
   OR onboarding_answers ? 'QID11' 
   OR onboarding_answers ? 'QID1218898227';

-- Move song answers to post_listening_answers
UPDATE experiment_sessions 
SET post_listening_answers = post_listening_answers_old
WHERE post_listening_answers_old IS NOT NULL;

-- Remove demographic answers from onboarding_answers
UPDATE experiment_sessions 
SET onboarding_answers = onboarding_answers - 'QID10' - 'QID11' - 'QID1218898227'
WHERE onboarding_answers ? 'QID10' 
   OR onboarding_answers ? 'QID11' 
   OR onboarding_answers ? 'QID1218898227';

-- Create raw session data backup (reconstruct from existing data)
UPDATE experiment_sessions 
SET raw_session_data = jsonb_build_object(
    'session_id', session_id,
    'group', group_type,
    'chosen_genre', chosen_genre,
    'randomized_songs', randomized_songs,
    'randomized_introductions', randomized_introductions,
    'start_time', start_time,
    'experiment_completed', experiment_completed,
    'answers', jsonb_build_object(
        'onboarding', onboarding_answers,
        'demographics', demographics_answers,
        'songs', post_listening_answers,
        'final', final_answers
    ),
    'engagement_metrics', engagement_metrics
);

-- Step 6: Drop old column
ALTER TABLE experiment_sessions 
DROP COLUMN IF EXISTS post_listening_answers_old;

-- Step 7: Create new indexes
CREATE INDEX IF NOT EXISTS idx_demographics_answers ON experiment_sessions USING GIN (demographics_answers);
CREATE INDEX IF NOT EXISTS idx_post_listening_answers ON experiment_sessions USING GIN (post_listening_answers);
CREATE INDEX IF NOT EXISTS idx_final_answers ON experiment_sessions USING GIN (final_answers);
CREATE INDEX IF NOT EXISTS idx_raw_session_data ON experiment_sessions USING GIN (raw_session_data);

-- Step 8: Recreate views with new structure
CREATE OR REPLACE VIEW session_data_export AS
SELECT 
    session_id,
    group_type,
    chosen_genre,
    start_time,
    onboarding_answers,
    demographics_answers,
    post_listening_answers,
    final_answers,
    engagement_metrics,
    created_at,
    updated_at
FROM experiment_sessions
ORDER BY created_at DESC;

CREATE OR REPLACE VIEW session_analytics AS
SELECT 
    group_type,
    chosen_genre,
    COUNT(*) as session_count,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_session_duration_seconds,
    COUNT(CASE WHEN jsonb_array_length(post_listening_answers) = 3 THEN 1 END) as completed_sessions,
    COUNT(CASE WHEN experiment_completed = TRUE THEN 1 END) as fully_completed_sessions,
    -- Demographic breakdowns
    COUNT(CASE WHEN demographics_answers ? 'QID10' THEN 1 END) as sessions_with_gender,
    COUNT(CASE WHEN demographics_answers ? 'QID11' THEN 1 END) as sessions_with_age,
    COUNT(CASE WHEN demographics_answers ? 'QID1218898227' THEN 1 END) as sessions_with_country,
    DATE_TRUNC('day', created_at) as session_date
FROM experiment_sessions
GROUP BY group_type, chosen_genre, DATE_TRUNC('day', created_at)
ORDER BY session_date DESC;

-- Step 9: Verification queries
-- Check migration success
SELECT 
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN demographics_answers != '{}' THEN 1 END) as sessions_with_demographics,
  COUNT(CASE WHEN jsonb_array_length(post_listening_answers) > 0 THEN 1 END) as sessions_with_songs,
  COUNT(CASE WHEN final_answers != '{}' THEN 1 END) as sessions_with_final,
  COUNT(CASE WHEN raw_session_data != '{}' THEN 1 END) as sessions_with_raw_backup
FROM experiment_sessions;

-- Check data integrity
SELECT 
  session_id,
  CASE 
    WHEN demographics_answers ? 'QID10' AND demographics_answers ? 'QID11' AND demographics_answers ? 'QID1218898227' 
    THEN 'Complete demographics'
    ELSE 'Incomplete demographics'
  END as demographics_status,
  CASE 
    WHEN jsonb_array_length(post_listening_answers) = 3 
    THEN 'Complete songs'
    ELSE 'Incomplete songs'
  END as songs_status
FROM experiment_sessions
ORDER BY session_id DESC
LIMIT 10;

COMMIT;

-- Migration completed successfully!
-- The new schema structure is now in place with:
-- - onboarding_answers: Personality and music preference questions
-- - demographics_answers: Gender, age, country questions  
-- - post_listening_answers: Song-specific questions (array of 3)
-- - final_answers: Overall experience questions
-- - raw_session_data: Complete session backup
-- - All existing data has been migrated and preserved
