'use client';

import { useEffect } from 'react';
import { useExperiment } from '@/hooks/useExperiment';
import { experimentConfig, getSongsByGenre } from '@/lib/config';
import { WelcomeScreen } from '@/components/screens/WelcomeScreen';
import { TermsScreen } from '@/components/screens/TermsScreen';
import { SurveyScreen } from '@/components/screens/SurveyScreen';
import { GenreSelectionScreen } from '@/components/screens/GenreSelectionScreen';
import { AudioPlayerScreen } from '@/components/screens/AudioPlayerScreen';
import { QualtricsScreen } from '@/components/screens/QualtricsScreen';
import { ThankYouScreen } from '@/components/screens/ThankYouScreen';
import { useEngagementTracking } from '@/hooks/useEngagementTracking';
import { getSession, addSongSession } from '@/lib/session';

export default function ExperimentPage() {
  const {
    currentStep,
    currentStepName,
    responses,
    selectedGenre,
    currentSongIndex,
    session,
    nextStep,
    prevStep,
    saveResponse,
    setLocalResponse,
    selectGenre,
    nextSong,
    prevSong,
    getCurrentSong,
    getCurrentIntroductionStyle,
    getCurrentSongNumber,
    isLastSong,
    saveSongAnswers,
    trackSongSkip,
    trackSongCompletion,
    clearResponses,
  } = useExperiment();

  // Get session for engagement tracking
  const currentSession = getSession();
  
  // Set up engagement tracking
  useEngagementTracking({
    page: currentStepName,
    trackClicks: true,
    trackScrolls: true,
    trackAudioInteractions: true,
    trackPageTime: true
  });

  // Log step transitions
  useEffect(() => {
    console.info('🔄 EXPERIMENT STEP CHANGED:', {
      step_name: currentStepName,
      step_index: currentStep,
      session_id: currentSession?.session_id,
      group: currentSession?.group,
      selected_genre: currentSession?.chosen_genre,
      timestamp: new Date().toISOString()
    });
  }, [currentStepName, currentStep, currentSession]);

  const renderCurrentStep = () => {
    switch (currentStepName) {
      case 'welcome':
        return <WelcomeScreen onStart={nextStep} />;

      case 'terms':
        return <TermsScreen onAccept={nextStep} />;

      case 'onboarding':
        return (
          <SurveyScreen
            key="onboarding-survey" // Force re-render for onboarding
            questions={experimentConfig.surveys.onboarding.questions}
            responses={responses}
            onAnswer={saveResponse}
            onNext={nextStep}
            title={experimentConfig.surveys.onboarding.title}
          />
        );

      case 'genre-selection':
        return (
          <GenreSelectionScreen
            genres={experimentConfig.genres}
            selectedGenre={selectedGenre}
            onSelectGenre={selectGenre}
            onStart={nextStep}
            onBack={prevStep}
            sessionGroup={currentSession?.group}
          />
        );

      case 'audio-song-1':
      case 'audio-song-2':
      case 'audio-song-3':
        const currentSong = getCurrentSong();
        const currentGenre = experimentConfig.genres.find(g => g.id === selectedGenre);
        const songNumber = getCurrentSongNumber();
        
        if (!currentSong || !currentGenre) return <div>Loading...</div>;
        
        return (
          <AudioPlayerScreen
            song={currentSong}
            genre={currentGenre}
            currentSongIndex={currentSongIndex}
            totalSongs={3}
            onNextSong={nextSong}
            onPreviousSong={prevSong}
            onComplete={() => {
              // When song completes, go to survey
              nextStep();
            }}
            onBack={prevStep}
            hasNextSong={!isLastSong()}
            hasPreviousSong={currentSongIndex > 0}
            songNumber={songNumber}
            introductionStyle={getCurrentIntroductionStyle()}
            onSkip={(skippedAtMs) => {
              // Track skip in session
              trackSongSkip(skippedAtMs);
              // When song is skipped, also go to survey
              nextStep();
            }}
            onSongComplete={(listeningTimeMs) => {
              // Track completion in session
              trackSongCompletion(listeningTimeMs);
            }}
          />
        );

      case 'survey-song-1':
      case 'survey-song-2':
      case 'survey-song-3':
        return (
          <SurveyScreen
            key={`survey-${currentSongIndex}`} // Force re-render for each song
            questions={experimentConfig.surveys.postListening.questions}
            responses={responses}
            onAnswer={setLocalResponse}
            onNext={() => {
              // Save song answers before moving to next step
              saveSongAnswers(responses);
              
              // Clear responses so the next song survey starts blank
              clearResponses();
              
              // Move to next step
              nextStep();
            }}
            onBack={prevStep}
            title={`Your Experience - Song ${getCurrentSongNumber()}`}
          />
        );

      case 'qualtrics':
        return <QualtricsScreen onComplete={nextStep} />;

      case 'thank-you':
        return <ThankYouScreen />;

      default:
        return <div>Unknown step: {currentStepName}</div>;
    }
  };

  return (
    <div className="min-h-screen">
      {renderCurrentStep()}
    </div>
  );
}
