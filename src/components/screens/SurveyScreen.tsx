'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ExperimentLayout } from '@/components/layout/ExperimentLayout';
import { ProgressTracker } from '@/components/survey/ProgressTracker';
import { QuestionRenderer } from '@/components/survey/QuestionRenderer';
import { Question, AnswerValue, QuestionBlock, SurveyConfig } from '@/lib/types';

interface SurveyScreenProps {
  survey: SurveyConfig;
  responses: Record<string, AnswerValue>;
  onAnswer: (questionId: string, answer: AnswerValue) => void;
  onNext: () => void;
  onBack?: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
  allowAutoSubmit?: boolean; // New prop to control auto-submission
}

export function SurveyScreen({ 
  survey, 
  responses, 
  onAnswer, 
  onNext, 
  onBack,
  isSubmitting = false,
  submitButtonText,
  allowAutoSubmit = true // Default to true for backward compatibility
}: SurveyScreenProps) {
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showValidationError, setShowValidationError] = useState(false);
  const [randomizedBlocks, setRandomizedBlocks] = useState<QuestionBlock[]>([]);
  const [showIntro, setShowIntro] = useState(!!survey.intro);
  
  // Initialize randomized blocks on mount
  useEffect(() => {
    if (survey.randomizeBlocks) {
      // Shuffle blocks randomly
      const shuffled = [...survey.blocks].sort(() => Math.random() - 0.5);
      setRandomizedBlocks(shuffled);
    } else {
      // Use blocks in order
      setRandomizedBlocks(survey.blocks);
    }
  }, [survey.blocks, survey.randomizeBlocks]);
  
  // Reset validation error when question changes
  useEffect(() => {
    setShowValidationError(false);
  }, [currentBlockIndex, currentQuestionIndex]);
  
  // Add safety checks
  if (!randomizedBlocks || randomizedBlocks.length === 0) {
    return (
      <ExperimentLayout background="light">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-dark-purple mb-4">Loading...</h1>
            <p className="text-dark-purple/70">Preparing survey questions...</p>
          </div>
        </div>
      </ExperimentLayout>
    );
  }
  
  const currentBlock = randomizedBlocks[currentBlockIndex];
  const currentQuestion = currentBlock ? currentBlock.questions[currentQuestionIndex] : null;
  const currentAnswer = currentQuestion ? responses[currentQuestion.id] : undefined;

  const handleIntroNext = () => {
    setShowIntro(false);
  };

  const handleAnswer = (answer: AnswerValue) => {
    if (currentQuestion) {
      onAnswer(currentQuestion.id, answer);
      // Clear validation error when user provides an answer
      setShowValidationError(false);
    }
  };

  const handleAutoNext = () => {
    // Only auto-advance for questions that support it
    if (currentQuestion && (currentQuestion.type === 'multipleChoice' || currentQuestion.type === 'rating' || currentQuestion.type === 'likertGrid' || currentQuestion.type === 'searchableSelect')) {
      setShowValidationError(false);
      // Small delay to ensure state is properly updated
      setTimeout(() => {
        if (currentQuestionIndex < currentBlock.questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else if (currentBlockIndex < randomizedBlocks.length - 1) {
          // Move to next block
          setCurrentBlockIndex(currentBlockIndex + 1);
          setCurrentQuestionIndex(0);
        } else {
          // Only auto-submit if allowAutoSubmit is true
          if (allowAutoSubmit) {
            onNext();
          }
          // If auto-submit is disabled, stay on the last question
          // User will need to manually click the submit button
        }
      }, 100);
    }
  };

  const handleNext = () => {
    if (!canProceed()) {
      setShowValidationError(true);
      return;
    }
    
    setShowValidationError(false);
    if (currentQuestionIndex < currentBlock.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (currentBlockIndex < randomizedBlocks.length - 1) {
      // Move to next block
      setCurrentBlockIndex(currentBlockIndex + 1);
      setCurrentQuestionIndex(0);
    } else {
      onNext();
    }
  };

  const handleBack = () => {
    setShowValidationError(false);
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (currentBlockIndex > 0) {
      // Move to previous block
      setCurrentBlockIndex(currentBlockIndex - 1);
      setCurrentQuestionIndex(randomizedBlocks[currentBlockIndex - 1].questions.length - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const canProceed = () => {
    if (!currentQuestion || !currentQuestion.required) return true;
    
    // Handle different question types
    switch (currentQuestion.type) {
      case 'multipleChoice':
      case 'rating':
        // For single-value questions, check if answer exists and is not empty
        return currentAnswer !== undefined && currentAnswer !== null && currentAnswer !== '';
      
      case 'checkbox':
        // For checkbox questions, check if array exists and has at least one selection
        const checkboxValue = currentAnswer as string[];
        return Array.isArray(checkboxValue) && checkboxValue.length > 0;
      
      case 'textInput':
        // For text questions, check if string exists and is not empty (trimmed)
        const textValue = currentAnswer as string;
        return textValue !== undefined && textValue !== null && textValue.trim() !== '';
      
      case 'number':
        // For number questions, check if number exists and is not null/undefined
        const numberValue = currentAnswer as number;
        return numberValue !== undefined && numberValue !== null && !isNaN(numberValue);
      
      case 'likertGrid':
        // For Likert grid questions, check if all statements have been answered
        const likertValue = currentAnswer as Record<string, string>;
        if (!likertValue || typeof likertValue !== 'object') return false;
        
        // Check if all statements have been answered
        const statements = currentQuestion.statements || [];
        return statements.every((_, index) => likertValue[index.toString()]);
      
      case 'searchableSelect':
        // For searchable select questions, check if a valid option is selected
        return currentAnswer !== undefined && currentAnswer !== null && currentAnswer !== '';
      
      case 'textDisplay':
        // Text display questions don't require answers
        return true;
      
      default:
        // Fallback to basic check
        return currentAnswer !== undefined && currentAnswer !== null && currentAnswer !== '';
    }
  };

  // Calculate total questions across all blocks
  const totalQuestions = randomizedBlocks.reduce((total, block) => total + block.questions.length, 0);
  const currentQuestionNumber = randomizedBlocks
    .slice(0, currentBlockIndex)
    .reduce((total, block) => total + block.questions.length, 0) + currentQuestionIndex + 1;

  return (
    <ExperimentLayout background="light">
      <div className="min-h-screen px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            {onBack && !showIntro && (
              <Button
                variant="ghost"
                onClick={handleBack}
                className="text-dark-purple hover:bg-maize/20"
              >
                ← Back
              </Button>
            )}
            <h1 className="text-2xl font-bold text-dark-purple flex-1 text-center">
              {survey.title}
            </h1>
            <div className="w-16" /> {/* Spacer for centering */}
          </div>

          {showIntro ? (
            /* Introduction Screen */
            <div className="space-y-8">
              {/* Intro Text */}
              {survey.intro && (
                <div className="bg-maize/10 rounded-2xl p-8 border border-maize/20">
                  <p className="text-dark-purple text-center text-lg leading-relaxed">
                    {survey.intro}
                  </p>
                </div>
              )}
              
              {/* Navigation */}
              <div className="flex justify-center">
                <Button
                  onClick={handleIntroNext}
                  className="bg-dark-purple text-white hover:bg-dark-purple/90 px-8 py-3 rounded-full"
                >
                  {survey.intro ? 'Continue' : 'Start Survey'}
                </Button>
              </div>
            </div>
          ) : (
            /* Questions Screen */
            <>
              {/* Block Title
              {currentBlock && (
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-dark-purple">
                    {currentBlock.title}
                  </h2>
                  {currentBlock.description && (
                    <p className="text-dark-purple/70 text-sm mt-1">
                      {currentBlock.description}
                    </p>
                  )}
                </div>
              )} */}

              {/* Progress Tracker */}
              <ProgressTracker
                current={currentQuestionNumber}
                total={totalQuestions}
              />

              {/* Question */}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-ivory">
                {currentQuestion ? (
                  <>
                    <QuestionRenderer
                      question={currentQuestion}
                      value={currentAnswer}
                      onChange={handleAnswer}
                      onAutoNext={handleAutoNext}
                    />
                    {showValidationError && currentQuestion.required && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm font-medium">
                          Please answer this question before continuing.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-dark-purple/70">
                    <p>No question available</p>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <Button
                  onClick={handleBack}
                  disabled={(currentBlockIndex === 0 && currentQuestionIndex === 0) && !onBack}
                  variant="outline"
                  className="border-dark-purple text-dark-purple hover:bg-dark-purple/10 px-8 py-3 rounded-full"
                >
                  Previous
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || isSubmitting}
                  className="bg-dark-purple text-white hover:bg-dark-purple/90 px-8 py-3 rounded-full"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </div>
                  ) : (
                    currentQuestionNumber < totalQuestions ? 'Next' : (submitButtonText || 'Continue')
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </ExperimentLayout>
  );
}
