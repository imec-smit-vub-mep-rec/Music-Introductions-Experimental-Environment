"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ExperimentLayout } from "@/components/layout/ExperimentLayout";
import { ProgressTracker } from "@/components/survey/ProgressTracker";
import { QuestionRenderer } from "@/components/survey/QuestionRenderer";
import { LikertGrid } from "@/components/survey/LikertGrid";
import {
  Question,
  AnswerValue,
  QuestionBlock,
  SurveyConfig,
} from "@/lib/types";
import type { IntroductionStyle } from "@/lib/session";

// Group of MC questions that should be displayed together
interface MCQuestionGroup {
  questions: Question[];
  scale: string[];
  startIndex: number;
}

// Helper function to check if two MC questions have the same choices
function hasSameChoices(q1: Question, q2: Question): boolean {
  if (q1.type !== 'multipleChoice' || q2.type !== 'multipleChoice') return false;
  if (!q1.choices || !q2.choices) return false;
  if (q1.choices.length !== q2.choices.length) return false;
  
  // Check if all choice values match
  return q1.choices.every((c1, i) => {
    const c2 = q2.choices?.[i];
    return c2 && c1.value === c2.value && c1.text === c2.text;
  });
}

// Helper function to group consecutive MC questions with same choices
function groupMCQuestions(block: QuestionBlock): MCQuestionGroup[] {
  const groups: MCQuestionGroup[] = [];
  let currentGroup: Question[] = [];
  let currentScale: string[] = [];
  let startIndex = 0;

  block.questions.forEach((question, index) => {
    if (question.type === 'multipleChoice' && question.choices) {
      const scale = question.choices.map(c => c.text);
      
      // If this is the first question or matches the current group
      if (currentGroup.length === 0 || 
          (currentGroup.length > 0 && hasSameChoices(currentGroup[0], question))) {
        if (currentGroup.length === 0) {
          startIndex = index;
          currentScale = scale;
        }
        currentGroup.push(question);
      } else {
        // Save current group and start a new one
        if (currentGroup.length > 0) {
          groups.push({
            questions: currentGroup,
            scale: currentScale,
            startIndex
          });
        }
        currentGroup = [question];
        currentScale = scale;
        startIndex = index;
      }
    } else {
      // Non-MC question breaks the group
      if (currentGroup.length > 0) {
        groups.push({
          questions: currentGroup,
          scale: currentScale,
          startIndex
        });
        currentGroup = [];
        currentScale = [];
      }
    }
  });

  // Don't forget the last group
  if (currentGroup.length > 0) {
    groups.push({
      questions: currentGroup,
      scale: currentScale,
      startIndex
    });
  }

  return groups;
}

interface SurveyScreenProps {
  survey: SurveyConfig;
  responses: Record<string, AnswerValue>;
  onAnswer: (questionId: string, answer: AnswerValue) => void;
  onNext: () => void;
  onBack?: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
  allowAutoSubmit?: boolean; // New prop to control auto-submission
  // Optional: pass current song's introduction style to allow
  // conditional display of blocks
  introductionStyle?: IntroductionStyle;
}

