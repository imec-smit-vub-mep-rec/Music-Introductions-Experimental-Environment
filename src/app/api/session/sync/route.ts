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
    const sessionData = await request.json();
    
    // Check if session already exists to prevent overwrites
    const checkResult = await sql`SELECT id FROM experiment_sessions WHERE session_id = ${sessionData.session_id}`;
    
    if (checkResult.length > 0) {
      // Session exists, update it instead of creating new one
      await sql`
        UPDATE experiment_sessions SET
          group_type = ${sessionData.group},
          chosen_genre = ${sessionData.chosen_genre},
          randomized_songs = ${JSON.stringify(sessionData.randomized_songs)},
          randomized_introductions = ${JSON.stringify(sessionData.randomized_introductions)},
          start_time = ${sessionData.start_time},
          experiment_completed = ${sessionData.experiment_completed || false},
          attention_check_failed = ${sessionData.attention_check_failed || false},
          onboarding_answers = ${JSON.stringify(sessionData.answers.onboarding || {})},
          demographics_answers = ${JSON.stringify(sessionData.answers.demographics || {})},
          post_listening_answers = ${JSON.stringify(sessionData.answers.songs || [])},
          final_answers = ${JSON.stringify(sessionData.answers.final || {})},
          qualtrics_response_id = ${sessionData.qualtrics_response_id || null},
          raw_session_data = ${JSON.stringify(sessionData)},
          engagement_metrics = ${JSON.stringify(sessionData.engagement_metrics)},
          referer = ${sessionData.referer || null},
          prolific_pid = ${sessionData.prolific_pid || null},
          prolific_study_id = ${sessionData.prolific_study_id || null},
          prolific_session_id = ${sessionData.prolific_session_id || null},
          expires_at = ${new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString()},
          updated_at = NOW()
        WHERE session_id = ${sessionData.session_id}
      `;
      
      console.log('✅ EXISTING SESSION UPDATED:', {
        session_id: sessionData.session_id,
        client_ip: sessionData.client_ip,
        referer: sessionData.referer,
        timestamp: new Date().toISOString()
      });
    } else {
      // Session doesn't exist, create new one
      await sql`
        INSERT INTO experiment_sessions (
          id, session_id, client_ip, referer, group_type, chosen_genre, 
          randomized_songs, randomized_introductions, 
          start_time, experiment_completed, attention_check_failed,
          onboarding_answers, demographics_answers, post_listening_answers, final_answers,
          qualtrics_response_id, raw_session_data, engagement_metrics, 
          prolific_pid, prolific_study_id, prolific_session_id,
          expires_at, created_at, updated_at
        ) VALUES (
          ${`session_${sessionData.session_id}`},
          ${sessionData.session_id},
          ${sessionData.client_ip || '127.0.0.1'},
          ${sessionData.referer || null},
          ${sessionData.group},
          ${sessionData.chosen_genre},
          ${JSON.stringify(sessionData.randomized_songs)},
          ${JSON.stringify(sessionData.randomized_introductions)},
          ${sessionData.start_time},
          ${sessionData.experiment_completed || false},
          ${sessionData.attention_check_failed || false},
          ${JSON.stringify(sessionData.answers.onboarding || {})},
          ${JSON.stringify(sessionData.answers.demographics || {})},
          ${JSON.stringify(sessionData.answers.songs || [])},
          ${JSON.stringify(sessionData.answers.final || {})},
          ${sessionData.qualtrics_response_id || null},
          ${JSON.stringify(sessionData)},
          ${JSON.stringify(sessionData.engagement_metrics)},
          ${sessionData.prolific_pid || null},
          ${sessionData.prolific_study_id || null},
          ${sessionData.prolific_session_id || null},
          ${new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString()},
          NOW(), NOW()
        )
      `;
      
      console.log('✅ NEW SESSION CREATED:', {
        session_id: sessionData.session_id,
        client_ip: sessionData.client_ip,
        referer: sessionData.referer,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ SESSION SYNC ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to sync session' },
      { status: 500 }
    );
  }
}
