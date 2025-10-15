'use client';

import { useExperiment } from '@/hooks/useExperiment';
import { experimentConfig, getSongsByGenre } from '@/lib/config';
import { WelcomeScreen } from '@/components/screens/WelcomeScreen';
import { TermsScreen } from '@/components/screens/TermsScreen';
import { SurveyScreen } from '@/components/screens/SurveyScreen';
import { GenreSelectionScreen } from '@/components/screens/GenreSelectionScreen';
import { AudioPlayerScreen } from '@/components/screens/AudioPlayerScreen';
import { ThankYouScreen } from '@/components/screens/ThankYouScreen';

export default function ExperimentPage() {
  const {
    currentStep,
    currentStepName,
    responses,
    selectedGenres,
    currentSongIndex,
    nextStep,
    prevStep,
    saveResponse,
    selectGenre,
    nextSong,
    prevSong,
    getCurrentSong,
    getCurrentSongs,
    canSelectGenre,
  } = useExperiment();

  const renderCurrentStep = () => {
    switch (currentStepName) {
      case 'welcome':
        return <WelcomeScreen onStart={nextStep} />;

      case 'terms':
        return <TermsScreen onAccept={nextStep} />;

      case 'onboarding':
        return (
          <SurveyScreen
            questions={experimentConfig.surveys.onboarding.questions}
            responses={responses}
            onAnswer={saveResponse}
            onNext={nextStep}
            title={experimentConfig.surveys.onboarding.title}
          />
        );

      case 'genre-familiar':
        return (
          <GenreSelectionScreen
            genres={experimentConfig.genres}
            selectedGenre={selectedGenres.familiar}
            onSelectGenre={(genreId) => selectGenre(genreId, 'familiar')}
            onStart={nextStep}
            onBack={prevStep}
            title="Choose a Familiar Genre"
            subtitle="Select a genre you already know and enjoy"
          />
        );

      case 'audio-familiar':
        const familiarSongs = getSongsByGenre(selectedGenres.familiar || '');
        const familiarSong = getCurrentSong();
        const familiarGenre = experimentConfig.genres.find(g => g.id === selectedGenres.familiar);
        
        if (!familiarSong || !familiarGenre) return null;
        
        return (
          <AudioPlayerScreen
            song={familiarSong}
            genre={familiarGenre}
            currentSongIndex={currentSongIndex}
            totalSongs={familiarSongs.length}
            onNextSong={nextSong}
            onPreviousSong={prevSong}
            onComplete={nextStep}
            onBack={prevStep}
            hasNextSong={currentSongIndex < familiarSongs.length - 1}
            hasPreviousSong={currentSongIndex > 0}
          />
        );

      case 'survey-familiar':
        return (
          <SurveyScreen
            questions={experimentConfig.surveys.postListening.questions}
            responses={responses}
            onAnswer={saveResponse}
            onNext={nextStep}
            onBack={prevStep}
            title="Your Listening Experience"
          />
        );

      case 'genre-unfamiliar':
        return (
          <GenreSelectionScreen
            genres={experimentConfig.genres}
            selectedGenre={selectedGenres.unfamiliar}
            onSelectGenre={(genreId) => selectGenre(genreId, 'unfamiliar')}
            onStart={nextStep}
            onBack={prevStep}
            title="Choose an Unfamiliar Genre"
            subtitle="Select a genre you're less familiar with"
            disabledGenres={selectedGenres.familiar ? [selectedGenres.familiar] : []}
          />
        );

      case 'audio-unfamiliar':
        const unfamiliarSongs = getSongsByGenre(selectedGenres.unfamiliar || '');
        const unfamiliarSong = getCurrentSong();
        const unfamiliarGenre = experimentConfig.genres.find(g => g.id === selectedGenres.unfamiliar);
        
        if (!unfamiliarSong || !unfamiliarGenre) {
          // Reset song index and try again
          return <div>Loading...</div>;
        }
        
        return (
          <AudioPlayerScreen
            song={unfamiliarSong}
            genre={unfamiliarGenre}
            currentSongIndex={currentSongIndex}
            totalSongs={unfamiliarSongs.length}
            onNextSong={nextSong}
            onPreviousSong={prevSong}
            onComplete={nextStep}
            onBack={prevStep}
            hasNextSong={currentSongIndex < unfamiliarSongs.length - 1}
            hasPreviousSong={currentSongIndex > 0}
          />
        );

      case 'survey-unfamiliar':
        return (
          <SurveyScreen
            questions={experimentConfig.surveys.postListening.questions}
            responses={responses}
            onAnswer={saveResponse}
            onNext={nextStep}
            onBack={prevStep}
            title="Your Listening Experience"
          />
        );

      case 'final-survey':
        console.log('Final survey questions:', experimentConfig.surveys.final.questions);
        return (
          <SurveyScreen
            questions={experimentConfig.surveys.final.questions}
            responses={responses}
            onAnswer={saveResponse}
            onNext={nextStep}
            onBack={prevStep}
            title={experimentConfig.surveys.final.title}
          />
        );

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
