-- Neon PostgreSQL Schema for Serendipity Experiment - Redesigned
-- Individual columns for each questionnaire section for better data organization
-- Date: 2024-12-19

-- Drop existing table if it exists (for clean migration)
-- DROP TABLE IF EXISTS experiment_sessions CASCADE;

-- Create the experiment_sessions table with logical column structure
CREATE TABLE IF NOT EXISTS experiment_sessions (
    -- Primary identifiers
    id VARCHAR(255) PRIMARY KEY, -- session_${session_id}
    session_id BIGINT UNIQUE NOT NULL,
    
    -- Experiment configuration
    group_type VARCHAR(20) NOT NULL CHECK (group_type IN ('unfamiliar', 'familiar')),
    chosen_genre VARCHAR(50),
    randomized_songs JSONB NOT NULL DEFAULT '[]',
    randomized_introductions JSONB NOT NULL DEFAULT '[]',
    
    -- Questionnaire data (individual columns for each section)
    onboarding_answers JSONB NOT NULL DEFAULT '{}', -- pre_list_onboarding: personality, music preferences
    demographics_answers JSONB NOT NULL DEFAULT '{}', -- pre_list_demographics: gender, age, country
    post_listening_answers JSONB NOT NULL DEFAULT '[]', -- post_item: song-specific questions (array of 3)
    final_answers JSONB NOT NULL DEFAULT '{}', -- post_list: overall experience questions
    
    -- Qualtrics integration
    qualtrics_response_id VARCHAR(255), -- Qualtrics response ID for updates
    
    -- Raw session backup
    raw_session_data JSONB NOT NULL DEFAULT '{}', -- Complete session object backup
    
    -- Metadata
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    experiment_completed BOOLEAN NOT NULL DEFAULT FALSE,
    engagement_metrics JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL -- GDPR compliance: auto-delete after 2 years
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_id ON experiment_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_group_type ON experiment_sessions(group_type);
CREATE INDEX IF NOT EXISTS idx_chosen_genre ON experiment_sessions(chosen_genre);
CREATE INDEX IF NOT EXISTS idx_created_at ON experiment_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_expires_at ON experiment_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_experiment_completed ON experiment_sessions(experiment_completed);

-- Create indexes for JSONB columns for better query performance
CREATE INDEX IF NOT EXISTS idx_onboarding_answers ON experiment_sessions USING GIN (onboarding_answers);
CREATE INDEX IF NOT EXISTS idx_demographics_answers ON experiment_sessions USING GIN (demographics_answers);
CREATE INDEX IF NOT EXISTS idx_post_listening_answers ON experiment_sessions USING GIN (post_listening_answers);
CREATE INDEX IF NOT EXISTS idx_final_answers ON experiment_sessions USING GIN (final_answers);
CREATE INDEX IF NOT EXISTS idx_raw_session_data ON experiment_sessions USING GIN (raw_session_data);
CREATE INDEX IF NOT EXISTS idx_engagement_metrics ON experiment_sessions USING GIN (engagement_metrics);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_experiment_sessions_updated_at 
    BEFORE UPDATE ON experiment_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- GDPR Compliance: Create function to automatically delete expired sessions
CREATE OR REPLACE FUNCTION delete_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM experiment_sessions 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the deletion (optional)
    RAISE NOTICE 'Deleted % expired sessions', deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run the cleanup function (if using pg_cron extension)
-- Note: This requires the pg_cron extension to be enabled
-- SELECT cron.schedule('delete-expired-sessions', '0 2 * * *', 'SELECT delete_expired_sessions();');

-- Create view for GDPR data export
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

-- Create view for analytics (anonymized)
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

-- Row Level Security (RLS) for additional privacy
-- Note: This is optional and depends on your specific requirements
-- ALTER TABLE experiment_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous access (if needed)
-- CREATE POLICY "Allow anonymous access" ON experiment_sessions
--     FOR ALL USING (true);

-- Grant necessary permissions
-- GRANT SELECT, INSERT, UPDATE, DELETE ON experiment_sessions TO your_app_user;
-- GRANT USAGE ON SEQUENCE experiment_sessions_id_seq TO your_app_user;

-- Example queries for data analysis:

-- 1. Export all data for a specific session
-- SELECT * FROM session_data_export WHERE session_id = 1234567890;

-- 2. Delete a specific session (Right to be forgotten)
-- DELETE FROM experiment_sessions WHERE session_id = 1234567890;

-- 3. Get all sessions for data export
-- SELECT * FROM session_data_export;

-- 4. Clean up expired sessions manually
-- SELECT delete_expired_sessions();

-- 5. Get analytics (anonymized)
-- SELECT * FROM session_analytics;

-- 6. Query onboarding answers specifically
-- SELECT session_id, onboarding_answers FROM experiment_sessions 
-- WHERE onboarding_answers ? 'QID1'; -- Find sessions with imagination data

-- 7. Query demographics specifically
-- SELECT session_id, demographics_answers FROM experiment_sessions 
-- WHERE demographics_answers ? 'QID10'; -- Find sessions with gender data

-- 8. Query post-listening answers specifically
-- SELECT session_id, post_listening_answers FROM experiment_sessions 
-- WHERE jsonb_array_length(post_listening_answers) > 0; -- Find sessions with song data

-- 9. Query final answers specifically
-- SELECT session_id, final_answers FROM experiment_sessions 
-- WHERE final_answers ? 'QID4'; -- Find sessions with enjoyment data

-- 10. Find sessions by specific demographic answer
-- SELECT session_id, demographics_answers->>'QID10' as gender 
-- FROM experiment_sessions 
-- WHERE demographics_answers->>'QID10' = '1';

-- 11. Count sessions by group and demographic responses
-- SELECT 
--   group_type,
--   demographics_answers->>'QID10' as gender,
--   COUNT(*) as session_count
-- FROM experiment_sessions 
-- WHERE demographics_answers ? 'QID10'
-- GROUP BY group_type, demographics_answers->>'QID10';

-- 12. Count sessions by age group (derived from birth year)
-- SELECT 
--   CASE 
--     WHEN (demographics_answers->>'QID11')::int BETWEEN 18 AND 24 THEN '18-24'
--     WHEN (demographics_answers->>'QID11')::int BETWEEN 25 AND 34 THEN '25-34'
--     WHEN (demographics_answers->>'QID11')::int BETWEEN 35 AND 44 THEN '35-44'
--     WHEN (demographics_answers->>'QID11')::int BETWEEN 45 AND 54 THEN '45-54'
--     WHEN (demographics_answers->>'QID11')::int BETWEEN 55 AND 64 THEN '55-64'
--     ELSE '65+'
--   END as age_group,
--   COUNT(*) as session_count
-- FROM experiment_sessions 
-- WHERE demographics_answers ? 'QID11'
-- GROUP BY age_group;

-- 13. Query specific song answers (first song)
-- SELECT session_id, post_listening_answers->0 as first_song_answers
-- FROM experiment_sessions 
-- WHERE jsonb_array_length(post_listening_answers) > 0;

-- 14. Query average enjoyment by group
-- SELECT 
--   group_type,
--   AVG((final_answers->>'QID4')::int) as avg_enjoyment
-- FROM experiment_sessions 
-- WHERE final_answers ? 'QID4'
-- GROUP BY group_type;

-- 15. Query sessions with complete data
-- SELECT COUNT(*) as sessions_with_complete_data
-- FROM experiment_sessions 
-- WHERE onboarding_answers != '{}' 
--   AND demographics_answers != '{}' 
--   AND jsonb_array_length(post_listening_answers) = 3
--   AND final_answers != '{}';

COMMIT;
