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
    const { session_id, song_id, liked } = await request.json();
    
    if (!session_id || !song_id) {
      return NextResponse.json(
        { error: 'Missing required fields: session_id, song_id' },
        { status: 400 }
      );
    }
    
    const client = await pool.connect();
    
    try {
      // First, get the current session data
      const getSessionQuery = `
        SELECT song_answers FROM experiment_sessions 
        WHERE session_id = $1
      `;
      
      const sessionResult = await client.query(getSessionQuery, [session_id]);
      
      if (sessionResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }
      
      const currentSongAnswers = sessionResult.rows[0].song_answers || [];
      
      // Find and update the specific song's like status
      const updatedSongAnswers = currentSongAnswers.map((song: any) => {
        if (song.songId === song_id) {
          return {
            ...song,
            liked: liked,
            liked_at_ms: liked ? Date.now() : null,
            // Clear dislike when liking
            dislike: liked ? false : song.dislike,
            dislike_at_ms: liked ? null : song.dislike_at_ms,
          };
        }
        return song;
      });
      
      // Update the session with the new song answers
      const updateQuery = `
        UPDATE experiment_sessions 
        SET song_answers = $1, updated_at = NOW()
        WHERE session_id = $2
      `;
      
      await client.query(updateQuery, [JSON.stringify(updatedSongAnswers), session_id]);
      
      console.log('✅ SONG LIKE STATUS UPDATED IN DATABASE:', {
        session_id,
        song_id,
        liked,
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ LIKE STATUS UPDATE ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to update like status' },
      { status: 500 }
    );
  }
}
