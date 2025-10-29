#!/usr/bin/env tsx

import { neon } from '@neondatabase/serverless';
import { randomInt, randomFloat, randomChoice, randomChoices, randomDate } from './utils/random';
import { experimentConfig } from '../src/lib/config';

// Database connection configuration (HTTP client)
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/serendipity_experiment';
const sql = neon(connectionString);

interface DummySession {
  id: string;
  session_id: number;
  group_type: 'unfamiliar' | 'familiar';
  chosen_genre: string;
  randomized_songs: string[];
  randomized_introductions: string[];
  onboarding_answers: Record<string, string>;
  demographics_answers: Record<string, string>;
  post_listening_answers: Array<Record<string, string>>;
  final_answers: Record<string, string>;
  qualtrics_response_id?: string;
  raw_session_data: Record<string, any>;
  start_time: Date;
  experiment_completed: boolean;
  engagement_metrics: Record<string, any>;
  expires_at: Date;
}

// Helper function to generate random survey responses
function generateSurveyResponses(questions: any[]): Record<string, string> {
  const responses: Record<string, string> = {};
  
  for (const question of questions) {
    if (question.type === 'multipleChoice') {
      // Randomly select one choice
      const selectedChoice = randomChoice(question.choices) as { value: string };
      responses[question.id] = selectedChoice.value;
    } else if (question.type === 'checkbox') {
      // Randomly select 1-3 choices
      const numChoices = randomInt(1, Math.min(3, question.choices.length));
      const selectedChoices = randomChoices(question.choices, numChoices);
      responses[question.id] = selectedChoices.map((c: any) => c.value).join(',');
    } else if (question.type === 'textInput') {
      // Generate random text based on question content
      if (question.id === 'QID11') { // Age/birth year
        responses[question.id] = randomInt(1980, 2005).toString();
      } else if (question.id === 'QID10') { // Additional comments
        const comments = [
          'Great experience overall!',
          'The music was interesting.',
          'I enjoyed discovering new genres.',
          'The introductions were helpful.',
          'Would recommend to friends.',
          'Some songs were too complex for my taste.',
          'Loved the variety!',
          'The app worked well.',
          'Interesting experiment.',
          'More songs please!'
        ];
        responses[question.id] = randomChoice(comments);
      } else {
        responses[question.id] = `Sample response for ${question.id}`;
      }
    } else if (question.type === 'number') {
      responses[question.id] = randomInt(1, 100).toString();
    } else if (question.type === 'searchableSelect') {
      // For country selection
      const selectedChoice = randomChoice(question.choices) as { value: string };
      responses[question.id] = selectedChoice.value;
    }
  }
  
  return responses;
}

// Generate onboarding responses
function generateOnboardingResponses(): Record<string, string> {
  const onboardingQuestions = experimentConfig.surveys.onboarding.blocks.flatMap(block => block.questions);
  return generateSurveyResponses(onboardingQuestions);
}

// Generate demographics responses
function generateDemographicsResponses(): Record<string, string> {
  const demographicsQuestions = experimentConfig.surveys.demographics.blocks.flatMap(block => block.questions);
  return generateSurveyResponses(demographicsQuestions);
}

// Generate post-listening responses for each song
function generatePostListeningResponses(): Array<Record<string, string>> {
  const postListeningQuestions = experimentConfig.surveys.postListening.blocks.flatMap(block => block.questions);
  const responses: Array<Record<string, string>> = [];
  
  // Generate responses for 3 songs
  for (let i = 0; i < 3; i++) {
    responses.push(generateSurveyResponses(postListeningQuestions));
  }
  
  return responses;
}

// Generate final responses
function generateFinalResponses(): Record<string, string> {
  const finalQuestions = experimentConfig.surveys.final.blocks.flatMap(block => block.questions);
  return generateSurveyResponses(finalQuestions);
}

// Generate engagement metrics
function generateEngagementMetrics(): Record<string, any> {
  return {
    totalTimeSpent: randomInt(300, 1800), // 5-30 minutes in seconds
    songsCompleted: randomInt(1, 3),
    surveysCompleted: randomInt(1, 4),
    averageTimePerSong: randomInt(60, 300),
    clicks: randomInt(10, 100),
    scrolls: randomInt(5, 50),
    pauses: randomInt(0, 5),
    skips: randomInt(0, 2),
    volumeChanges: randomInt(0, 10),
    deviceType: randomChoice(['desktop', 'mobile', 'tablet']),
    browser: randomChoice(['chrome', 'firefox', 'safari', 'edge']),
    screenResolution: randomChoice(['1920x1080', '1366x768', '1440x900', '1536x864']),
    connectionType: randomChoice(['wifi', 'ethernet', 'mobile']),
    audioQuality: randomChoice(['high', 'medium', 'low']),
    lastActivity: new Date(Date.now() - randomInt(0, 3600000)).toISOString(), // Within last hour
  };
}

