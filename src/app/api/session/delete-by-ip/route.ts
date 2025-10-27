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
    const ipAddress = searchParams.get('ip');

    if (!ipAddress) {
      return NextResponse.json(
        { error: 'IP address is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // Delete sessions that were created from the same IP address
      // We need to parse the raw_session_data to find sessions with matching IP
      const query = `
        DELETE FROM experiment_sessions 
        WHERE raw_session_data->>'client_ip' = $1
        OR (raw_session_data->>'client_ip' IS NULL AND session_id IN (
          SELECT session_id FROM experiment_sessions 
          WHERE raw_session_data->>'client_ip' IS NULL 
          ORDER BY created_at DESC 
          LIMIT 10
        ))
      `;
      
      const result = await client.query(query, [ipAddress]);

      console.log('🗑️ SESSIONS DELETED BY IP:', {
        ip_address: ipAddress,
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
    console.error('❌ DELETE SESSIONS BY IP ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to delete sessions by IP' },
      { status: 500 }
    );
  }
}
