import { ExperimentConfig, SurveyConfig, Question } from './types';
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

// Maximum number of failed attention checks before experiment ends
export const MAX_FAILED_ATTENTION_CHECKS = 2;

// Attention check question IDs (for reference)
export const ATTENTION_CHECK_IDS = ['attention_check_1', 'attention_check_2', 'attention_check_postlistening'] as const;

// Get attention check questions from the onboarding survey
export function getOnboardingAttentionCheckQuestions(): Question[] {
  const allQuestions = experimentConfig.surveys.onboarding.blocks.flatMap(block => block.questions);
  return allQuestions.filter(q => q.isAttentionCheck);
}

// Get attention check questions from the postListening survey
export function getPostListeningAttentionCheckQuestions(): Question[] {
  const allQuestions = experimentConfig.surveys.postListening.blocks.flatMap(block => block.questions);
  return allQuestions.filter(q => q.isAttentionCheck);
}

// Legacy function for backward compatibility
export function getAttentionCheckQuestions(): Question[] {
  return getOnboardingAttentionCheckQuestions();
}

// Validate a single attention check and return number of failures (0 or 1)
export function validateSingleAttentionCheck(
  questionId: string,
  userAnswer: string | string[] | number | Record<string, string> | null | undefined,
  correctAnswer: string | undefined
): boolean {
  if (!correctAnswer) {
    return true; // No correct answer defined, pass by default
  }
  
  const passed = userAnswer === correctAnswer;
  
  console.log(passed ? '✅ ATTENTION CHECK PASSED:' : '❌ ATTENTION CHECK FAILED:', {
    question_id: questionId,
    user_answer: userAnswer,
    correct_answer: correctAnswer,
    timestamp: new Date().toISOString()
  });
  
  return passed;
}

// Validate onboarding attention checks and return count of new failures
export function validateOnboardingAttentionChecks(
  answers: Record<string, string | string[] | number | Record<string, string> | null | undefined>
): { newFailures: number; questionResults: Array<{ questionId: string; passed: boolean }> } {
  const attentionCheckQuestions = getOnboardingAttentionCheckQuestions();
  
  if (attentionCheckQuestions.length === 0) {
    return { newFailures: 0, questionResults: [] };
  }
  
  let newFailures = 0;
  const questionResults: Array<{ questionId: string; passed: boolean }> = [];
  
  for (const question of attentionCheckQuestions) {
    const userAnswer = answers[question.id];
    const passed = validateSingleAttentionCheck(question.id, userAnswer, question.correctAnswer);
    questionResults.push({ questionId: question.id, passed });
    
    if (!passed) {
      newFailures++;
    }
  }
  
  console.log('🔍 ONBOARDING ATTENTION CHECK VALIDATION:', {
    total_checks: attentionCheckQuestions.length,
    new_failures: newFailures,
    results: questionResults,
    timestamp: new Date().toISOString()
  });
  
  return { newFailures, questionResults };
}

// Validate postListening attention check for a single song and return whether it failed
export function validatePostListeningAttentionCheck(
  songAnswers: Record<string, string | string[] | number | Record<string, string> | null | undefined>
): { failed: boolean; questionId: string | null } {
  const attentionCheckQuestions = getPostListeningAttentionCheckQuestions();
  
  if (attentionCheckQuestions.length === 0) {
    return { failed: false, questionId: null };
  }
  
  // Typically there's only one attention check per postListening survey
  for (const question of attentionCheckQuestions) {
    const userAnswer = songAnswers[question.id];
    const passed = validateSingleAttentionCheck(question.id, userAnswer, question.correctAnswer);
    
    if (!passed) {
      console.log('🔍 POST-LISTENING ATTENTION CHECK FAILED:', {
        question_id: question.id,
        timestamp: new Date().toISOString()
      });
      return { failed: true, questionId: question.id };
    }
  }
  
  return { failed: false, questionId: null };
}

// Legacy function - validate attention checks (returns true if at least one was passed)
// Deprecated: Use the new granular validation functions instead
export function validateAttentionChecks(answers: Record<string, string | string[] | number | Record<string, string> | null | undefined>): boolean {
  const { newFailures, questionResults } = validateOnboardingAttentionChecks(answers);
  const totalChecks = questionResults.length;
  
  // Fail only if ALL attention checks are failed (legacy behavior)
  const passed = newFailures < totalChecks;
  
  console.log('🔍 ATTENTION CHECK RESULT (LEGACY):', {
    total_checks: totalChecks,
    failed_count: newFailures,
    passed: passed,
    timestamp: new Date().toISOString()
  });
  
  return passed;
}

export const getSongsByGenre = (genre: string) => {
  return songsData.songs.filter(song => song.genre === genre);
};

