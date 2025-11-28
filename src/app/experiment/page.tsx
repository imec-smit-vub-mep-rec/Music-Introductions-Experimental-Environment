"use client";

import { useEffect } from "react";
import { useExperiment } from "@/hooks/useExperiment";
import { experimentConfig } from "@/lib/config";
import { WelcomeScreen } from "@/components/screens/WelcomeScreen";
import { TermsScreen } from "@/components/screens/TermsScreen";
import { SurveyScreen } from "@/components/screens/SurveyScreen";
import { GenreSelectionScreen } from "@/components/screens/GenreSelectionScreen";
import { AudioPlayerScreen } from "@/components/screens/AudioPlayerScreen";
import { ThankYouScreen } from "@/components/screens/ThankYouScreen";
import { useEngagementTracking } from "@/hooks/useEngagementTracking";
import { getSession } from "@/lib/session";
import { GenreConfirmationScreen } from "@/components/screens/GenreConfirmationScreen";
import { FinalSurveyScreen } from "@/components/screens/FinalSurveyScreen";
import { AttentionCheckFailedScreen } from "@/components/screens/AttentionCheckFailedScreen";

export default function ExperimentPage() {
  const {
    currentStep,
    currentStepName,
    responses,
    selectedGenre,
    currentSongIndex,
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
    saveSongAnswer,
    trackSongSkip,
    trackSongCompletion,
    clearResponses,
    getCurrentSongAnswers,
  } = useExperiment();

  // Get session for engagement tracking
  const currentSession = getSession();

  // Set up engagement tracking
  useEngagementTracking({
    page: currentStepName,
    trackClicks: true,
    trackScrolls: true,
    trackAudioInteractions: true,
    trackPageTime: true,
  });

  // Log step transitions
  useEffect(() => {
    console.info("🔄 EXPERIMENT STEP CHANGED:", {
      step_name: currentStepName,
      step_index: currentStep,
      session_id: currentSession?.session_id,
      group: currentSession?.group,
      selected_genre: currentSession?.chosen_genre,
      timestamp: new Date().toISOString(),
    });
  }, [currentStepName, currentStep, currentSession]);

  const renderCurrentStep = () => {
    switch (currentStepName) {
      case "welcome":
        return <WelcomeScreen onStart={nextStep} />;

      case "terms":
        return <TermsScreen onAccept={nextStep} />;

      case "onboarding":
        return (
          <SurveyScreen
            key="onboarding-survey" // Force re-render for onboarding
            survey={experimentConfig.surveys.onboarding}
            responses={responses}
            onAnswer={saveResponse}
            onNext={nextStep}
          />
        );

      case "attention-check-failed":
        return <AttentionCheckFailedScreen />;

      case "demographics":
        return (
          <SurveyScreen
            key="demographics-survey" // Force re-render for demographics
            survey={experimentConfig.surveys.demographics}
            responses={responses}
            onAnswer={saveResponse}
            onNext={nextStep}
            //onBack={prevStep}
          />
        );

      case "genre-selection":
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

      // Confirmation of genre selection

      case "genre-confirmation":
        const chosenGenre = experimentConfig.genres.find(
          (g) => g.id === selectedGenre
        );
        if (!chosenGenre)
          return (
            <div>
              Please select a genre in the previous step.
              <button onClick={prevStep}>Back</button>
            </div>
          );
        return (
          <GenreConfirmationScreen
            chosenGenre={chosenGenre}
            onBack={prevStep}
            onStart={nextStep}
          />
        );

      case "audio-song-1":
      case "audio-song-2":
      case "audio-song-3":
        const currentSong = getCurrentSong();
        const currentGenre = experimentConfig.genres.find(
          (g) => g.id === selectedGenre
        );
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

      case "survey-song-1":
      case "survey-song-2":
      case "survey-song-3":
        return (
          <SurveyScreen
            key={`survey-${currentSongIndex}`} // Force re-render for each song
            survey={experimentConfig.surveys.postListening}
            responses={{ ...getCurrentSongAnswers(), ...responses }}
            onAnswer={saveSongAnswer}
            onNext={() => {
              // Persist using the session as source of truth
              saveSongAnswers();
              clearResponses();
              nextStep();
            }}
            onBack={prevStep}
            introductionStyle={getCurrentIntroductionStyle()}
          />
        );

      case "qualtrics":
        return <FinalSurveyScreen onComplete={nextStep} />;

      case "thank-you":
        return <ThankYouScreen />;

      default:
        return <div>Unknown step: {currentStepName}</div>;
    }
  };

  return <div className="min-h-screen">{renderCurrentStep()}</div>;
}