// Generate raw session data
function generateRawSessionData(session: DummySession): Record<string, any> {
  return {
    sessionId: session.session_id,
    groupType: session.group_type,
    chosenGenre: session.chosen_genre,
    randomizedSongs: session.randomized_songs,
    randomizedIntroductions: session.randomized_introductions,
    responses: {
      onboarding: session.onboarding_answers,
      demographics: session.demographics_answers,
      postListening: session.post_listening_answers,
      final: session.final_answers,
    },
    engagement: session.engagement_metrics,
    metadata: {
      userAgent: 'Mozilla/5.0 (compatible; DummyDataGenerator/1.0)',
      ipAddress: `192.168.1.${randomInt(1, 254)}`,
      timestamp: session.start_time.toISOString(),
      version: '1.0.0',
      experiment: 'serendipity',
    },
    steps: [
      { step: 'welcome', completed: true, timestamp: session.start_time.toISOString() },
      { step: 'terms', completed: true, timestamp: new Date(session.start_time.getTime() + 30000).toISOString() },
      { step: 'onboarding', completed: true, timestamp: new Date(session.start_time.getTime() + 120000).toISOString() },
      { step: 'demographics', completed: true, timestamp: new Date(session.start_time.getTime() + 180000).toISOString() },
      { step: 'genre-selection', completed: true, timestamp: new Date(session.start_time.getTime() + 210000).toISOString() },
      { step: 'audio-song-1', completed: true, timestamp: new Date(session.start_time.getTime() + 300000).toISOString() },
      { step: 'survey-song-1', completed: true, timestamp: new Date(session.start_time.getTime() + 360000).toISOString() },
      { step: 'audio-song-2', completed: true, timestamp: new Date(session.start_time.getTime() + 420000).toISOString() },
      { step: 'survey-song-2', completed: true, timestamp: new Date(session.start_time.getTime() + 480000).toISOString() },
      { step: 'audio-song-3', completed: true, timestamp: new Date(session.start_time.getTime() + 540000).toISOString() },
      { step: 'survey-song-3', completed: true, timestamp: new Date(session.start_time.getTime() + 600000).toISOString() },
      { step: 'qualtrics', completed: session.experiment_completed, timestamp: new Date(session.start_time.getTime() + 660000).toISOString() },
      { step: 'thank-you', completed: session.experiment_completed, timestamp: new Date(session.start_time.getTime() + 720000).toISOString() },
    ],
  };
}

// Generate a single dummy session
function generateDummySession(sessionId: number): DummySession {
  const groupType = randomChoice(['unfamiliar', 'familiar']) as 'unfamiliar' | 'familiar';
  const chosenGenre = randomChoice(experimentConfig.genres).id;
  
  // Generate randomized songs for the chosen genre
  const genreSongs = experimentConfig.songsPerGenre;
  const songIndices = Array.from({ length: genreSongs }, (_, i) => i + 1);
  const randomizedSongs = songIndices.map(i => `${chosenGenre}_${i}`);
  
  // Generate randomized introductions (mix of inform and immers)
  const randomizedIntroductions = randomizedSongs.map(songId => 
    randomChoice(['inform', 'immers'])
  );
  
  const startTime = randomDate(new Date('2024-01-01'), new Date());
  const experimentCompleted = randomFloat(0, 1) > 0.2; // 80% completion rate
  
  const session: DummySession = {
    id: `session_${sessionId}`,
    session_id: sessionId,
    group_type: groupType,
    chosen_genre: chosenGenre,
    randomized_songs: randomizedSongs,
    randomized_introductions: randomizedIntroductions,
    onboarding_answers: generateOnboardingResponses(),
    demographics_answers: generateDemographicsResponses(),
    post_listening_answers: generatePostListeningResponses(),
    final_answers: generateFinalResponses(),
    qualtrics_response_id: experimentCompleted ? `QR_${sessionId}_${randomInt(100000, 999999)}` : undefined,
    raw_session_data: {},
    start_time: startTime,
    experiment_completed: experimentCompleted,
    engagement_metrics: generateEngagementMetrics(),
    expires_at: new Date(startTime.getTime() + (2 * 365 * 24 * 60 * 60 * 1000)), // 2 years from start
  };
  
  // Generate raw session data after session is created
  session.raw_session_data = generateRawSessionData(session);
  
  return session;
}

