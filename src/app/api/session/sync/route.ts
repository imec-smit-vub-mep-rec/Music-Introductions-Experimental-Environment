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
      // Check if session already exists to prevent overwrites
      const checkQuery = 'SELECT id FROM experiment_sessions WHERE session_id = $1';
      const checkResult = await client.query(checkQuery, [sessionData.session_id]);
      
      if (checkResult.rows.length > 0) {
        // Session exists, update it instead of creating new one
        const updateQuery = `
          UPDATE experiment_sessions SET
            group_type = $2,
            chosen_genre = $3,
            randomized_songs = $4,
            randomized_introductions = $5,
            start_time = $6,
            experiment_completed = $7,
            onboarding_answers = $8,
            demographics_answers = $9,
            post_listening_answers = $10,
            final_answers = $11,
            qualtrics_response_id = $12,
            raw_session_data = $13,
            engagement_metrics = $14,
            referer = $15,
            expires_at = $16,
            updated_at = NOW()
          WHERE session_id = $1
        `;

        const updateValues = [
          sessionData.session_id,
          sessionData.group,
          sessionData.chosen_genre,
          JSON.stringify(sessionData.randomized_songs),
          JSON.stringify(sessionData.randomized_introductions),
          sessionData.start_time,
          sessionData.experiment_completed || false,
          JSON.stringify(sessionData.answers.onboarding || {}),
          JSON.stringify(sessionData.answers.demographics || {}),
          JSON.stringify(sessionData.answers.songs || []),
          JSON.stringify(sessionData.answers.final || {}),
          sessionData.qualtrics_response_id || null,
          JSON.stringify(sessionData),
          JSON.stringify(sessionData.engagement_metrics),
          sessionData.referer || null,
          new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        ];

        await client.query(updateQuery, updateValues);
        
        console.log('✅ EXISTING SESSION UPDATED:', {
          session_id: sessionData.session_id,
          client_ip: sessionData.client_ip,
          referer: sessionData.referer,
          timestamp: new Date().toISOString()
        });
      } else {
        // Session doesn't exist, create new one
        const insertQuery = `
          INSERT INTO experiment_sessions (
            id, session_id, client_ip, referer, group_type, chosen_genre, 
            randomized_songs, randomized_introductions, 
            start_time, experiment_completed, 
            onboarding_answers, demographics_answers, post_listening_answers, final_answers,
            qualtrics_response_id, raw_session_data, engagement_metrics, 
            expires_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
        `;

        const insertValues = [
          `session_${sessionData.session_id}`, // id
          sessionData.session_id,
          sessionData.client_ip || '127.0.0.1', // client_ip
          sessionData.referer || null, // referer
          sessionData.group,
          sessionData.chosen_genre,
          JSON.stringify(sessionData.randomized_songs),
          JSON.stringify(sessionData.randomized_introductions),
          sessionData.start_time,
          sessionData.experiment_completed || false,
          JSON.stringify(sessionData.answers.onboarding || {}),
          JSON.stringify(sessionData.answers.demographics || {}),
          JSON.stringify(sessionData.answers.songs || []),
          JSON.stringify(sessionData.answers.final || {}),
          sessionData.qualtrics_response_id || null,
          JSON.stringify(sessionData),
          JSON.stringify(sessionData.engagement_metrics),
          new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        ];

        await client.query(insertQuery, insertValues);
        
        console.log('✅ NEW SESSION CREATED:', {
          session_id: sessionData.session_id,
          client_ip: sessionData.client_ip,
          referer: sessionData.referer,
          timestamp: new Date().toISOString()
        });
      }

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
