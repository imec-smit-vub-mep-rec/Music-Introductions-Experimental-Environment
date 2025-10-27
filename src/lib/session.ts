"use client";

import { AnswerValue } from "./types";

export type SessionGroup = "unfamiliar" | "familiar";
export type IntroductionStyle =
  | "no_introduction"
  | "informative_introduction"
  | "immersive_introduction";

export interface SongSession {
  songId: string;
  introduction_style: IntroductionStyle;
  answers: Record<string, AnswerValue>;
  skipped: boolean;
  skipped_at_ms: number | null;
  listening_time_ms: number;
  liked: boolean | null; // null = no rating, true = liked, false = no like
  liked_at_ms: number | null; // timestamp when like was recorded
  dislike: boolean | null; // null = no rating, true = disliked, false = no dislike
  dislike_at_ms: number | null; // timestamp when dislike was recorded
}

export interface EngagementInteraction {
  page: string;
  type: string;
  timestamp: number;
  data?: unknown;
}

export interface SessionData {
  session_id: number;
  group: SessionGroup;
  chosen_genre: string | null;
  randomized_songs: string[];
  randomized_introductions: IntroductionStyle[];
  start_time: string;
  experiment_completed: boolean;
  answers: {
    onboarding: Record<string, AnswerValue>;
    demographics: Record<string, AnswerValue>;
    final: Record<string, AnswerValue>;
    songs: SongSession[];
  };
  engagement_metrics: {
    page_times: Record<string, number>;
    interactions: EngagementInteraction[];
  };
  qualtrics_response_id?: string; // Track Qualtrics response ID for updates
}

const SESSION_STORAGE_KEY = "serendipity_session";

export function generateSessionId(ipAddress?: string): number {
  const timestamp = Date.now();
  
  if (!ipAddress) {
    // Fallback to timestamp only if no IP is provided
    return timestamp;
  }
  
  // Create a hash combining timestamp and IP address
  // Convert IP to a numeric value for hashing
  const ipHash = ipAddress.split('.').reduce((acc, octet) => {
    return acc * 256 + parseInt(octet, 10);
  }, 0);
  
  // Combine timestamp with IP hash to create unique ID
  // Use bitwise operations to mix the values
  const combined = timestamp ^ (ipHash << 16) ^ (ipHash >>> 16);
  
  // Ensure we return a positive number
  return Math.abs(combined);
}

export function generateRandomGroup(): SessionGroup {
  return Math.random() < 0.5 ? "unfamiliar" : "familiar";
}

export async function createNewSession(): Promise<SessionData> {
  let clientIp: string | undefined;
  
  try {
    // Fetch client IP address
    const response = await fetch('/api/client-ip');
    const data = await response.json();
    clientIp = data.ip;
  } catch (error) {
    console.warn('Could not fetch client IP, using timestamp-only session ID:', error);
  }
  
  const sessionId = generateSessionId(clientIp);
  const group = generateRandomGroup();

  const session = {
    session_id: sessionId,
    group: group,
    chosen_genre: null,
    randomized_songs: [],
    randomized_introductions: [],
    start_time: new Date().toISOString(),
    experiment_completed: false,
    answers: {
      onboarding: {}, // Always start with empty onboarding answers
      demographics: {}, // Always start with empty demographics answers
      final: {}, // Always start with empty final answers
      songs: [],
    },
    engagement_metrics: {
      page_times: {},
      interactions: [],
    },
  };

  console.log("🎯 NEW SESSION CREATED:", {
    session_id: sessionId,
    group: group,
    client_ip: clientIp,
    timestamp: new Date().toISOString(),
  });

  return session;
}

export function getSession(): SessionData | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;
    
    const session = JSON.parse(stored);
    
    // Migrate existing sessions to include experiment_completed property
    if (session && typeof session.experiment_completed === 'undefined') {
      session.experiment_completed = false;
      console.log("🔄 MIGRATING SESSION TO INCLUDE EXPERIMENT_COMPLETED:", {
        session_id: session.session_id,
        timestamp: new Date().toISOString(),
      });
      saveSession(session);
    }
    
    return session;
  } catch (error) {
    console.error("Error loading session from localStorage:", error);
    return null;
  }
}