// Insert dummy sessions into database
async function insertDummySessions(count: number): Promise<void> {
  console.log(`Generating ${count} dummy sessions...`);
  
  try {
    // Get the current maximum session_id to avoid conflicts
    const maxRows = await sql`SELECT MAX(session_id) as max_id FROM experiment_sessions`;
    const maxSessionId = (maxRows[0] as any)?.max_id || 0;
    
    const sessions: DummySession[] = [];
    
    // Generate sessions
    for (let i = 1; i <= count; i++) {
      const sessionId = maxSessionId + i;
      sessions.push(generateDummySession(sessionId));
    }
    
    console.log('Inserting sessions into database...');
    
    // Insert sessions in batches
    const batchSize = 100;
    for (let i = 0; i < sessions.length; i += batchSize) {
      const batch = sessions.slice(i, i + batchSize);
      
      const values = batch.map((session, index) => {
        const offset = i + index;
        return `(
          $${offset * 15 + 1}, $${offset * 15 + 2}, $${offset * 15 + 3}, $${offset * 15 + 4}, 
          $${offset * 15 + 5}, $${offset * 15 + 6}, $${offset * 15 + 7}, $${offset * 15 + 8}, 
          $${offset * 15 + 9}, $${offset * 15 + 10}, $${offset * 15 + 11}, $${offset * 15 + 12}, 
          $${offset * 15 + 13}, $${offset * 15 + 14}, $${offset * 15 + 15}
        )`;
      }).join(', ');
      
      // Insert rows one by one (simpler with HTTP client)
      for (const session of batch) {
        await sql`
          INSERT INTO experiment_sessions (
            id, session_id, group_type, chosen_genre, randomized_songs, randomized_introductions,
            onboarding_answers, demographics_answers, post_listening_answers, final_answers,
            qualtrics_response_id, raw_session_data, start_time, experiment_completed, 
            engagement_metrics, expires_at, created_at, updated_at
          ) VALUES (
            ${session.id}, ${session.session_id}, ${session.group_type}, ${session.chosen_genre},
            ${JSON.stringify(session.randomized_songs)}, ${JSON.stringify(session.randomized_introductions)},
            ${JSON.stringify(session.onboarding_answers)}, ${JSON.stringify(session.demographics_answers)},
            ${JSON.stringify(session.post_listening_answers)}, ${JSON.stringify(session.final_answers)},
            ${session.qualtrics_response_id || null}, ${JSON.stringify(session.raw_session_data)},
            ${session.start_time}, ${session.experiment_completed},
            ${JSON.stringify(session.engagement_metrics)}, ${session.expires_at}, NOW(), NOW()
          )
        `;
      }
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sessions.length / batchSize)}`);
    }
    
    console.log(`Successfully inserted ${count} dummy sessions!`);
    
    // Show some statistics
    const statsRows = await sql`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN experiment_completed = true THEN 1 END) as completed_sessions,
        COUNT(CASE WHEN group_type = 'unfamiliar' THEN 1 END) as unfamiliar_sessions,
        COUNT(CASE WHEN group_type = 'familiar' THEN 1 END) as familiar_sessions,
        COUNT(DISTINCT chosen_genre) as genres_used
      FROM experiment_sessions`;
    
    const stats = (statsRows[0] as any) || {};
    console.log('\nDatabase Statistics:');
    console.log(`Total sessions: ${stats.total_sessions}`);
    console.log(`Completed sessions: ${stats.completed_sessions}`);
    console.log(`Unfamiliar group: ${stats.unfamiliar_sessions}`);
    console.log(`Familiar group: ${stats.familiar_sessions}`);
    console.log(`Genres used: ${stats.genres_used}`);
    
  } catch (error) {
    console.error('Error inserting dummy sessions:', error);
    throw error;
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const count = parseInt(args[0]) || 10;
  
  if (count < 1 || count > 10000) {
    console.error('Please specify a count between 1 and 10000');
    process.exit(1);
  }
  
  console.log(`Generating ${count} dummy sessions for the Serendipity Experiment database...`);
  
  try {
    await insertDummySessions(count);
  } catch (error) {
    console.error('Failed to generate dummy data:', error);
    process.exit(1);
  } finally {
    // No pool to close when using Neon HTTP client
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

export { generateDummySession, insertDummySessions };
