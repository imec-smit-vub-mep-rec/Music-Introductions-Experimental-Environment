-- Migration script to add Qualtrics response ID column
-- Run this script to update your existing database schema

-- Add the new column for Qualtrics response tracking
ALTER TABLE experiment_sessions 
ADD COLUMN IF NOT EXISTS qualtrics_response_id VARCHAR(255);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_qualtrics_response_id ON experiment_sessions(qualtrics_response_id);

-- Drop and recreate the view to include the new column
DROP VIEW IF EXISTS session_data_export;

CREATE VIEW session_data_export AS
SELECT 
    session_id,
    group_type,
    chosen_genre,
    start_time,
    onboarding_answers,
    demographics_answers,
    post_listening_answers,
    final_answers,
    qualtrics_response_id,
    engagement_metrics,
    created_at,
    updated_at
FROM experiment_sessions
ORDER BY created_at DESC;

-- Add comment for documentation
COMMENT ON COLUMN experiment_sessions.qualtrics_response_id IS 'Qualtrics response ID for tracking and updating survey responses via API';

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'experiment_sessions' 
  AND column_name = 'qualtrics_response_id';
