'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ExperimentLayout } from '@/components/layout/ExperimentLayout';
import { ProgressTracker } from '@/components/survey/ProgressTracker';
import { QuestionRenderer } from '@/components/survey/QuestionRenderer';
import { Question } from '@/lib/types';

interface SurveyScreenProps {
  questions: Question[];
  responses: Record<string, any>;
  onAnswer: (questionId: string, answer: any) => void;
  onNext: () => void;
  onBack?: () => void;
  title?: string;
}

export function SurveyScreen({ 
  questions, 
  responses, 
  onAnswer, 
  onNext, 
  onBack,
  title = "Survey"
}: SurveyScreenProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Add safety checks
  if (!questions || questions.length === 0) {
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
  
  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? responses[currentQuestion.id] : undefined;

  const handleAnswer = (answer: any) => {
    if (currentQuestion) {
      onAnswer(currentQuestion.id, answer);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      onNext();
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const canProceed = () => {
    if (!currentQuestion || !currentQuestion.required) return true;
    return currentAnswer !== undefined && currentAnswer !== null && currentAnswer !== '';
  };

  return (
    <ExperimentLayout background="light">
      <div className="min-h-screen px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            {onBack && (
              <Button
                variant="ghost"
                onClick={handleBack}
                className="text-dark-purple hover:bg-maize/20"
              >
                ← Back
              </Button>
            )}
            <h1 className="text-2xl font-bold text-dark-purple flex-1 text-center">
              {title}
            </h1>
            <div className="w-16" /> {/* Spacer for centering */}
          </div>

          {/* Progress Tracker */}
          <ProgressTracker
            current={currentQuestionIndex + 1}
            total={questions.length}
          />

          {/* Question */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-ivory">
            {currentQuestion ? (
              <QuestionRenderer
                question={currentQuestion}
                value={currentAnswer}
                onChange={handleAnswer}
              />
            ) : (
              <div className="text-center text-dark-purple/70">
                <p>No question available</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-end">
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-dark-purple text-white hover:bg-dark-purple/90 px-8 py-3 rounded-full"
            >
              {currentQuestionIndex < questions.length - 1 ? 'Next' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </ExperimentLayout>
  );
}
