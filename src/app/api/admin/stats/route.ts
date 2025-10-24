import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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

export async function GET() {
  // Check authentication
  const cookieStore = await cookies();
  const adminAuth = cookieStore.get('admin-auth');

  if (adminAuth?.value !== 'authenticated') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  if (!pool) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const client = await pool.connect();
    
    try {
      // Get basic statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN group_type = 'unfamiliar' THEN 1 END) as unfamiliar_group,
          COUNT(CASE WHEN group_type = 'familiar' THEN 1 END) as familiar_group,
          COUNT(CASE WHEN jsonb_array_length(COALESCE(song_answers, '[]'::jsonb)) > 0 THEN 1 END) as completed_sessions,
          COUNT(CASE WHEN experiment_completed = TRUE THEN 1 END) as fully_completed_sessions,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration_seconds
        FROM experiment_sessions
      `;
      
      const statsResult = await client.query(statsQuery);
      const stats = statsResult.rows[0];

      // Get genre distribution
      const genreQuery = `
        SELECT 
          chosen_genre,
          COUNT(*) as count
        FROM experiment_sessions 
        WHERE chosen_genre IS NOT NULL
        GROUP BY chosen_genre
        ORDER BY count DESC
      `;
      
      const genreResult = await client.query(genreQuery);

      // Get recent sessions
      const recentQuery = `
        SELECT 
          session_id,
          group_type,
          chosen_genre,
          start_time,
          created_at,
          updated_at,
          experiment_completed,
          jsonb_array_length(COALESCE(song_answers, '[]'::jsonb)) as songs_completed
        FROM experiment_sessions 
        ORDER BY created_at DESC 
        LIMIT 10
      `;
      
      const recentResult = await client.query(recentQuery);

      return NextResponse.json({
        totalSessions: parseInt(stats.total_sessions) || 0,
        unfamiliarGroup: parseInt(stats.unfamiliar_group) || 0,
        familiarGroup: parseInt(stats.familiar_group) || 0,
        completedSessions: parseInt(stats.completed_sessions) || 0,
        fullyCompletedSessions: parseInt(stats.fully_completed_sessions) || 0,
        averageDuration: Math.round((parseFloat(stats.avg_duration_seconds) || 0) / 60), // Convert to minutes
        genreDistribution: genreResult.rows,
        recentSessions: recentResult.rows,
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ STATS ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to load statistics' },
      { status: 500 }
    );
  }
}
