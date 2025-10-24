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
  answers: {
    onboarding: Record<string, AnswerValue>;
    songs: SongSession[];
  };
  engagement_metrics: {
    page_times: Record<string, number>;
    interactions: EngagementInteraction[];
  };
}

const SESSION_STORAGE_KEY = "serendipity_session";

export function generateSessionId(): number {
  return Date.now();
}

export function generateRandomGroup(): SessionGroup {
  return Math.random() < 0.5 ? "unfamiliar" : "familiar";
}

export function createNewSession(): SessionData {
  const sessionId = generateSessionId();
  const group = generateRandomGroup();

  const session = {
    session_id: sessionId,
    group: group,
    chosen_genre: null,
    randomized_songs: [],
    randomized_introductions: [],
    start_time: new Date().toISOString(),
    answers: {
      onboarding: {},
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
    timestamp: new Date().toISOString(),
  });

  return session;
}

export function getSession(): SessionData | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
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

export function addSongSession(songSession: SongSession): void {
  const session = getSession();
  if (session) {
    session.answers.songs.push(songSession);
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
        ...updates,
      };
      addSongSession(newSongSession);
    }
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

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_STORAGE_KEY);
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
