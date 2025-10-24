'use client';

import { useEffect, useState } from 'react';
import { ExperimentLayout } from '@/components/layout/ExperimentLayout';
import { getSession } from '@/lib/session';

interface QualtricsScreenProps {
  onComplete: () => void;
}

export function QualtricsScreen({ onComplete }: QualtricsScreenProps) {
  const [qualtricsUrl, setQualtricsUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      console.error('No session found');
      return;
    }

    // Get Qualtrics URL from environment variable
    const baseUrl = process.env.NEXT_PUBLIC_QUALTRICS_URL;
    if (!baseUrl) {
      console.error('NEXT_PUBLIC_QUALTRICS_URL not configured');
      setIsLoading(false);
      return;
    }

    // Build query string with session data
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
    
    // Add song data
    session.answers.songs.forEach((song, index) => {
      params.append(`song_${index + 1}_id`, song.songId);
      params.append(`song_${index + 1}_introduction_style`, song.introduction_style);
      params.append(`song_${index + 1}_skipped`, song.skipped.toString());
      params.append(`song_${index + 1}_skipped_at_ms`, song.skipped_at_ms?.toString() || '');
      params.append(`song_${index + 1}_listening_time_ms`, song.listening_time_ms.toString());
      
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
    setQualtricsUrl(finalUrl);
    setIsLoading(false);
    
    console.log('📋 QUALTRICS SURVEY LOADED:', {
      session_id: session.session_id,
      group: session.group,
      chosen_genre: session.chosen_genre,
      songs_count: session.answers.songs.length,
      onboarding_answers: Object.keys(session.answers.onboarding).length,
      interactions_count: session.engagement_metrics.interactions.length,
      url_length: finalUrl.length,
      timestamp: new Date().toISOString()
    });
  }, []);

  if (isLoading) {
    return (
      <ExperimentLayout background="light">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dark-purple mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-dark-purple mb-2">Loading Survey</h1>
            <p className="text-dark-purple/70">Preparing your final questionnaire...</p>
          </div>
        </div>
      </ExperimentLayout>
    );
  }

  if (!qualtricsUrl) {
    return (
      <ExperimentLayout background="light">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-dark-purple mb-4">Survey Not Available</h1>
            <p className="text-dark-purple/70 mb-6">
              The final survey is not configured. Please contact the experiment administrator.
            </p>
            <button
              onClick={onComplete}
              className="bg-dark-purple text-white px-6 py-3 rounded-full hover:bg-dark-purple/90"
            >
              Continue
            </button>
          </div>
        </div>
      </ExperimentLayout>
    );
  }

  return (
    <ExperimentLayout background="light">
      <div className="min-h-screen px-6 py-8">
        <div className="max-w-6xl mx-auto">
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

          {/* Qualtrics iframe */}
          <div className="bg-white rounded-2xl shadow-sm border border-ivory overflow-hidden">
            <iframe
              src={qualtricsUrl}
              width="100%"
              height="800"
              frameBorder="0"
              title="Final Survey"
              className="w-full"
              onLoad={() => {
                // Optional: Track when iframe loads
                console.log('Qualtrics survey loaded');
              }}
            />
          </div>

          {/* Instructions */}
          <div className="mt-6 text-center">
            <p className="text-dark-purple/70 text-sm">
              Once you complete the survey, you will be redirected to a thank you page.
            </p>
          </div>
        </div>
      </div>
    </ExperimentLayout>
  );
}
