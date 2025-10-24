'use client';

import { useEffect, useRef, useCallback } from 'react';
import { addInteraction, updatePageTime } from '@/lib/session';

export interface EngagementTrackingOptions {
  page: string;
  trackClicks?: boolean;
  trackScrolls?: boolean;
  trackAudioInteractions?: boolean;
  trackPageTime?: boolean;
}

export function useEngagementTracking({
  page,
  trackClicks = true,
  trackScrolls = true,
  trackAudioInteractions = true,
  trackPageTime: shouldTrackPageTime = true
}: EngagementTrackingOptions) {
  const pageStartTime = useRef<number | null>(Date.now());
  const previousPageRef = useRef<string>(page);
  const lastScrollTime = useRef<number>(0);
  const scrollThrottle = 1000; // Track scrolls max once per second

  const trackInteraction = useCallback((type: string, data?: unknown) => {
    addInteraction({
      page,
      type,
      timestamp: Date.now(),
      data
    });
  }, [page]);

  const trackPageTime = useCallback(() => {
    if (!shouldTrackPageTime) return;
    if (pageStartTime.current !== null) {
      const timeSpent = Date.now() - pageStartTime.current;
      updatePageTime(previousPageRef.current, timeSpent);
      pageStartTime.current = Date.now();
      previousPageRef.current = page;
    }
  }, [page, shouldTrackPageTime]);

  // Track page time on unmount
  useEffect(() => {
    if (!shouldTrackPageTime) return;
    return () => {
      if (pageStartTime.current !== null) {
        const timeSpent = Date.now() - pageStartTime.current;
        updatePageTime(previousPageRef.current, timeSpent);
      }
    };
  }, [trackPageTime, shouldTrackPageTime]);

  // Handle page visibility changes to avoid counting hidden time
  useEffect(() => {
    if (!shouldTrackPageTime) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (pageStartTime.current !== null) {
          const timeSpent = Date.now() - pageStartTime.current;
          updatePageTime(previousPageRef.current, timeSpent);
          pageStartTime.current = null;
        }
      } else if (document.visibilityState === 'visible') {
        pageStartTime.current = Date.now();
        previousPageRef.current = page;
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleVisibility);
    };
  }, [page, shouldTrackPageTime]);

  // Reset timer when page name changes
  useEffect(() => {
    if (!shouldTrackPageTime) return;
    if (previousPageRef.current !== page) {
      if (pageStartTime.current !== null) {
        const timeSpent = Date.now() - pageStartTime.current;
        updatePageTime(previousPageRef.current, timeSpent);
      }
      previousPageRef.current = page;
      pageStartTime.current = Date.now();
    }
  }, [page, shouldTrackPageTime]);

  // Track clicks
  useEffect(() => {
    if (!trackClicks) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const buttonText = target.textContent || target.getAttribute('aria-label') || 'unknown';
      const elementType = target.tagName.toLowerCase();
      
      trackInteraction('click', {
        element: elementType,
        text: buttonText,
        x: event.clientX,
        y: event.clientY
      });
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [trackClicks, trackInteraction]);

  // Track scrolls (throttled)
  useEffect(() => {
    if (!trackScrolls) return;

    const handleScroll = () => {
      const now = Date.now();
      if (now - lastScrollTime.current > scrollThrottle) {
        lastScrollTime.current = now;
        trackInteraction('scroll', {
          scrollY: window.scrollY,
          scrollX: window.scrollX
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [trackScrolls, trackInteraction]);

  // Track audio player interactions
  const trackAudioInteraction = useCallback((type: string, data?: unknown) => {
    if (trackAudioInteractions) {
      trackInteraction(`audio_${type}`, data);
    }
  }, [trackAudioInteractions, trackInteraction]);

  // Track song skip
  const trackSongSkip = useCallback((songId: string, skippedAtMs: number) => {
    trackInteraction('song_skip', {
      songId,
      skippedAtMs,
      timestamp: Date.now()
    });
  }, [trackInteraction]);

  // Track song completion
  const trackSongCompletion = useCallback((songId: string, listeningTimeMs: number) => {
    trackInteraction('song_completion', {
      songId,
      listeningTimeMs,
      timestamp: Date.now()
    });
  }, [trackInteraction]);

  // Track play/pause
  const trackPlayPause = useCallback((isPlaying: boolean, songId?: string) => {
    trackAudioInteraction(isPlaying ? 'play' : 'pause', { songId });
  }, [trackAudioInteraction]);

  // Track seek
  const trackSeek = useCallback((fromTime: number, toTime: number, songId?: string) => {
    trackAudioInteraction('seek', {
      songId,
      fromTime,
      toTime,
      seekDistance: toTime - fromTime
    });
  }, [trackAudioInteraction]);

  return {
    trackAudioInteraction,
    trackSongSkip,
    trackSongCompletion,
    trackPlayPause,
    trackSeek,
    trackInteraction
  };
}