export function saveSession(session: SessionData): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    console.log("💾 SESSION SAVED TO LOCALSTORAGE:", {
      session_id: session.session_id,
      group: session.group,
      chosen_genre: session.chosen_genre,
      songs_count: session.answers.songs.length,
      onboarding_answers: Object.keys(session.answers.onboarding).length,
      interactions_count: session.engagement_metrics.interactions.length,
      timestamp: new Date().toISOString(),
    });

    // Note: Remote sync is now handled separately for efficiency
  } catch (error) {
    console.error("Error saving session to localStorage:", error);
  }
}

export function updateSessionGenre(genre: string): void {
  const session = getSession();
  if (session) {
    session.chosen_genre = genre;
    console.log("🎵 GENRE SELECTED:", {
      session_id: session.session_id,
      selected_genre: genre,
      group: session.group,
      timestamp: new Date().toISOString(),
    });
    saveSession(session);
  }
}

export function updateSessionRandomizedSongs(
  randomizedSongs: string[],
  randomizedIntroductions: IntroductionStyle[]
): void {
  const session = getSession();
  if (session) {
    session.randomized_songs = randomizedSongs;
    session.randomized_introductions = randomizedIntroductions;
    console.log("🎲 RANDOMIZED SONGS UPDATED:", {
      session_id: session.session_id,
      randomized_songs: randomizedSongs,
      randomized_introductions: randomizedIntroductions,
      timestamp: new Date().toISOString(),
    });
    saveSession(session);
  }
}

export function updateSessionOnboardingAnswers(
  answers: Record<string, AnswerValue>
): void {
  const session = getSession();
  if (session) {
    session.answers.onboarding = answers;
    console.log("📝 ONBOARDING ANSWERS UPDATED:", {
      session_id: session.session_id,
      answers_count: Object.keys(answers).length,
      answers: answers,
      timestamp: new Date().toISOString(),
    });
    saveSession(session);
  } else {
    console.warn("⚠️ Could not update onboarding answers. No session found.");
  }
}

export function updateSessionDemographicsAnswers(
  answers: Record<string, AnswerValue>
): void {
  const session = getSession();
  if (session) {
    session.answers.demographics = answers;
    console.log("📝 DEMOGRAPHICS ANSWERS UPDATED:", {
      session_id: session.session_id,
      answers_count: Object.keys(answers).length,
      answers: answers,
      timestamp: new Date().toISOString(),
    });
    saveSession(session);
  } else {
    console.warn("⚠️ Could not update demographics answers. No session found.");
  }
}

export function updateSessionFinalAnswers(
  answers: Record<string, AnswerValue>
): void {
  const session = getSession();
  if (session) {
    session.answers.final = answers;
    console.log("📝 FINAL ANSWERS UPDATED:", {
      session_id: session.session_id,
      answers_count: Object.keys(answers).length,
      answers: answers,
      timestamp: new Date().toISOString(),
    });
    saveSession(session);
  } else {
    console.warn("⚠️ Could not update final answers. No session found.");
  }
}

export function addSongSession(songSession: SongSession): void {
  const session = getSession();
  if (session) {
    // Ensure dislike fields are initialized if not provided
    const newSongSession: SongSession = {
      ...songSession,
      dislike: songSession.dislike ?? null,
      dislike_at_ms: songSession.dislike_at_ms ?? null,
    };
    
    session.answers.songs.push(newSongSession);
    console.log("🎶 SONG SESSION ADDED:", {
      session_id: session.session_id,
      song_id: songSession.songId,
      introduction_style: songSession.introduction_style,
      skipped: songSession.skipped,
      skipped_at_ms: songSession.skipped_at_ms,
      listening_time_ms: songSession.listening_time_ms,
      answers_count: Object.keys(songSession.answers).length,
      total_songs: session.answers.songs.length,
      timestamp: new Date().toISOString(),
    });
    saveSession(session);
  }
}

