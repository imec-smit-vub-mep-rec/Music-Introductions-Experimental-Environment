'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ExperimentState, AnswerValue } from '@/lib/types';
import { experimentSteps, getSongsByGenre } from '@/lib/config';
import { 
  getSession, 
  saveSession, 
  createNewSession, 
  updateSessionGenre, 
  updateSessionOnboardingAnswers,
  updateSessionRandomizedSongs,
  updateSongSession,
  syncSessionToRemote,
  updateExperimentCompletionStatus,
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

  // Helper function to safely sync session to remote
  const safeSyncSession = useCallback(() => {
    const currentSession = getCurrentSession();
    if (currentSession) {
      syncSessionToRemote().catch(error => {
        console.error('❌ SESSION SYNC FAILED:', error);
      });
    }
  }, [getCurrentSession]);

  // Load session on mount (do NOT reload on every step change)
  useEffect(() => {
    const existingSession = getSession();
    if (existingSession) {
      sessionRef.current = existingSession;
      
      // If we're at the very beginning (welcome or terms), don't load previous session data
      // This ensures fresh starts don't show previous answers
      const currentStepName = experimentSteps[state.currentStep];
      const isAtBeginning = currentStepName === 'welcome' || currentStepName === 'terms';
      
      if (isAtBeginning) {
        console.log('🆕 AT EXPERIMENT BEGINNING - NOT LOADING PREVIOUS SESSION DATA');
        setState(prev => ({
          ...prev,
          selectedGenre: null,
          randomizedSongs: [],
          randomizedIntroductions: [],
          responses: {}, // Start with empty responses
        }));
      } else {
        // We're continuing an existing experiment, load the data
        setState(prev => ({
          ...prev,
          selectedGenre: existingSession.chosen_genre,
          randomizedSongs: existingSession.randomized_songs || [],
          randomizedIntroductions: existingSession.randomized_introductions || [],
          responses: existingSession.answers.onboarding,
        }));
        
        console.log('🔄 CONTINUING EXISTING EXPERIMENT:', {
          session_id: existingSession.session_id,
          current_step: currentStepName,
          chosen_genre: existingSession.chosen_genre,
          onboarding_answers_count: Object.keys(existingSession.answers.onboarding).length,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // Clear any existing state if no session found
      setState(initialState);
      sessionRef.current = null;
    }
  }, [state.currentStep]);

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
      
      // Clear responses when transitioning to any song survey
      // This ensures each song survey starts fresh
      const isTransitioningToSongSurvey = newStepName.startsWith('survey-song-');
      
      console.log('🔄 STEP PROGRESSION:', {
        from_step: experimentSteps[prev.currentStep],
        to_step: newStepName,
        from_song_index: prev.currentSongIndex,
        to_song_index: newSongIndex,
        is_transitioning_to_song_survey: isTransitioningToSongSurvey,
        timestamp: new Date().toISOString()
      });
      
      // If moving into a song survey, drop any in-memory responses before render
      const nextResponses = isTransitioningToSongSurvey ? {} : prev.responses;
      return {
        ...prev,
        currentStep: newStep,
        currentSongIndex: newSongIndex,
        responses: nextResponses,
      };
    });

    // Sync to remote database on step change
    safeSyncSession();
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
      
      // Clear responses when transitioning to any song survey
      const isTransitioningToSongSurvey = newStepName.startsWith('survey-song-');
      
      console.log('🔄 STEP REVERSAL:', {
        from_step: experimentSteps[prev.currentStep],
        to_step: newStepName,
        from_song_index: prev.currentSongIndex,
        to_song_index: newSongIndex,
        is_transitioning_to_song_survey: isTransitioningToSongSurvey,
        timestamp: new Date().toISOString()
      });
      
      return {
        ...prev,
        currentStep: newStep,
        currentSongIndex: newSongIndex,
        // Clear responses when transitioning to any song survey
        responses: isTransitioningToSongSurvey ? {} : prev.responses,
      };
    });

    // Sync to remote database on step change
    safeSyncSession();
  }, []);

  const goToStep = useCallback((stepIndex: number) => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(0, Math.min(stepIndex, experimentSteps.length - 1)),
    }));

    // Sync to remote database on step change
    safeSyncSession();
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
      
      // Check if experiment is now complete
      updateExperimentCompletionStatus();
    } else {
      console.warn('⚠️ COULD NOT SAVE ONBOARDING ANSWERS: NO SESSION FOUND');
    }
  }, [getCurrentSession]);

  // Local-only response setter (does not touch session). Use for song surveys.
  const setLocalResponse = useCallback((questionId: string, answer: AnswerValue) => {
    setState(prev => ({
      ...prev,
      responses: {
        ...prev.responses,
        [questionId]: answer,
      },
    }));
  }, []);

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
    safeSyncSession();
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

    // Check if experiment is now complete
    updateExperimentCompletionStatus();

    // Sync to remote database after saving song answers
    safeSyncSession();
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
    safeSyncSession();
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
    safeSyncSession();
  }, [getCurrentSession, getCurrentSong]);

  const clearResponses = useCallback(() => {
    setState(prev => ({
      ...prev,
      responses: {},
    }));
  }, []);

  const clearAllSurveyData = useCallback(() => {
    setState(prev => ({
      ...prev,
      responses: {},
      currentQuestionIndex: 0,
    }));
    console.log('🧹 ALL SURVEY DATA CLEARED');
  }, []);

  const forceClearSession = useCallback(() => {
    // Clear localStorage session
    if (typeof window !== 'undefined') {
      localStorage.removeItem('serendipity_session');
    }
    
    // Reset state to initial
    setState(initialState);
    sessionRef.current = null;
    
    console.log('🧹 SESSION FORCE CLEARED');
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
    sessionRef.current = null;
  }, []);

  const startNewSession = useCallback(async () => {
    // Clear any existing session data
    setState(initialState);
    sessionRef.current = null;
    
    // Create a new session
    try {
      const newSession = await createNewSession();
      saveSession(newSession);
      sessionRef.current = newSession;
      
      console.log('🆕 NEW SESSION STARTED:', {
        session_id: newSession.session_id,
        group: newSession.group,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ FAILED TO CREATE NEW SESSION:', error);
    }
  }, []);

  const getExperimentCompleted = useCallback(() => {
    const currentSession = getCurrentSession();
    return currentSession?.experiment_completed || false;
  }, [getCurrentSession]);

  return {
    // State
    currentStep: state.currentStep,
    currentStepName: getCurrentStep(),
    responses: state.responses,
    selectedGenre: state.selectedGenre,
    currentSongIndex: state.currentSongIndex,
    currentQuestionIndex: state.currentQuestionIndex,
    session: getCurrentSession(),
    experimentCompleted: getExperimentCompleted(),
    
    // Navigation
    nextStep,
    prevStep,
    goToStep,
    
    // Responses
    saveResponse,
    saveSongAnswers,
    clearResponses,
    setLocalResponse,
    clearAllSurveyData,
    
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
    startNewSession,
    forceClearSession,
  };
}
