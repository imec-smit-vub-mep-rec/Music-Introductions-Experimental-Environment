-- Neon PostgreSQL Schema for Serendipity Experiment
-- GDPR-compliant session storage with automatic data retention

-- Create the experiment_sessions table
CREATE TABLE IF NOT EXISTS experiment_sessions (
    id VARCHAR(255) PRIMARY KEY, -- session_${session_id}
    session_id BIGINT UNIQUE NOT NULL,
    group_type VARCHAR(20) NOT NULL CHECK (group_type IN ('unfamiliar', 'familiar')),
    chosen_genre VARCHAR(50),
    randomized_songs JSONB NOT NULL DEFAULT '[]',
    randomized_introductions JSONB NOT NULL DEFAULT '[]',
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    experiment_completed BOOLEAN NOT NULL DEFAULT FALSE, -- Track if all questions have been answered
    onboarding_answers JSONB NOT NULL DEFAULT '{}', -- Dedicated column for onboarding answers
    song_answers JSONB NOT NULL DEFAULT '[]', -- Dedicated column for song-specific answers
    engagement_metrics JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL -- GDPR compliance: auto-delete after 2 years
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_id ON experiment_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_group_type ON experiment_sessions(group_type);
CREATE INDEX IF NOT EXISTS idx_created_at ON experiment_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_expires_at ON experiment_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_experiment_completed ON experiment_sessions(experiment_completed);

-- Create indexes for JSONB columns for better query performance
CREATE INDEX IF NOT EXISTS idx_onboarding_answers ON experiment_sessions USING GIN (onboarding_answers);
CREATE INDEX IF NOT EXISTS idx_song_answers ON experiment_sessions USING GIN (song_answers);

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
    song_answers,
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
    COUNT(CASE WHEN jsonb_array_length(song_answers) > 0 THEN 1 END) as completed_sessions,
    COUNT(CASE WHEN experiment_completed = TRUE THEN 1 END) as fully_completed_sessions,
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

-- Example queries for GDPR compliance and analysis:

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
-- WHERE onboarding_answers ? 'age'; -- Find sessions with age data

-- 7. Query song answers specifically  
-- SELECT session_id, song_answers FROM experiment_sessions 
-- WHERE jsonb_array_length(song_answers) > 0; -- Find sessions with song data

-- 8. Find sessions by specific onboarding answer
-- SELECT session_id, onboarding_answers->>'age' as age 
-- FROM experiment_sessions 
-- WHERE onboarding_answers->>'age' = '25-34';

-- 9. Count sessions by group and onboarding responses
-- SELECT 
--   group_type,
--   onboarding_answers->>'age' as age_group,
--   COUNT(*) as session_count
-- FROM experiment_sessions 
-- GROUP BY group_type, onboarding_answers->>'age';