export function updateSongSession(
  songId: string,
  updates: Partial<SongSession>
): void {
  const session = getSession();
  if (session) {
    const songIndex = session.answers.songs.findIndex(
      (song) => song.songId === songId
    );
    if (songIndex !== -1) {
      session.answers.songs[songIndex] = {
        ...session.answers.songs[songIndex],
        ...updates,
      };
      console.log("🎵 SONG SESSION UPDATED:", {
        session_id: session.session_id,
        song_id: songId,
        updates: updates,
        timestamp: new Date().toISOString(),
      });
      saveSession(session);
    } else {
      console.warn("⚠️ SONG SESSION NOT FOUND, CREATING NEW ONE:", {
        session_id: session.session_id,
        song_id: songId,
        updates: updates,
        timestamp: new Date().toISOString(),
      });
      // Create a new song session with the updates
      const newSongSession: SongSession = {
        songId: songId,
        introduction_style: "no_introduction", // Default, will be overridden if provided in updates
        answers: {},
        skipped: false,
        skipped_at_ms: null,
        listening_time_ms: 0,
        liked: null,
        liked_at_ms: null,
        dislike: null,
        dislike_at_ms: null,
        ...updates,
      };
      addSongSession(newSongSession);
    }
  }
}

export function updateSongLikeStatus(
  songId: string,
  liked: boolean | null
): void {
  const session = getSession();
  if (session) {
    const songIndex = session.answers.songs.findIndex(
      (song) => song.songId === songId
    );
    if (songIndex !== -1) {
      session.answers.songs[songIndex] = {
        ...session.answers.songs[songIndex],
        liked: liked,
        liked_at_ms: liked ? Date.now() : null,
        // Clear dislike when liking
        dislike: liked ? false : session.answers.songs[songIndex].dislike,
        dislike_at_ms: liked ? null : session.answers.songs[songIndex].dislike_at_ms,
      };
      console.log("👍 SONG LIKE STATUS UPDATED:", {
        session_id: session.session_id,
        song_id: songId,
        liked: liked,
        timestamp: new Date().toISOString(),
      });
      saveSession(session);
      
      // Also update in database immediately
      updateSongLikeStatusInDatabase(session.session_id, songId, liked);
    } else {
      console.warn("⚠️ SONG SESSION NOT FOUND FOR LIKE UPDATE:", {
        session_id: session.session_id,
        song_id: songId,
        liked: liked,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export function updateSongDislikeStatus(
  songId: string,
  dislike: boolean | null
): void {
  const session = getSession();
  if (session) {
    const songIndex = session.answers.songs.findIndex(
      (song) => song.songId === songId
    );
    if (songIndex !== -1) {
      session.answers.songs[songIndex] = {
        ...session.answers.songs[songIndex],
        dislike: dislike,
        dislike_at_ms: dislike ? Date.now() : null,
        // Clear like when disliking
        liked: dislike ? false : session.answers.songs[songIndex].liked,
        liked_at_ms: dislike ? null : session.answers.songs[songIndex].liked_at_ms,
      };
      console.log("👎 SONG DISLIKE STATUS UPDATED:", {
        session_id: session.session_id,
        song_id: songId,
        dislike: dislike,
        timestamp: new Date().toISOString(),
      });
      saveSession(session);
      
      // Also update in database immediately
      updateSongDislikeStatusInDatabase(session.session_id, songId, dislike);
    } else {
      console.warn("⚠️ SONG SESSION NOT FOUND FOR DISLIKE UPDATE:", {
        session_id: session.session_id,
        song_id: songId,
        dislike: dislike,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

// Helper function to update like status in database
async function updateSongLikeStatusInDatabase(
  sessionId: number,
  songId: string,
  liked: boolean | null
): Promise<void> {
  try {
    const response = await fetch('/api/session/like', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        song_id: songId,
        liked: liked,
      }),
    });

    if (!response.ok) {
      throw new Error(`Like status update failed: ${response.statusText}`);
    }

    console.log('✅ SONG LIKE STATUS SYNCED TO DATABASE:', {
      session_id: sessionId,
      song_id: songId,
      liked: liked,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ DATABASE LIKE STATUS UPDATE FAILED:', error);
    // Session is still saved locally, so user experience isn't affected
  }
}

// Helper function to update dislike status in database
async function updateSongDislikeStatusInDatabase(
  sessionId: number,
  songId: string,
  dislike: boolean | null
): Promise<void> {
  try {
    const response = await fetch('/api/session/dislike', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        song_id: songId,
        dislike: dislike,
      }),
    });

    if (!response.ok) {
      throw new Error(`Dislike status update failed: ${response.statusText}`);
    }

    console.log('✅ SONG DISLIKE STATUS SYNCED TO DATABASE:', {
      session_id: sessionId,
      song_id: songId,
      dislike: dislike,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ DATABASE DISLIKE STATUS UPDATE FAILED:', error);
    // Session is still saved locally, so user experience isn't affected
  }
}

export function updatePageTime(page: string, timeSpent: number): void {
  const session = getSession();
  if (session) {
    const previous = session.engagement_metrics.page_times[page] || 0;
    session.engagement_metrics.page_times[page] = previous + timeSpent;
    saveSession(session);
  }
}

export function addInteraction(interaction: EngagementInteraction): void {
  const session = getSession();
  if (session) {
    session.engagement_metrics.interactions.push(interaction);
    console.log("🖱️ INTERACTION TRACKED:", {
      session_id: session.session_id,
      page: interaction.page,
      type: interaction.type,
      timestamp: interaction.timestamp,
      data: interaction.data,
      total_interactions: session.engagement_metrics.interactions.length,
    });
    saveSession(session);
  }
}

export function markExperimentCompleted(): void {
  const session = getSession();
  if (session) {
    session.experiment_completed = true;
    console.log("✅ EXPERIMENT MARKED AS COMPLETED:", {
      session_id: session.session_id,
      timestamp: new Date().toISOString(),
    });
    saveSession(session);
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function updateQualtricsResponseId(responseId: string): void {
  const session = getSession();
  if (session) {
    session.qualtrics_response_id = responseId;
    console.log("📋 QUALTRICS RESPONSE ID UPDATED:", {
      session_id: session.session_id,
      response_id: responseId,
      timestamp: new Date().toISOString(),
    });
    saveSession(session);
  } else {
    console.warn("⚠️ Could not update Qualtrics response ID. No session found.");
  }
}

export function getQualtricsResponseId(): string | undefined {
  const session = getSession();
  return session?.qualtrics_response_id;
}

/**
 * Update final answers and sync to both Qualtrics and Neon DB
 * This function handles answer corrections by updating both systems
 */
export async function updateFinalAnswersWithSync(
  answers: Record<string, AnswerValue>
): Promise<{ success: boolean; error?: string }> {
  const session = getSession();
  if (!session) {
    return { success: false, error: 'No session found' };
  }

  try {
    // Update local session
    updateSessionFinalAnswers(answers);

    // Sync to Neon DB
    await syncSessionToRemote();

    // Update Qualtrics if we have a response ID
    const responseId = getQualtricsResponseId();
    if (responseId) {
      console.log("🔄 UPDATING QUALTRICS RESPONSE FOR ANSWER CORRECTION:", {
        session_id: session.session_id,
        response_id: responseId,
        answers_count: Object.keys(answers).length,
        timestamp: new Date().toISOString(),
      });

      const qualtricsResponse = await fetch('/api/qualtrics/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionData: session,
          finalAnswers: answers,
          existingResponseId: responseId,
        }),
      });

      if (!qualtricsResponse.ok) {
        console.error("❌ QUALTRICS UPDATE FAILED:", {
          session_id: session.session_id,
          status: qualtricsResponse.status,
          statusText: qualtricsResponse.statusText,
        });
        // Don't fail the entire operation if Qualtrics update fails
        // Data is still saved to Neon DB
      } else {
        const result = await qualtricsResponse.json();
        if (result.success) {
          console.log("✅ QUALTRICS RESPONSE UPDATED:", {
            session_id: session.session_id,
            response_id: result.responseId,
            timestamp: new Date().toISOString(),
          });
        } else {
          console.error("❌ QUALTRICS UPDATE RESULT FAILED:", {
            session_id: session.session_id,
            error: result.error,
          });
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error("❌ FINAL ANSWERS UPDATE FAILED:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export function hasCompletedSession(): boolean {
  const session = getSession();
  console.log("🔍 HAS COMPLETED SESSION DEBUG:", {
    session: session,
    answers_count: session?.answers.songs.length,
    timestamp: new Date().toISOString(),
  });
  return session !== null && session.answers.songs.length >= 3;
}

export function checkExperimentCompletion(): boolean {
  const session = getSession();
  if (!session) return false;

  // Check onboarding questions (personality and music preferences)
  const onboardingQuestions = [
    'QID1', 'QID13', 'QID14', 'QID15', 'QID16', 'QID17', 'QID18', 'QID19', 'QID20', // Imagination
    'QID37', 'QID38', 'QID39', 'QID40', 'QID41', // Cognitive engagement
    'QID42', 'QID49', 'QID51', 'QID50', 'QID6', // GMSI
    'QID21', 'QID22', 'QID23', 'QID24', 'QID25', 'QID26', 'QID27', 'QID28', 'QID29', 'QID30', // Intellect
    'QID32', 'QID33', 'QID34', 'QID35', 'QID36' // Emotional engagement
  ];
  const onboardingComplete = onboardingQuestions.every(questionId => 
    session.answers.onboarding[questionId] !== undefined && 
    session.answers.onboarding[questionId] !== null &&
    session.answers.onboarding[questionId] !== ''
  );

  // Check demographics questions (3 required questions)
  const demographicsQuestions = ['QID10', 'QID11', 'QID1218898227']; // Gender, Age, Country
  const demographicsComplete = demographicsQuestions.every(questionId => 
    session.answers.demographics[questionId] !== undefined && 
    session.answers.demographics[questionId] !== null &&
    session.answers.demographics[questionId] !== ''
  );

  // Check if we have 3 songs with complete postListening surveys
  const songsComplete = session.answers.songs.length === 3;
  const postListeningComplete = session.answers.songs.every(song => {
    // Each song should have answers for: enjoyment, familiarity, emotional_response, would_listen_again
    const requiredQuestions = ['enjoyment', 'familiarity', 'emotional_response', 'would_listen_again'];
    return requiredQuestions.every(questionId => 
      song.answers[questionId] !== undefined && 
      song.answers[questionId] !== null &&
      song.answers[questionId] !== ''
    );
  });

  // Check final survey questions (3 required questions)
  const finalQuestions = ['overall_experience', 'genre_preference', 'discovery_value'];
  const finalComplete = finalQuestions.every(questionId => {
    // Check if any song has this question answered (since final questions are answered per song)
    return session.answers.songs.some(song => 
      song.answers[questionId] !== undefined && 
      song.answers[questionId] !== null &&
      song.answers[questionId] !== ''
    );
  });

  const isComplete = onboardingComplete && demographicsComplete && songsComplete && postListeningComplete && finalComplete;
  
  console.log("🔍 EXPERIMENT COMPLETION CHECK:", {
    session_id: session.session_id,
    onboarding_complete: onboardingComplete,
    demographics_complete: demographicsComplete,
    songs_complete: songsComplete,
    post_listening_complete: postListeningComplete,
    final_complete: finalComplete,
    experiment_completed: isComplete,
    timestamp: new Date().toISOString(),
  });

  return isComplete;
}

export function updateExperimentCompletionStatus(): void {
  const session = getSession();
  if (!session) return;

  const isComplete = checkExperimentCompletion();
  if (session.experiment_completed !== isComplete) {
    session.experiment_completed = isComplete;
    console.log("✅ EXPERIMENT COMPLETION STATUS UPDATED:", {
      session_id: session.session_id,
      experiment_completed: isComplete,
      timestamp: new Date().toISOString(),
    });
    saveSession(session);
  }
}

// Sync session to remote database via API (called on page/step changes)
export async function syncSessionToRemote(): Promise<void> {
  const session = getSession();
  if (!session) {
    console.warn('⚠️ NO SESSION TO SYNC');
    return;
  }

  try {
    const response = await fetch('/api/session/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(session),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }

    console.log('✅ SESSION SYNCED TO REMOTE:', {
      session_id: session.session_id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ REMOTE SYNC FAILED:', error);
    // Session is still saved locally, so user experience isn't affected
  }
}