export function SurveyScreen({
  survey,
  responses,
  onAnswer,
  onNext,
  onBack,
  isSubmitting = false,
  submitButtonText,
  allowAutoSubmit = true, // Default to true for backward compatibility
  introductionStyle,
}: SurveyScreenProps) {
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showValidationError, setShowValidationError] = useState(false);
  const [randomizedBlocks, setRandomizedBlocks] = useState<QuestionBlock[]>([]);
  const [showIntro, setShowIntro] = useState(!!survey.intro);
  const [questionGroups, setQuestionGroups] = useState<MCQuestionGroup[]>([]);

  // Initialize randomized/filtered blocks on mount and when dependencies change
  useEffect(() => {
    // First, filter blocks based on optional onlyShowForIntroductionTypes
    const applicableBlocks = survey.blocks.filter((block) => {
      if (!block.onlyShowForIntroductionTypes || !introductionStyle) return true;
      return block.onlyShowForIntroductionTypes.includes(introductionStyle);
    });

    console.log('applicableBlocks', applicableBlocks);
    console.log('survey.randomizeBlocks', survey.randomizeBlocks);
    console.log('introductionStyle', introductionStyle);

    if (survey.randomizeBlocks) {
      // Shuffle blocks randomly
      const shuffled = [...applicableBlocks].sort(() => Math.random() - 0.5);
      setRandomizedBlocks(shuffled);
    } else {
      // Use blocks in order
      setRandomizedBlocks(applicableBlocks);
    }
    // Reset indices when the set of blocks changes
    setCurrentBlockIndex(0);
    setCurrentQuestionIndex(0);
  }, [survey.blocks, survey.randomizeBlocks, introductionStyle]);

  // Calculate question groups for current block
  const currentBlockGroups = useMemo(() => {
    if (randomizedBlocks.length > 0 && currentBlockIndex < randomizedBlocks.length) {
      const currentBlock = randomizedBlocks[currentBlockIndex];
      return groupMCQuestions(currentBlock);
    }
    return [];
  }, [randomizedBlocks, currentBlockIndex]);

  // Update question groups when current block changes
  useEffect(() => {
    setQuestionGroups(currentBlockGroups);
  }, [currentBlockGroups]);

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
            <h1 className="text-2xl font-bold text-dark-purple mb-4">
              Loading...
            </h1>
            <p className="text-dark-purple/70">Preparing survey questions...</p>
          </div>
        </div>
      </ExperimentLayout>
    );
  }

  const currentBlock = randomizedBlocks[currentBlockIndex];
  
  // Check if current question is part of a grouped MC question
  const currentMCGroup = questionGroups.find(group => {
    const groupEndIndex = group.startIndex + group.questions.length - 1;
    return currentQuestionIndex >= group.startIndex && currentQuestionIndex <= groupEndIndex;
  });

  // For display purposes, only show LikertGrid if there's more than 1 question in the group
  // Otherwise, treat it as a normal question
  const displayMCGroup = currentMCGroup && currentMCGroup.questions.length > 1 
    ? currentMCGroup 
    : null;

  // If there's a single-question group, get that question; otherwise get the current question
  const currentQuestion = currentBlock
    ? (displayMCGroup 
        ? null // When showing LikertGrid, no single question
        : (currentMCGroup && currentMCGroup.questions.length === 1
            ? currentMCGroup.questions[0] // Single question from group
            : currentBlock.questions[currentQuestionIndex])) // Normal question
    : null;
  const currentAnswer = currentQuestion
    ? responses[currentQuestion.id]
    : undefined;

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

  // Handle answer for grouped MC questions (LikertGrid)
  const handleGroupedAnswer = (questionId: string, answer: AnswerValue) => {
    onAnswer(questionId, answer);
    setShowValidationError(false);
  };

  const handleAutoNext = () => {
    // Only auto-advance for questions that support it
    if (
      currentQuestion &&
      (currentQuestion.type === "multipleChoice" ||
        currentQuestion.type === "rating" ||
        currentQuestion.type === "likertGrid" ||
        currentQuestion.type === "searchableSelect")
    ) {
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
    
    // If we're in a grouped MC question, skip to the end of the group
    if (displayMCGroup) {
      const groupEndIndex = displayMCGroup.startIndex + displayMCGroup.questions.length - 1;
      // Skip to the question after the group
      const nextIndex = groupEndIndex + 1;
      if (nextIndex < currentBlock.questions.length) {
        setCurrentQuestionIndex(nextIndex);
      } else if (currentBlockIndex < randomizedBlocks.length - 1) {
        // Move to next block
        setCurrentBlockIndex(currentBlockIndex + 1);
        setCurrentQuestionIndex(0);
      } else {
        // Defer to allow any last onAnswer state updates to flush before submit
        setTimeout(() => onNext(), 0);
      }
    } else {
      // Normal navigation
      if (currentQuestionIndex < currentBlock.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else if (currentBlockIndex < randomizedBlocks.length - 1) {
        // Move to next block
        setCurrentBlockIndex(currentBlockIndex + 1);
        setCurrentQuestionIndex(0);
      } else {
        // Defer to allow any last onAnswer state updates to flush before submit
        setTimeout(() => onNext(), 0);
      }
    }
  };

  const handleBack = () => {
    setShowValidationError(false);
    
    // If we're in a grouped MC question, go back to the start of the group
    if (displayMCGroup && currentQuestionIndex > displayMCGroup.startIndex) {
      setCurrentQuestionIndex(displayMCGroup.startIndex);
    } else if (currentQuestionIndex > 0) {
      // Check if previous question is part of a group
      const prevMCGroup = questionGroups.find(group => {
        const groupEndIndex = group.startIndex + group.questions.length - 1;
        return (currentQuestionIndex - 1) >= group.startIndex && (currentQuestionIndex - 1) <= groupEndIndex;
      });
      
      if (prevMCGroup) {
        // Go to start of previous group
        setCurrentQuestionIndex(prevMCGroup.startIndex);
      } else {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
      }
    } else if (currentBlockIndex > 0) {
      // Move to previous block
      setCurrentBlockIndex(currentBlockIndex - 1);
      setCurrentQuestionIndex(
        randomizedBlocks[currentBlockIndex - 1].questions.length - 1
      );
    } else if (onBack) {
      onBack();
    }
  };

  const canProceed = () => {
    // If we're showing a grouped MC question, check if all questions in the group are answered
    if (displayMCGroup) {
      const allAnswered = displayMCGroup.questions.every(q => {
        const answer = responses[q.id];
        return answer !== undefined && answer !== null && answer !== "";
      });
      return allAnswered;
    }

    if (!currentQuestion || !currentQuestion.required) return true;

    // Handle different question types
    switch (currentQuestion.type) {
      case "multipleChoice":
      case "rating":
        // For single-value questions, check if answer exists and is not empty
        return (
          currentAnswer !== undefined &&
          currentAnswer !== null &&
          currentAnswer !== ""
        );

      case "checkbox":
        // For checkbox questions, check if array exists and has at least one selection
        const checkboxValue = currentAnswer as string[];
        return Array.isArray(checkboxValue) && checkboxValue.length > 0;

      case "textInput":
        // For text questions, check if string exists and is not empty (trimmed)
        const textValue = currentAnswer as string;
        return (
          textValue !== undefined &&
          textValue !== null &&
          textValue.trim() !== ""
        );

      case "number":
        // For number questions, check if number exists and is not null/undefined
        const numberValue = currentAnswer as number;
        return (
          numberValue !== undefined &&
          numberValue !== null &&
          !isNaN(numberValue)
        );

      case "likertGrid":
        // For Likert grid questions, check if all statements have been answered
        const likertValue = currentAnswer as Record<string, string>;
        if (!likertValue || typeof likertValue !== "object") return false;

        // Check if all statements have been answered
        const statements = currentQuestion.statements || [];
        return statements.every((_, index) => likertValue[index.toString()]);

      case "searchableSelect":
        // For searchable select questions, check if a valid option is selected
        return (
          currentAnswer !== undefined &&
          currentAnswer !== null &&
          currentAnswer !== ""
        );

      case "textDisplay":
        // Text display questions don't require answers
        return true;

      default:
        // Fallback to basic check
        return (
          currentAnswer !== undefined &&
          currentAnswer !== null &&
          currentAnswer !== ""
        );
    }
  };

  // Calculate total questions across all blocks
  const totalQuestions = randomizedBlocks.reduce(
    (total, block) => total + block.questions.length,
    0
  );
  const currentQuestionNumber =
    randomizedBlocks
      .slice(0, currentBlockIndex)
      .reduce((total, block) => total + block.questions.length, 0) +
    currentQuestionIndex +
    1;
  const currentBlockQuestionsNumber = currentBlock.questions.length;

  return (
    <ExperimentLayout background="light">
      <div className="min-h-screen px-2 sm:px-6 py-2 sm:py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            {/* {onBack && !showIntro && (
              <Button
                variant="ghost"
                onClick={handleBack}
                className="text-dark-purple hover:bg-maize/20"
              >
                ← Back
              </Button>
            )} */}
            {/* <h1 className="text-2xl font-bold text-dark-purple flex-1 text-center">
              {survey.title}
            </h1> */}
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
                  {survey.intro ? "Continue" : "Start Survey"}
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
                inBlock={currentBlockQuestionsNumber}
                total={totalQuestions}
              />

              {/* Question */}
              <div className="bg-white rounded-2xl p-2 sm:p-8 shadow-sm border border-ivory">
                {displayMCGroup ? (
                  // Render grouped MC questions as LikertGrid
                  <>
                    <LikertGrid
                      question={currentBlock?.title || ""}
                      statements={displayMCGroup.questions.map(q => q.text)}
                      scale={displayMCGroup.scale}
                      value={(() => {
                        // Create a combined value object with question IDs as keys
                        const combinedValue: Record<string, string> = {};
                        displayMCGroup.questions.forEach((q) => {
                          const answer = responses[q.id];
                          if (answer && typeof answer === 'string') {
                            // Find the choice text that matches the answer value
                            const choice = q.choices?.find(c => c.value === answer);
                            if (choice) {
                              combinedValue[q.id] = choice.text;
                            }
                          }
                        });
                        return combinedValue as AnswerValue;
                      })()}
                      onChange={(value) => {
                        // When a response is selected, update the individual question
                        if (typeof value === 'object' && !Array.isArray(value)) {
                          const responseValue = value as Record<string, string>;
                          // The keys are question IDs (since we pass questionIds to LikertGrid)
                          Object.keys(responseValue).forEach((questionId) => {
                            const question = displayMCGroup.questions.find(q => q.id === questionId);
                            if (question) {
                              // Find the choice value that matches the text
                              const choice = question.choices?.find(c => c.text === responseValue[questionId]);
                              if (choice) {
                                handleGroupedAnswer(question.id, choice.value);
                              }
                            }
                          });
                        }
                      }}
                      required={displayMCGroup.questions.some(q => q.required)}
                      onAutoNext={undefined} // Don't auto-advance for groups
                      questionIds={displayMCGroup.questions.map(q => q.id)}
                    />
                    {showValidationError && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm font-medium">
                          Please answer all questions before continuing.
                        </p>
                      </div>
                    )}
                  </>
                ) : currentQuestion ? (
                  <>
                    <QuestionRenderer
                      key={currentQuestion.id}
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
                  disabled={
                    currentBlockIndex === 0 &&
                    currentQuestionIndex === 0 &&
                    !onBack
                  }
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
                  ) : currentQuestionNumber < totalQuestions ? (
                    "Next"
                  ) : (
                    submitButtonText || "Continue"
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
