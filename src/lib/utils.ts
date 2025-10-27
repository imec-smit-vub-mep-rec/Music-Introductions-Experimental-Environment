import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Import questions data with proper typing
import questionsData from '../data/questions.json';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type SurveyType = 'onboarding' | 'demographics' | 'postListening' | 'final';

/**
 * Dynamically extracts all question IDs from a survey type
 * This makes the system flexible to handle any ID format
 */
export function getQuestionIdsFromSurvey(surveyType: SurveyType): string[] {
  try {
    const survey = questionsData[surveyType];
    
    if (!survey || !survey.blocks) {
      console.warn(`Survey ${surveyType} not found or has no blocks`);
      return [];
    }

    const questionIds: string[] = [];
    for (const block of survey.blocks) {
      if (block.questions) {
        for (const question of block.questions) {
          if (question.id) {
            questionIds.push(question.id);
          }
        }
      }
    }
    
    console.log(`📋 Found ${questionIds.length} questions for ${surveyType}:`, questionIds);
    return questionIds;
  } catch (error) {
    console.error(`Error getting question IDs for ${surveyType}:`, error);
    return [];
  }
}

/**
 * Gets question text by ID from any survey type
 */
export function getQuestionTextById(questionId: string, surveyType?: SurveyType): string {
  try {
    const surveys = surveyType ? [surveyType] : ['onboarding', 'demographics', 'postListening', 'final'] as SurveyType[];
    
    for (const surveyTypeToCheck of surveys) {
      const survey = questionsData[surveyTypeToCheck];
      if (!survey || !survey.blocks) continue;

      for (const block of survey.blocks) {
        if (block.questions) {
          for (const question of block.questions) {
            if (question.id === questionId) {
              return question.dataExportTag || question.text || questionId;
            }
          }
        }
      }
    }
    
    console.warn(`Question ${questionId} not found in any survey`);
    return questionId;
  } catch (error) {
    console.error(`Error getting question text for ${questionId}:`, error);
    return questionId;
  }
}

/**
 * Validates that all required questions are answered in a session
 */
export function validateSurveyCompletion(
  answers: Record<string, unknown>, 
  surveyType: SurveyType
): boolean {
  const requiredQuestionIds = getQuestionIdsFromSurvey(surveyType);
  
  return requiredQuestionIds.every(questionId => {
    const answer = answers[questionId];
    return answer !== undefined && answer !== null && answer !== '';
  });
}
