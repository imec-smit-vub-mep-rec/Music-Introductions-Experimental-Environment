import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Neon PostgreSQL configuration
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
}

// Create connection pool
const pool = connectionString ? new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
  max: 5, // Limit connections for serverless
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}) : null;

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const sessionData = await request.json();
    
    const client = await pool.connect();
    
    try {
      // Use UPSERT (INSERT ... ON CONFLICT) for idempotent operations
      const query = `
        INSERT INTO experiment_sessions (
          id, session_id, group_type, chosen_genre, 
          randomized_songs, randomized_introductions, 
          start_time, experiment_completed, onboarding_answers, final_answers, song_answers, engagement_metrics, 
          expires_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          session_id = EXCLUDED.session_id,
          group_type = EXCLUDED.group_type,
          chosen_genre = EXCLUDED.chosen_genre,
          randomized_songs = EXCLUDED.randomized_songs,
          randomized_introductions = EXCLUDED.randomized_introductions,
          start_time = EXCLUDED.start_time,
          experiment_completed = EXCLUDED.experiment_completed,
          onboarding_answers = EXCLUDED.onboarding_answers,
          final_answers = EXCLUDED.final_answers,
          song_answers = EXCLUDED.song_answers,
          engagement_metrics = EXCLUDED.engagement_metrics,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
      `;

      const values = [
        `session_${sessionData.session_id}`, // id
        sessionData.session_id,
        sessionData.group,
        sessionData.chosen_genre,
        JSON.stringify(sessionData.randomized_songs),
        JSON.stringify(sessionData.randomized_introductions),
        sessionData.start_time,
        sessionData.experiment_completed || false, // experiment_completed
        JSON.stringify(sessionData.answers.onboarding || {}), // onboarding_answers
        JSON.stringify(sessionData.answers.final || {}), // final_answers
        JSON.stringify(sessionData.answers.songs || []), // song_answers
        JSON.stringify(sessionData.engagement_metrics),
        new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 2 years
      ];

      await client.query(query, values);

      console.log('✅ SESSION SYNCED TO NEON:', {
        session_id: sessionData.session_id,
        experiment_completed: sessionData.experiment_completed,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ SESSION SYNC ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to sync session' },
      { status: 500 }
    );
  }
}
