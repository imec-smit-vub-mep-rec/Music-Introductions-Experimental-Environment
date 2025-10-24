import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json(
      { error: 'Database connection not available' },
      { status: 500 }
    );
  }

  try {
    const { session_id, song_id, dislike } = await request.json();
    
    if (!session_id || !song_id || dislike === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: session_id, song_id, dislike' },
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
      
      // Find and update the specific song's dislike status
      const updatedSongAnswers = currentSongAnswers.map((song: Record<string, unknown>) => {
        if (song.songId === song_id) {
          return {
            ...song,
            dislike: dislike,
            dislike_at_ms: dislike ? Date.now() : null,
            // Clear like when disliking
            liked: dislike ? false : song.liked,
            liked_at_ms: dislike ? null : song.liked_at_ms,
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
      
      console.log('✅ SONG DISLIKE STATUS UPDATED IN DATABASE:', {
        session_id,
        song_id,
        dislike,
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ DISLIKE STATUS UPDATE ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to update dislike status' },
      { status: 500 }
    );
  }
}
