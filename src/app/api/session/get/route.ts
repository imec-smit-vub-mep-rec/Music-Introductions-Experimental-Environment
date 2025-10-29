import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;

type SessionDbRow = {
  session_id: number;
  group_type: string;
  chosen_genre: string | null;
  randomized_songs: unknown;
  randomized_introductions: unknown;
  start_time: string;
  experiment_completed: boolean | null;
  onboarding_answers: unknown;
  post_listening_answers: unknown;
  engagement_metrics: unknown;
};

export async function GET(request: NextRequest) {
  if (!sql) {
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

    const rows = await sql`SELECT * FROM experiment_sessions WHERE session_id = ${parseInt(sessionId)}` as SessionDbRow[];
    
    if (rows.length === 0) {
      return NextResponse.json({ session: null });
    }

    const row = rows[0];
    const parseMaybe = (v: unknown): unknown => {
      if (v === null || v === undefined) return v;
      if (typeof v === 'string') {
        try { return JSON.parse(v); } catch { return v; }
      }
      return v;
    };

    const session = {
      session_id: row.session_id,
      group: row.group_type,
      chosen_genre: row.chosen_genre,
      randomized_songs: parseMaybe(row.randomized_songs),
      randomized_introductions: parseMaybe(row.randomized_introductions),
      start_time: row.start_time,
      experiment_completed: row.experiment_completed || false,
      answers: {
        onboarding: parseMaybe(row.onboarding_answers),
        songs: parseMaybe(row.post_listening_answers),
      },
      engagement_metrics: parseMaybe(row.engagement_metrics),
    };

    return NextResponse.json({ session });
  } catch (error) {
    console.error('❌ GET SESSION ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}
