import { ExperimentConfig, SurveyConfig } from './types';
import questionsData from '../data/questions.json';
import songsData from '../data/songs.json';

export const experimentConfig: ExperimentConfig = {
  songsPerGenre: songsData.songsPerGenre,
  genres: songsData.genres,
  surveys: {
    onboarding: questionsData.onboarding as SurveyConfig,
    demographics: questionsData.demographics as SurveyConfig,
    postListening: questionsData.postListening as SurveyConfig,
    final: questionsData.final as SurveyConfig,
  },
} as const;

export const experimentSteps = [
  'welcome',
  'terms',
  'onboarding',
  'attention-check-failed',
  'demographics',
  'genre-selection',
  'genre-confirmation',
  'audio-song-1',
  'survey-song-1',
  'audio-song-2',
  'survey-song-2',
  'audio-song-3',
  'survey-song-3',
  'qualtrics',
  'thank-you',
] as const;

// Attention check question IDs
export const ATTENTION_CHECK_IDS = ['attention_check_1', 'attention_check_2'] as const;

// Get attention check questions from the onboarding survey
export function getAttentionCheckQuestions() {
  const allQuestions = experimentConfig.surveys.onboarding.blocks.flatMap(block => block.questions);
  return allQuestions.filter(q => q.isAttentionCheck);
}

// Check if attention checks passed (returns true if at least one was passed)
export function validateAttentionChecks(answers: Record<string, string | string[] | number | Record<string, string> | null | undefined>): boolean {
  const attentionCheckQuestions = getAttentionCheckQuestions();
  
  if (attentionCheckQuestions.length === 0) {
    return true; // No attention checks, pass by default
  }
  
  let failedCount = 0;
  
  for (const question of attentionCheckQuestions) {
    const userAnswer = answers[question.id];
    const correctAnswer = question.correctAnswer;
    
    if (!userAnswer || userAnswer !== correctAnswer) {
      failedCount++;
      console.log('❌ ATTENTION CHECK FAILED:', {
        question_id: question.id,
        user_answer: userAnswer,
        correct_answer: correctAnswer,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('✅ ATTENTION CHECK PASSED:', {
        question_id: question.id,
        user_answer: userAnswer,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Fail only if BOTH attention checks are failed
  const passed = failedCount < attentionCheckQuestions.length;
  
  console.log('🔍 ATTENTION CHECK RESULT:', {
    total_checks: attentionCheckQuestions.length,
    failed_count: failedCount,
    passed: passed,
    timestamp: new Date().toISOString()
  });
  
  return passed;
}

export const getSongsByGenre = (genre: string) => {
  return songsData.songs.filter(song => song.genre === genre);
};
