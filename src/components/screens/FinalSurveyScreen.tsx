"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ExperimentLayout } from "@/components/layout/ExperimentLayout";
import { SurveyScreen } from "@/components/screens/SurveyScreen";
import {
  getSession,
  updateSessionFinalAnswers,
  markExperimentCompleted,
  syncSessionToRemote,
  updateFinalAnswersWithSync,
} from "@/lib/session";
import { AnswerValue } from "@/lib/types";
import { experimentConfig } from "@/lib/config";

interface FinalSurveyScreenProps {
  onComplete: () => void;
}

export function FinalSurveyScreen({ onComplete }: FinalSurveyScreenProps) {
  const [responses, setResponses] = useState<Record<string, AnswerValue>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSyncRef = useRef<Record<string, AnswerValue> | null>(null);

  // Debounced sync function
  const debouncedSync = useCallback(
    (updatedResponses: Record<string, AnswerValue>) => {
      // Clear any existing timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Store the latest responses for syncing
      pendingSyncRef.current = updatedResponses;

      // Set a new timeout to sync after user stops typing (500ms)
      syncTimeoutRef.current = setTimeout(async () => {
        const responsesToSync = pendingSyncRef.current;
        if (responsesToSync) {
          pendingSyncRef.current = null;
          const result = await updateFinalAnswersWithSync(responsesToSync);

          if (!result.success) {
            console.error("❌ ANSWER CORRECTION FAILED:", {
              error: result.error,
              timestamp: new Date().toISOString(),
            });
            // Don't show alert on every sync failure - only log
          } else {
            console.log("✅ ANSWER CORRECTION SAVED:", {
              answers_count: Object.keys(responsesToSync).length,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }, 500);
    },
    []
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  const handleAnswer = useCallback(
    (questionId: string, answer: AnswerValue) => {
      setResponses((prev) => ({
        ...prev,
        [questionId]: answer,
      }));
    },
    []
  );

  const handleAnswerCorrection = useCallback(
    (questionId: string, answer: AnswerValue) => {
      const updatedResponses = {
        ...responses,
        [questionId]: answer,
      };

      // Update local state immediately for UI responsiveness
      setResponses(updatedResponses);

      // Debounce the sync to avoid saving on every keystroke
      debouncedSync(updatedResponses);
    },
    [responses, debouncedSync]
  );

  // Combined handler that detects if this is a correction or new answer
  const handleAnswerWithCorrection = useCallback(
    (questionId: string, answer: AnswerValue) => {
      const isCorrection = responses[questionId] !== undefined;

      if (isCorrection) {
        // This is a correction - use the debounced correction handler
        handleAnswerCorrection(questionId, answer);
      } else {
        // This is a new answer - use the regular handler
        handleAnswer(questionId, answer);
      }
    },
    [responses, handleAnswer, handleAnswerCorrection]
  );

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);

    try {
      // Flush any pending debounced sync before submitting
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }

      const session = getSession();
      if (!session) {
        console.error("No session found");
        setIsSubmitting(false);
        return;
      }

      // Get the latest session state (which might have answers saved via debounced sync)
      const latestSession = getSession();
      const sessionFinalAnswers = latestSession?.answers?.final || {};
      const pendingSyncCount = pendingSyncRef.current ? Object.keys(pendingSyncRef.current).length : 0;

      // Merge in order of precedence:
      // 1. Current React state (responses)
      // 2. Pending sync data (most recent)
      // 3. Session final answers (already saved)
      let allFinalAnswers = {
        ...sessionFinalAnswers, // Start with what's already in session
        ...responses, // Override with current React state
      };
      
      if (pendingSyncRef.current) {
        // Merge pending sync data (takes highest precedence)
        allFinalAnswers = {
          ...allFinalAnswers,
          ...pendingSyncRef.current,
        };
        pendingSyncRef.current = null;
      }

      console.log("📊 FINAL SUBMIT: Merged answers", {
        session_answers_count: Object.keys(sessionFinalAnswers).length,
        react_responses_count: Object.keys(responses).length,
        pending_sync_count: pendingSyncCount,
        final_merged_count: Object.keys(allFinalAnswers).length,
        timestamp: new Date().toISOString(),
      });

      // Save ALL final answers to session (ensuring we have the complete set)
      updateSessionFinalAnswers(allFinalAnswers);

      // Mark experiment as completed
      markExperimentCompleted();

      // Sync to database with completion status - ensure it completes successfully
      // Use updateFinalAnswersWithSync to ensure all answers are synced
      console.log("💾 FINAL SUBMIT: Syncing all answers to database...", {
        answers_count: Object.keys(allFinalAnswers).length,
        session_id: session.session_id,
        timestamp: new Date().toISOString(),
      });

      const syncResult = await updateFinalAnswersWithSync(allFinalAnswers);
      
      if (!syncResult.success) {
        console.error("❌ FINAL SYNC FAILED, RETRYING:", syncResult.error);
        // Retry once more with direct sync
        await syncSessionToRemote();
        
        // Verify the session was saved to localStorage (at minimum)
        const verifySession = getSession();
        if (!verifySession) {
          throw new Error("Session lost during sync");
        }
        
        const finalAnswersInSession = verifySession.answers.final || {};
        const allAnswersPresent = Object.keys(allFinalAnswers).every(
          (key) => finalAnswersInSession[key] !== undefined
        );
        
        if (!allAnswersPresent) {
          console.error("❌ NOT ALL ANSWERS SAVED TO SESSION:", {
            expected: Object.keys(allFinalAnswers),
            actual: Object.keys(finalAnswersInSession),
          });
          // Try one more time to save
          updateSessionFinalAnswers(allFinalAnswers);
          await syncSessionToRemote();
        } else {
          console.log("✅ ALL ANSWERS VERIFIED IN SESSION:", {
            answers_count: Object.keys(finalAnswersInSession).length,
          });
        }
      } else {
        console.log("✅ FINAL SYNC SUCCESSFUL:", {
          answers_count: Object.keys(allFinalAnswers).length,
        });
      }

      // // Submit to Qualtrics API
      // const existingResponseId = getQualtricsResponseId();

      // console.log("📤 SUBMITTING TO QUALTRICS API:", {
      //   session_id: session.session_id,
      //   group: session.group,
      //   chosen_genre: session.chosen_genre,
      //   songs_count: session.answers.songs.length,
      //   onboarding_answers: Object.keys(session.answers.onboarding).length,
      //   final_answers: Object.keys(responses).length,
      //   interactions_count: session.engagement_metrics.interactions.length,
      //   has_existing_response_id: !!existingResponseId,
      //   timestamp: new Date().toISOString(),
      // });

      // const response = await fetch('/api/qualtrics/submit', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     sessionData: session,
      //     finalAnswers: responses,
      //     existingResponseId: existingResponseId,
      //   }),
      // });

      // if (!response.ok) {
      //   throw new Error(`Qualtrics submission failed: ${response.statusText}`);
      // }

      // const result = await response.json();

      // if (result.success) {
      //   // Store the response ID for future updates
      //   if (result.responseId) {
      //     updateQualtricsResponseId(result.responseId);
      //   }

      //   // console.log("✅ QUALTRICS SUBMISSION SUCCESSFUL:", {
      //   //   session_id: session.session_id,
      //   //   response_id: result.responseId,
      //   //   timestamp: new Date().toISOString(),
      //   // });

      //   // Complete the experiment
      //   onComplete();
      // } else {
      //   console.error("❌ QUALTRICS SUBMISSION FAILED:", {
      //     session_id: session.session_id,
      //     error: result.error,
      //     retryable: result.retryable,
      //     timestamp: new Date().toISOString(),
      //   });

      //   // Show error message to user but still complete the experiment
      //   // Data is already saved to Neon DB, so we don't lose the data
      //   alert(`Survey submission failed: ${result.error}. Your responses have been saved locally.`);
      //   onComplete();
      // }

      onComplete();
    } catch (error) {
      console.error("❌ QUALTRICS SUBMISSION ERROR:", error);

      // Show error message to user but still complete the experiment
      // Data is already saved to Neon DB, so we don't lose the data
      alert(
        `Survey submission failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }. Your responses have been saved locally.`
      );
      onComplete();
    } finally {
      setIsSubmitting(false);
    }
  }, [responses, onComplete]);

  return (
    <ExperimentLayout background="light">
      <div className="min-h-screen px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-dark-purple mb-4">
              Final Questionnaire
            </h1>
            <p className="text-dark-purple/70 text-lg">
              Complete this final questionnaire to help us understand your
              experience.
            </p>
          </div>

          {/* Final Survey */}
          <SurveyScreen
            survey={experimentConfig.surveys.final}
            responses={responses}
            onAnswer={handleAnswerWithCorrection}
            onNext={handleSubmit}
            isSubmitting={isSubmitting}
            submitButtonText="Submit & Complete Experiment"
            allowAutoSubmit={false} // Disable auto-submission to ensure all questions are answered
          />
        </div>
      </div>
    </ExperimentLayout>
  );
}
