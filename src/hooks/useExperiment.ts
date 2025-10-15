'use client';

import { useState, useCallback } from 'react';
import { ExperimentState, Question, Song } from '@/lib/types';
import { experimentSteps, getSongsByGenre } from '@/lib/config';

const initialState: ExperimentState = {
  currentStep: 0,
  responses: {},
  selectedGenres: {
    familiar: null,
    unfamiliar: null,
  },
  currentSongIndex: 0,
  songsPlayed: {
    familiar: 0,
    unfamiliar: 0,
  },
  currentQuestionIndex: 0,
};

export function useExperiment() {
  const [state, setState] = useState<ExperimentState>(initialState);

  const nextStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, experimentSteps.length - 1),
    }));
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }));
  }, []);

  const goToStep = useCallback((stepIndex: number) => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(0, Math.min(stepIndex, experimentSteps.length - 1)),
    }));
  }, []);

  const saveResponse = useCallback((questionId: string, answer: any) => {
    setState(prev => ({
      ...prev,
      responses: {
        ...prev.responses,
        [questionId]: answer,
      },
    }));
  }, []);

  const selectGenre = useCallback((genreId: string, type: 'familiar' | 'unfamiliar') => {
    setState(prev => ({
      ...prev,
      selectedGenres: {
        ...prev.selectedGenres,
        [type]: genreId,
      },
      currentSongIndex: 0,
    }));
  }, []);

  const nextSong = useCallback(() => {
    setState(prev => {
      const currentGenre = prev.selectedGenres.familiar || prev.selectedGenres.unfamiliar;
      if (!currentGenre) return prev;

      const songs = getSongsByGenre(currentGenre);
      const isFamiliar = prev.selectedGenres.familiar === currentGenre;
      const songsPlayedKey = isFamiliar ? 'familiar' : 'unfamiliar';
      
      if (prev.currentSongIndex < songs.length - 1) {
        return {
          ...prev,
          currentSongIndex: prev.currentSongIndex + 1,
        };
      } else {
        return {
          ...prev,
          songsPlayed: {
            ...prev.songsPlayed,
            [songsPlayedKey]: prev.songsPlayed[songsPlayedKey] + 1,
          },
          currentSongIndex: 0,
        };
      }
    });
  }, []);

  const prevSong = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentSongIndex: Math.max(0, prev.currentSongIndex - 1),
    }));
  }, []);

  const nextQuestion = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentQuestionIndex: prev.currentQuestionIndex + 1,
    }));
  }, []);

  const prevQuestion = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentQuestionIndex: Math.max(0, prev.currentQuestionIndex - 1),
    }));
  }, []);

  const resetQuestionIndex = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentQuestionIndex: 0,
    }));
  }, []);

  const getCurrentStep = useCallback(() => {
    return experimentSteps[state.currentStep];
  }, [state.currentStep]);

  const getCurrentGenre = useCallback(() => {
    const currentStep = getCurrentStep();
    if (currentStep === 'audio-familiar' || currentStep === 'survey-familiar') {
      return state.selectedGenres.familiar;
    }
    if (currentStep === 'audio-unfamiliar' || currentStep === 'survey-unfamiliar') {
      return state.selectedGenres.unfamiliar;
    }
    return null;
  }, [state.selectedGenres, getCurrentStep]);

  const getCurrentSongs = useCallback(() => {
    const genre = getCurrentGenre();
    return genre ? getSongsByGenre(genre) : [];
  }, [getCurrentGenre]);

  const getCurrentSong = useCallback(() => {
    const songs = getCurrentSongs();
    return songs[state.currentSongIndex] || null;
  }, [getCurrentSongs, state.currentSongIndex]);

  const isGenreSelected = useCallback((genreId: string, type: 'familiar' | 'unfamiliar') => {
    return state.selectedGenres[type] === genreId;
  }, [state.selectedGenres]);

  const canSelectGenre = useCallback((genreId: string, type: 'familiar' | 'unfamiliar') => {
    if (type === 'unfamiliar') {
      return state.selectedGenres.familiar !== genreId;
    }
    return true;
  }, [state.selectedGenres]);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    // State
    currentStep: state.currentStep,
    currentStepName: getCurrentStep(),
    responses: state.responses,
    selectedGenres: state.selectedGenres,
    currentSongIndex: state.currentSongIndex,
    songsPlayed: state.songsPlayed,
    currentQuestionIndex: state.currentQuestionIndex,
    
    // Navigation
    nextStep,
    prevStep,
    goToStep,
    
    // Responses
    saveResponse,
    
    // Genre selection
    selectGenre,
    isGenreSelected,
    canSelectGenre,
    
    // Audio
    nextSong,
    prevSong,
    getCurrentSong,
    getCurrentSongs,
    
    // Questions
    nextQuestion,
    prevQuestion,
    resetQuestionIndex,
    
    // Utilities
    getCurrentGenre,
    reset,
  };
}
