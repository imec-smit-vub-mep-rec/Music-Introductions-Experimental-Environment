"use client";

import { useState, useCallback } from "react";
import { ExperimentLayout } from "@/components/layout/ExperimentLayout";
import { SurveyScreen } from "@/components/screens/SurveyScreen";
import {
  getSession,
  updateSessionFinalAnswers,
  markExperimentCompleted,
  syncSessionToRemote,
  updateQualtricsResponseId,
  getQualtricsResponseId,
  updateFinalAnswersWithSync,
} from "@/lib/session";
import { AnswerValue } from "@/lib/types";
import { experimentConfig } from "@/lib/config";

interface QualtricsScreenProps {
  onComplete: () => void;
}

export function QualtricsScreen({ onComplete }: QualtricsScreenProps) {
  const [responses, setResponses] = useState<Record<string, AnswerValue>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    async (questionId: string, answer: AnswerValue) => {
      const updatedResponses = {
        ...responses,
        [questionId]: answer,
      };

      // Update local state immediately for UI responsiveness
      setResponses(updatedResponses);

      // Sync to both Qualtrics and Neon DB
      const result = await updateFinalAnswersWithSync(updatedResponses);

      if (!result.success) {
        console.error("❌ ANSWER CORRECTION FAILED:", {
          question_id: questionId,
          error: result.error,
          timestamp: new Date().toISOString(),
        });

        // Show error to user but don't block the UI
        alert(
          `Failed to save answer correction: ${result.error}. Please try again.`
        );
      } else {
        console.log("✅ ANSWER CORRECTION SAVED:", {
          question_id: questionId,
          answer: answer,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [responses]
  );

  // Combined handler that detects if this is a correction or new answer
  const handleAnswerWithCorrection = useCallback(
    async (questionId: string, answer: AnswerValue) => {
      const isCorrection = responses[questionId] !== undefined;

      if (isCorrection) {
        // This is a correction - use the correction handler
        await handleAnswerCorrection(questionId, answer);
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
      const session = getSession();
      if (!session) {
        console.error("No session found");
        return;
      }

      // Save final answers to session
      updateSessionFinalAnswers(responses);

      // Mark experiment as completed
      markExperimentCompleted();

      // Sync to database with completion status
      await syncSessionToRemote();

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
              Thank you for participating in our music discovery experiment!
              Please complete this final questionnaire to help us understand
              your experience.
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
