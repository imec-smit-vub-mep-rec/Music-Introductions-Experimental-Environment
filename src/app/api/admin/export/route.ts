import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Pool } from 'pg';
import * as XLSX from 'xlsx';

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
      // Get all session data
      const query = `
        SELECT 
          session_id,
          group_type,
          chosen_genre,
          start_time,
          onboarding_answers,
          song_answers,
          engagement_metrics,
          created_at,
          updated_at
        FROM experiment_sessions 
        ORDER BY created_at DESC
      `;
      
      const result = await client.query(query);
      const sessions = result.rows;

      // Transform data for Excel export
      const exportData = sessions.map(session => {
        // Safely parse JSON data, handling cases where it might already be parsed
        let onboardingAnswers: Record<string, unknown> = {};
        let songAnswers: unknown[] = [];
        let engagementMetrics: { page_times: Record<string, number>; interactions: unknown[] } = { page_times: {}, interactions: [] };

        try {
          onboardingAnswers = typeof session.onboarding_answers === 'string' 
            ? JSON.parse(session.onboarding_answers) 
            : session.onboarding_answers || {};
        } catch (e) {
          console.warn('Failed to parse onboarding_answers:', e);
        }

        try {
          songAnswers = typeof session.song_answers === 'string' 
            ? JSON.parse(session.song_answers) 
            : session.song_answers || [];
        } catch (e) {
          console.warn('Failed to parse song_answers:', e);
        }

        try {
          engagementMetrics = typeof session.engagement_metrics === 'string' 
            ? JSON.parse(session.engagement_metrics) 
            : session.engagement_metrics || {};
        } catch (e) {
          console.warn('Failed to parse engagement_metrics:', e);
        }

        // Ensure engagementMetrics has the expected structure
        if (!engagementMetrics || typeof engagementMetrics !== 'object') {
          engagementMetrics = { page_times: {}, interactions: [] };
        }
        if (!engagementMetrics.page_times || typeof engagementMetrics.page_times !== 'object') {
          engagementMetrics.page_times = {};
        }
        if (!Array.isArray(engagementMetrics.interactions)) {
          engagementMetrics.interactions = [];
        }

        // Flatten the data for Excel
        const flattened: Record<string, unknown> = {
        // Basic session info
        session_id: session.session_id,
        group_type: session.group_type,
        chosen_genre: session.chosen_genre,
        start_time: new Date(session.start_time).toLocaleString(),
        created_at: new Date(session.created_at).toLocaleString(),
        updated_at: new Date(session.updated_at).toLocaleString(),
          
          // Onboarding answers (flattened)
          ...Object.entries(onboardingAnswers).reduce((acc, [key, value]) => {
            acc[`onboarding_${key}`] = Array.isArray(value) ? value.join(', ') : value;
            return acc;
          }, {} as Record<string, unknown>),
          
          // Song data summary
          total_songs: songAnswers.length,
          completed_songs: songAnswers.filter((song: unknown) => {
            if (typeof song === 'object' && song !== null && 'answers' in song) {
              const answers = (song as { answers?: unknown }).answers;
              return typeof answers === 'object' && answers !== null && Object.keys(answers).length > 0;
            }
            return false;
          }).length,
          
          // Engagement metrics
          total_page_time: Object.values(engagementMetrics.page_times || {}).reduce((sum: number, time: unknown) => sum + (typeof time === 'number' ? time : 0), 0),
          total_interactions: engagementMetrics.interactions?.length || 0,
        };

        // Add individual song data
        if (Array.isArray(songAnswers)) {
          songAnswers.forEach((song: unknown, index: number) => {
            if (song && typeof song === 'object' && song !== null) {
              const songObj = song as Record<string, unknown>;
              flattened[`song_${index + 1}_id`] = songObj.songId || '';
              flattened[`song_${index + 1}_introduction_style`] = songObj.introduction_style || '';
              flattened[`song_${index + 1}_skipped`] = songObj.skipped || false;
              flattened[`song_${index + 1}_skipped_at_ms`] = songObj.skipped_at_ms || null;
              flattened[`song_${index + 1}_listening_time_ms`] = songObj.listening_time_ms || 0;
              
              // Add song answers
              if (songObj.answers && typeof songObj.answers === 'object' && songObj.answers !== null) {
                Object.entries(songObj.answers).forEach(([key, value]) => {
                  flattened[`song_${index + 1}_${key}`] = Array.isArray(value) ? value.join(', ') : value;
                });
              }
            }
          });
        }

        return flattened;
      });

      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      
      // Main data sheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Experiment Data');

      // Create summary sheet
      const summaryData = [
        { metric: 'Total Sessions', value: sessions.length },
        { metric: 'Unfamiliar Group', value: sessions.filter(s => s.group_type === 'unfamiliar').length },
        { metric: 'Familiar Group', value: sessions.filter(s => s.group_type === 'familiar').length },
        { metric: 'Completed Sessions', value: sessions.filter(s => {
          try {
            const songAnswers = typeof s.song_answers === 'string' 
              ? JSON.parse(s.song_answers) 
              : s.song_answers || [];
            return Array.isArray(songAnswers) && songAnswers.length > 0;
          } catch (e) {
            return false;
          }
        }).length },
        { metric: 'Average Session Duration (minutes)', value: sessions.length > 0 ? 
          (sessions.reduce((sum, s) => {
            const start = new Date(s.start_time).getTime();
            const end = new Date(s.updated_at).getTime();
            return sum + (end - start) / (1000 * 60);
          }, 0) / sessions.length).toFixed(2) : 0
        },
      ];
      
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Return Excel file
      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="serendipity-experiment-data-${new Date().toISOString().split('T')[0]}.xlsx"`,
        },
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ EXPORT ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
