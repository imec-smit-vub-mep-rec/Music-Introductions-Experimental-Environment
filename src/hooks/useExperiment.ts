'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ExperimentState, Question, Song, AnswerValue } from '@/lib/types';
import { experimentSteps, getSongsByGenre } from '@/lib/config';
import { 
  getSession, 
  saveSession, 
  createNewSession, 
  updateSessionGenre, 
  updateSessionOnboardingAnswers,
  updateSessionRandomizedSongs,
  addSongSession,
  updateSongSession,
  syncSessionToRemote,
  SessionData
} from '@/lib/session';
import { randomizeSongsForGenre, randomizeIntroductions } from '@/lib/randomization';

const initialState: ExperimentState = {
  currentStep: 0,
  responses: {},
  selectedGenre: null,
  currentSongIndex: 0,
  randomizedSongs: [],
  randomizedIntroductions: [],
  currentQuestionIndex: 0,
};

export function useExperiment() {
  const [state, setState] = useState<ExperimentState>(initialState);
  // localStorage as single source of truth
  const sessionRef = useRef<SessionData | null>(null);

  // Helper function to get current session from localStorage
  const getCurrentSession = useCallback((): SessionData | null => {
    return getSession();
  }, []);

  // Load session on mount
  useEffect(() => {
    const existingSession = getSession();
    if (existingSession) {
      sessionRef.current = existingSession;
      setState(prev => ({
        ...prev,
        selectedGenre: existingSession.chosen_genre,
        randomizedSongs: existingSession.randomized_songs || [],
        randomizedIntroductions: existingSession.randomized_introductions || [],
        responses: existingSession.answers.onboarding,
      }));
    }
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => {
      const newStep = Math.min(prev.currentStep + 1, experimentSteps.length - 1);
      const newStepName = experimentSteps[newStep];
      
      // Auto-increment song index when moving to next audio step
      let newSongIndex = prev.currentSongIndex;
      if (newStepName === 'audio-song-2' && prev.currentSongIndex === 0) {
        newSongIndex = 1;
      } else if (newStepName === 'audio-song-3' && prev.currentSongIndex === 1) {
        newSongIndex = 2;
      }
      
      console.log('🔄 STEP PROGRESSION:', {
        from_step: experimentSteps[prev.currentStep],
        to_step: newStepName,
        from_song_index: prev.currentSongIndex,
        to_song_index: newSongIndex,
        timestamp: new Date().toISOString()
      });
      
      return {
        ...prev,
        currentStep: newStep,
        currentSongIndex: newSongIndex,
      };
    });

    // Sync to remote database on step change
    syncSessionToRemote().catch(error => {
      console.error('❌ STEP SYNC FAILED:', error);
    });
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => {
      const newStep = Math.max(prev.currentStep - 1, 0);
      const newStepName = experimentSteps[newStep];
      
      // Auto-decrement song index when moving to previous audio step
      let newSongIndex = prev.currentSongIndex;
      if (newStepName === 'audio-song-1' && prev.currentSongIndex === 1) {
        newSongIndex = 0;
      } else if (newStepName === 'audio-song-2' && prev.currentSongIndex === 2) {
        newSongIndex = 1;
      }
      
      console.log('🔄 STEP REVERSAL:', {
        from_step: experimentSteps[prev.currentStep],
        to_step: newStepName,
        from_song_index: prev.currentSongIndex,
        to_song_index: newSongIndex,
        timestamp: new Date().toISOString()
      });
      
      return {
        ...prev,
        currentStep: newStep,
        currentSongIndex: newSongIndex,
      };
    });

    // Sync to remote database on step change
    syncSessionToRemote().catch(error => {
      console.error('❌ STEP SYNC FAILED:', error);
    });
  }, []);

  const goToStep = useCallback((stepIndex: number) => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(0, Math.min(stepIndex, experimentSteps.length - 1)),
    }));

    // Sync to remote database on step change
    syncSessionToRemote().catch(error => {
      console.error('❌ STEP SYNC FAILED:', error);
    });
  }, []);

  const saveResponse = useCallback((questionId: string, answer: AnswerValue) => {
    setState(prev => ({
      ...prev,
      responses: {
        ...prev.responses,
        [questionId]: answer,
      },
    }));
    
    // Save to session
    const currentSession = getCurrentSession();
    if (currentSession) {
      console.log('📝 SAVING ONBOARDING ANSWERS:', {
        session_id: currentSession.session_id,
        question_id: questionId,
        answer: answer,
        timestamp: new Date().toISOString()
      });
      const updatedAnswers = { ...currentSession.answers.onboarding, [questionId]: answer };
      updateSessionOnboardingAnswers(updatedAnswers);
    } else {
      console.warn('⚠️ COULD NOT SAVE ONBOARDING ANSWERS: NO SESSION FOUND');
    }
  }, [getCurrentSession]);

  const selectGenre = useCallback((genreId: string) => {
    // Randomize songs and introductions for this genre
    const songs = getSongsByGenre(genreId);
    const songIds = songs.map(song => song.id);
    const randomizedSongs = randomizeSongsForGenre(songIds);
    const randomizedIntroductions = randomizeIntroductions();
    
    console.log('🎯 GENRE SELECTION COMPLETE:', {
      selected_genre: genreId,
      available_songs: songIds,
      randomized_songs: randomizedSongs,
      randomized_introductions: randomizedIntroductions,
      timestamp: new Date().toISOString()
    });
    
    setState(prev => ({
      ...prev,
      selectedGenre: genreId,
      currentSongIndex: 0,
      randomizedSongs,
      randomizedIntroductions,
    }));
    
    // Update session
    updateSessionGenre(genreId);
    updateSessionRandomizedSongs(randomizedSongs, randomizedIntroductions);

    // Sync to remote database after genre selection
    syncSessionToRemote().catch(error => {
      console.error('❌ GENRE SELECTION SYNC FAILED:', error);
    });
  }, []);

  const getCurrentStep = useCallback(() => {
    return experimentSteps[state.currentStep];
  }, [state.currentStep]);

  const getCurrentSong = useCallback(() => {
    console.log('🔍 GET CURRENT SONG DEBUG:', {
      selectedGenre: state.selectedGenre,
      randomizedSongsLength: state.randomizedSongs.length,
      randomizedSongs: state.randomizedSongs,
      currentSongIndex: state.currentSongIndex,
      timestamp: new Date().toISOString()
    });
    
    if (!state.selectedGenre || state.randomizedSongs.length === 0) {
      console.log('❌ GET CURRENT SONG FAILED:', {
        reason: !state.selectedGenre ? 'No selected genre' : 'No randomized songs',
        selectedGenre: state.selectedGenre,
        randomizedSongsLength: state.randomizedSongs.length
      });
      return null;
    }
    
    const songs = getSongsByGenre(state.selectedGenre);
    const currentSongId = state.randomizedSongs[state.currentSongIndex];
    const currentSong = songs.find(song => song.id === currentSongId) || null;
    
    if (currentSong) {
      const introductionStyle = getCurrentIntroductionStyle();
      console.log('🎵 CURRENT SONG LOADED:', {
        song_id: currentSong.id,
        song_title: currentSong.title,
        song_artist: currentSong.artist,
        song_index: state.currentSongIndex,
        introduction_style: introductionStyle,
        total_songs: state.randomizedSongs.length,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('❌ SONG NOT FOUND:', {
        currentSongId,
        availableSongs: songs.map(s => s.id),
        randomizedSongs: state.randomizedSongs,
        currentSongIndex: state.currentSongIndex
      });
    }
    
    return currentSong;
  }, [state.selectedGenre, state.randomizedSongs, state.currentSongIndex]);

  const getCurrentIntroductionStyle = useCallback(() => {
    if (state.randomizedIntroductions.length === 0) return 'no_introduction';
    return state.randomizedIntroductions[state.currentSongIndex] as 'no_introduction' | 'informative_introduction' | 'immersive_introduction';
  }, [state.randomizedIntroductions, state.currentSongIndex]);

  const getCurrentSongNumber = useCallback(() => {
    return state.currentSongIndex + 1;
  }, [state.currentSongIndex]);

  const isLastSong = useCallback(() => {
    return state.currentSongIndex >= 2; // 0-indexed, so 2 is the last song
  }, [state.currentSongIndex]);

  const nextSong = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentSongIndex: Math.min(prev.currentSongIndex + 1, 2),
    }));
  }, []);

  const goToNextSong = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentSongIndex: Math.min(prev.currentSongIndex + 1, 2),
    }));
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

  const saveSongAnswers = useCallback((answers: Record<string, AnswerValue>) => {
    const currentSession = getCurrentSession();
    if (!currentSession || !state.selectedGenre) return;
    
    const currentSong = getCurrentSong();
    if (!currentSong) return;
    
    console.log('📊 SONG SURVEY ANSWERS SAVED:', {
      session_id: currentSession.session_id,
      song_id: currentSong.id,
      song_title: currentSong.title,
      introduction_style: getCurrentIntroductionStyle(),
      answers: answers,
      answers_count: Object.keys(answers).length,
      song_number: state.currentSongIndex + 1,
      timestamp: new Date().toISOString()
    });
    
    // Update the existing song session with the survey answers
    updateSongSession(currentSong.id, {
      answers
    });

    // Sync to remote database after saving song answers
    syncSessionToRemote().catch(error => {
      console.error('❌ SONG ANSWERS SYNC FAILED:', error);
    });
  }, [getCurrentSession, state.selectedGenre, getCurrentSong, getCurrentIntroductionStyle, state.currentSongIndex]);

  const trackSongSkip = useCallback((skippedAtMs: number) => {
    const currentSession = getCurrentSession();
    if (!currentSession) return;
    
    const currentSong = getCurrentSong();
    if (!currentSong) return;
    
    const introStyle = getCurrentIntroductionStyle();
    
    console.log('⏭️ TRACKING SONG SKIP:', {
      session_id: currentSession.session_id,
      song_id: currentSong.id,
      song_title: currentSong.title,
      skipped_at_ms: skippedAtMs,
      introduction_style: introStyle,
      timestamp: new Date().toISOString()
    });
    
    updateSongSession(currentSong.id, {
      introduction_style: introStyle,
      skipped: true,
      skipped_at_ms: skippedAtMs
    });

    // Sync to remote database after tracking skip
    syncSessionToRemote().catch(error => {
      console.error('❌ SONG SKIP SYNC FAILED:', error);
    });
  }, [getCurrentSession, getCurrentSong, getCurrentIntroductionStyle]);

  const trackSongCompletion = useCallback((listeningTimeMs: number) => {
    const currentSession = getCurrentSession();
    if (!currentSession) return;
    
    const currentSong = getCurrentSong();
    if (!currentSong) return;
    
    console.log('✅ TRACKING SONG COMPLETION:', {
      session_id: currentSession.session_id,
      song_id: currentSong.id,
      song_title: currentSong.title,
      listening_time_ms: listeningTimeMs,
      timestamp: new Date().toISOString()
    });
    
    updateSongSession(currentSong.id, {
      listening_time_ms: listeningTimeMs
    });

    // Sync to remote database after tracking completion
    syncSessionToRemote().catch(error => {
      console.error('❌ SONG COMPLETION SYNC FAILED:', error);
    });
  }, [getCurrentSession, getCurrentSong]);

  const clearResponses = useCallback(() => {
    setState(prev => ({
      ...prev,
      responses: {},
    }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
    sessionRef.current = null;
  }, []);

  return {
    // State
    currentStep: state.currentStep,
    currentStepName: getCurrentStep(),
    responses: state.responses,
    selectedGenre: state.selectedGenre,
    currentSongIndex: state.currentSongIndex,
    currentQuestionIndex: state.currentQuestionIndex,
    session: getCurrentSession(),
    
    // Navigation
    nextStep,
    prevStep,
    goToStep,
    
    // Responses
    saveResponse,
    saveSongAnswers,
    clearResponses,
    
    // Genre selection
    selectGenre,
    
    // Audio
    nextSong,
    prevSong,
    getCurrentSong,
    getCurrentIntroductionStyle,
    getCurrentSongNumber,
    isLastSong,
    trackSongSkip,
    trackSongCompletion,
    
    // Questions
    nextQuestion,
    prevQuestion,
    resetQuestionIndex,
    
    // Utilities
    reset,
  };
}
