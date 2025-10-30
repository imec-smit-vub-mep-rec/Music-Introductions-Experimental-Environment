"use client";

import { AnswerValue } from "./types";
import { validateSurveyCompletion } from "./utils";

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
  client_ip?: string; // Store client IP for session tracking
  referer?: string; // Store referer parameter from URL (?ref=value)
}

const SESSION_STORAGE_KEY = "serendipity_session";

// Global counter to ensure uniqueness even with rapid successive calls
let sessionCounter = 0;

export function getRefererFromURL(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const referer = urlParams.get('ref');
    return referer || undefined;
  } catch (error) {
    console.warn('Could not extract referer from URL:', error);
    return undefined;
  }
}

export function generateSessionId(ipAddress?: string): number {
  const timestamp = Date.now();
  
  // Increment global counter for additional uniqueness
  sessionCounter = (sessionCounter + 1) % 1000000; // Reset to prevent overflow
  
  // Generate a high-precision random component using crypto if available
  let randomComponent: number;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    // Use crypto.getRandomValues for better randomness in browser
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    randomComponent = array[0];
  } else {
    // Fallback to Math.random with higher precision
    randomComponent = Math.floor(Math.random() * 0xFFFFFFFF);
  }
  
  if (!ipAddress) {
    // Combine timestamp with high-precision random component and counter
    return timestamp + randomComponent + (sessionCounter * 1000);
  }
  
  // Create a hash combining timestamp and IP address
  // Convert IP to a numeric value for hashing
  const ipHash = ipAddress.split('.').reduce((acc, octet) => {
    return acc * 256 + parseInt(octet, 10);
  }, 0);
  
  // Combine timestamp with IP hash, random component, and counter to create unique ID
  // Use bitwise operations to mix the values
  const combined = timestamp ^ (ipHash << 16) ^ (ipHash >>> 16) ^ randomComponent ^ (sessionCounter << 8);
  
  // Ensure we return a positive number
  return Math.abs(combined);
}

export function generateRandomGroup(): SessionGroup {
  return Math.random() < 0.5 ? "unfamiliar" : "familiar";
}

export async function createNewSession(): Promise<SessionData> {
  let clientIp: string | undefined;
  let referer: string | undefined;
  
  try {
    // Fetch client IP address
    const response = await fetch('/api/client-ip');
    const data = await response.json();
    clientIp = data.ip;
    
    // Log IP for debugging (no need to check for existing sessions since we always create new ones)
    console.log('🌐 CLIENT IP DETECTED:', {
      ip_address: clientIp,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.warn('Could not fetch client IP, using timestamp-only session ID:', error);
  }
  
  // Extract referer from URL
  try {
    referer = getRefererFromURL();
    if (referer) {
      console.log('🔗 REFERER DETECTED:', {
        referer: referer,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.warn('Could not extract referer from URL:', error);
  }
  
  // Generate a unique session ID (simplified since we always create new sessions)
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
    client_ip: clientIp, // Store client IP for session tracking
    referer: referer, // Store referer parameter from URL
  };

  console.log("🎯 NEW SESSION CREATED:", {
    session_id: sessionId,
    group: group,
    client_ip: clientIp,
    referer: referer,
    counter: sessionCounter,
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

// Serialized sync queue to ensure ordered, non-overlapping remote writes
let syncQueue: Promise<void> = Promise.resolve();
let lastSyncError: unknown = null;

function enqueueSync(task: () => Promise<void>) {
  syncQueue = syncQueue
    .then(task)
    .catch(err => {
      lastSyncError = err;
    });
  return syncQueue;
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
  console.log("🧹 SESSION CLEARED FROM LOCALSTORAGE:", {
    timestamp: new Date().toISOString(),
  });
}

export async function clearAllSessionData(): Promise<void> {
  // Get current session before clearing (for logging only)
  const currentSession = getSession();
  
  // Only clear localStorage - NEVER delete from database
  clearSession();
  
  console.log('🧹 LOCAL SESSION DATA CLEARED (DATABASE PRESERVED):', {
    had_session: !!currentSession,
    session_id: currentSession?.session_id,
    client_ip: currentSession?.client_ip,
    referer: currentSession?.referer,
    message: 'Database sessions are preserved for multiple users per IP/device',
    timestamp: new Date().toISOString(),
  });
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
    const responseId = session.qualtrics_response_id;
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

  // Use the flexible validation functions instead of hardcoded QIDs
  const onboardingComplete = validateSurveyCompletion(session.answers.onboarding, 'onboarding');
  const demographicsComplete = validateSurveyCompletion(session.answers.demographics, 'demographics');
  const finalComplete = validateSurveyCompletion(session.answers.final, 'final');

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

  // Create an immutable snapshot to avoid mid-flight mutations
  const payload = JSON.parse(JSON.stringify(session));

  return enqueueSync(async () => {
    try {
      const response = await fetch('/api/session/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        // Helps complete syncs during rapid navigations/unloads
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
      }

      console.log('✅ SESSION SYNCED TO REMOTE:', {
        session_id: payload.session_id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Network aborts during rapid navigation often surface as TypeError: Failed to fetch
      if (message.includes('Failed to fetch')) {
        console.warn('⚠️ REMOTE SYNC ABORTED (navigation/change in-flight). Data is saved locally and will retry on next sync.');
        return; // swallow non-fatal aborts
      }
      console.error('❌ REMOTE SYNC FAILED:', error);
      // Session is still saved locally; allow next sync to proceed without throwing
    }
  });
}
