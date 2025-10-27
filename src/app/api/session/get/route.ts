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

export async function GET(request: NextRequest) {
  if (!pool) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      const query = 'SELECT * FROM experiment_sessions WHERE session_id = $1';
      const result = await client.query(query, [parseInt(sessionId)]);
      
      if (result.rows.length === 0) {
        return NextResponse.json({ session: null });
      }

      const row = result.rows[0];
      const session = {
        session_id: row.session_id,
        group: row.group_type,
        chosen_genre: row.chosen_genre,
        randomized_songs: JSON.parse(row.randomized_songs),
        randomized_introductions: JSON.parse(row.randomized_introductions),
        start_time: row.start_time,
        experiment_completed: row.experiment_completed || false,
        answers: {
          onboarding: JSON.parse(row.onboarding_answers),
          songs: JSON.parse(row.post_listening_answers),
        },
        engagement_metrics: JSON.parse(row.engagement_metrics),
      };

      return NextResponse.json({ session });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ GET SESSION ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}
