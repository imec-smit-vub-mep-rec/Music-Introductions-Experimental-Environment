'use client';

import { useState, useCallback } from 'react';
import { ExperimentLayout } from '@/components/layout/ExperimentLayout';
import { SurveyScreen } from '@/components/screens/SurveyScreen';
import { getSession, updateSessionFinalAnswers, markExperimentCompleted, syncSessionToRemote } from '@/lib/session';
import { AnswerValue } from '@/lib/types';
import { experimentConfig } from '@/lib/config';

interface QualtricsScreenProps {
  onComplete: () => void;
}

export function QualtricsScreen({ onComplete }: QualtricsScreenProps) {
  const [responses, setResponses] = useState<Record<string, AnswerValue>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnswer = useCallback((questionId: string, answer: AnswerValue) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    
    try {
      const session = getSession();
      if (!session) {
        console.error('No session found');
        return;
      }

      // Save final answers to session
      updateSessionFinalAnswers(responses);
      
      // Mark experiment as completed
      markExperimentCompleted();
      
      // Sync to database with completion status
      await syncSessionToRemote();

      // Get Qualtrics URL from environment variable
      const baseUrl = process.env.NEXT_PUBLIC_QUALTRICS_URL;
      if (!baseUrl) {
        console.error('NEXT_PUBLIC_QUALTRICS_URL not configured');
        onComplete();
        return;
      }

      // Build query string with all session data
      const params = new URLSearchParams();
      
      // Add session metadata
      params.append('session_id', session.session_id.toString());
      params.append('group', session.group);
      params.append('chosen_genre', session.chosen_genre || '');
      params.append('start_time', session.start_time);
      
      // Add onboarding answers
      Object.entries(session.answers.onboarding).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params.append(`onboarding_${key}`, Array.isArray(value) ? value.join(',') : String(value));
        }
      });
      
      // Add final answers
      Object.entries(session.answers.final).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params.append(`final_${key}`, Array.isArray(value) ? value.join(',') : String(value));
        }
      });
      
      // Add song data
      session.answers.songs.forEach((song, index) => {
        params.append(`song_${index + 1}_id`, song.songId);
        params.append(`song_${index + 1}_introduction_style`, song.introduction_style);
        params.append(`song_${index + 1}_skipped`, song.skipped.toString());
        params.append(`song_${index + 1}_skipped_at_ms`, song.skipped_at_ms?.toString() || '');
        params.append(`song_${index + 1}_listening_time_ms`, song.listening_time_ms.toString());
        params.append(`song_${index + 1}_liked`, song.liked?.toString() || '');
        params.append(`song_${index + 1}_liked_at_ms`, song.liked_at_ms?.toString() || '');
        
        // Add song answers
        Object.entries(song.answers).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            params.append(`song_${index + 1}_${key}`, Array.isArray(value) ? value.join(',') : String(value));
          }
        });
      });
      
      // Add engagement metrics
      Object.entries(session.engagement_metrics.page_times).forEach(([page, time]) => {
        params.append(`page_time_${page}`, time.toString());
      });
      
      // Add interaction counts
      const interactionCounts: Record<string, number> = {};
      session.engagement_metrics.interactions.forEach(interaction => {
        const key = `${interaction.page}_${interaction.type}`;
        interactionCounts[key] = (interactionCounts[key] || 0) + 1;
      });
      
      Object.entries(interactionCounts).forEach(([key, count]) => {
        params.append(`interaction_${key}`, count.toString());
      });

      const finalUrl = `${baseUrl}?${params.toString()}`;
      
      console.log('📋 QUALTRICS REDIRECT PREPARED:', {
        session_id: session.session_id,
        group: session.group,
        chosen_genre: session.chosen_genre,
        songs_count: session.answers.songs.length,
        onboarding_answers: Object.keys(session.answers.onboarding).length,
        final_answers: Object.keys(session.answers.final).length,
        interactions_count: session.engagement_metrics.interactions.length,
        url_length: finalUrl.length,
        timestamp: new Date().toISOString()
      });

      // Redirect to Qualtrics with all data
      window.location.href = finalUrl;
      
    } catch (error) {
      console.error('❌ QUALTRICS REDIRECT FAILED:', error);
      // Still complete the experiment even if redirect fails
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
              Please complete this final questionnaire to help us understand your experience.
            </p>
          </div>

          {/* Final Survey */}
          <SurveyScreen
            questions={experimentConfig.surveys.final.questions}
            responses={responses}
            onAnswer={handleAnswer}
            onNext={handleSubmit}
            title={experimentConfig.surveys.final.title}
            isSubmitting={isSubmitting}
            submitButtonText="Submit & Complete Experiment"
          />
        </div>
      </div>
    </ExperimentLayout>
  );
}
