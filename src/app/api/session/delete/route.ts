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

export async function DELETE(request: NextRequest) {
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
      const query = 'DELETE FROM experiment_sessions WHERE session_id = $1';
      const result = await client.query(query, [parseInt(sessionId)]);

      console.log('🗑️ SESSION DELETED FROM NEON:', {
        session_id: sessionId,
        deleted_rows: result.rowCount,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({ 
        success: true, 
        deletedRows: result.rowCount 
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ DELETE SESSION ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
