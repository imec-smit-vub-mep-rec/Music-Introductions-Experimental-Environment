import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;

export async function POST(request: NextRequest) {
  if (!sql) {
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
    
    // First, get the current session data
    const sessionRows = await sql`
      SELECT post_listening_answers FROM experiment_sessions 
      WHERE session_id = ${session_id}
    `;
    
    if (sessionRows.length === 0) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    const currentSongAnswers = sessionRows[0].post_listening_answers || [];
    
    // Find and update the specific song's like status
    const updatedSongAnswers = currentSongAnswers.map((song: Record<string, unknown>) => {
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
    await sql`
      UPDATE experiment_sessions 
      SET post_listening_answers = ${JSON.stringify(updatedSongAnswers)}, updated_at = NOW()
      WHERE session_id = ${session_id}
    `;
    
    console.log('✅ SONG LIKE STATUS UPDATED IN DATABASE:', {
      session_id,
      song_id,
      liked,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ LIKE STATUS UPDATE ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to update like status' },
      { status: 500 }
    );
  }
}
