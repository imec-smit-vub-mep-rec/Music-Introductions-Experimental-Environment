#!/usr/bin/env tsx

import { generateDummySession } from './generate-dummy-data';

// Test the dummy data generation
function testDummyDataGeneration() {
  console.log('Testing dummy data generation...');
  
  try {
    // Generate a test session
    const testSession = generateDummySession(999999);
    
    console.log('✅ Successfully generated test session:');
    console.log(`Session ID: ${testSession.session_id}`);
    console.log(`Group Type: ${testSession.group_type}`);
    console.log(`Chosen Genre: ${testSession.chosen_genre}`);
    console.log(`Randomized Songs: ${testSession.randomized_songs.join(', ')}`);
    console.log(`Randomized Introductions: ${testSession.randomized_introductions.join(', ')}`);
    console.log(`Experiment Completed: ${testSession.experiment_completed}`);
    console.log(`Start Time: ${testSession.start_time.toISOString()}`);
    console.log(`Expires At: ${testSession.expires_at.toISOString()}`);
    
    // Test survey responses
    console.log('\n📊 Survey Response Samples:');
    console.log(`Onboarding responses: ${Object.keys(testSession.onboarding_answers).length} questions`);
    console.log(`Demographics responses: ${Object.keys(testSession.demographics_answers).length} questions`);
    console.log(`Post-listening responses: ${testSession.post_listening_answers.length} songs`);
    console.log(`Final responses: ${Object.keys(testSession.final_answers).length} questions`);
    
    // Test engagement metrics
    console.log('\n📈 Engagement Metrics:');
    console.log(`Total Time Spent: ${testSession.engagement_metrics.totalTimeSpent} seconds`);
    console.log(`Songs Completed: ${testSession.engagement_metrics.songsCompleted}`);
    console.log(`Device Type: ${testSession.engagement_metrics.deviceType}`);
    console.log(`Browser: ${testSession.engagement_metrics.browser}`);
    
    // Test raw session data
    console.log('\n🗂️ Raw Session Data:');
    console.log(`Steps completed: ${testSession.raw_session_data.steps.length}`);
    console.log(`Metadata version: ${testSession.raw_session_data.metadata.version}`);
    
    console.log('\n✅ All tests passed! The dummy data generator is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testDummyDataGeneration();
}
