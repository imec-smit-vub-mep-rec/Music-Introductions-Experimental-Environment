'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Song, Genre, Transcript } from '@/lib/types';
import { LyricsDisplay } from '@/components/audio/LyricsDisplay';
import { cn } from '@/lib/utils';
import { updateSongLikeStatus, updateSongDislikeStatus } from '@/lib/session';

interface AudioPlayerProps {
  song: Song;
  genre: Genre;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  showLyrics?: boolean;
  transcript?: Transcript | null;
  currentTime?: number;
  isPlaying?: boolean;
  onExplanationComplete?: () => void;
  onComplete?: () => void;
  onSkip?: (skippedAtMs: number) => void;
  onSongComplete?: (listeningTimeMs: number) => void;
  onPlayPause?: (isPlaying: boolean) => void;
  onSeek?: (fromTime: number, toTime: number) => void;
  shouldAutoplay?: boolean;
}

export function AudioPlayer({ 
  song, 
  genre, 
  onNext, 
  onPrevious, 
  hasNext = false, 
  hasPrevious = false,
  onTimeUpdate,
  onPlayStateChange,
  showLyrics = false,
  transcript,
  currentTime: externalCurrentTime,
  isPlaying: externalIsPlaying,
  onExplanationComplete,
  onComplete,
  onSkip,
  onSongComplete,
  onPlayPause,
  onSeek,
  shouldAutoplay = true
}: AudioPlayerProps) {
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const [internalCurrentTime, setInternalCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasFinished, setHasFinished] = useState(false);
  const [songStartTime, setSongStartTime] = useState<number | null>(null);
  const [totalListeningTime, setTotalListeningTime] = useState(0);
  const [liked, setLiked] = useState<boolean | null>(null); // Track like status
  const [disliked, setDisliked] = useState<boolean | null>(null); // Track dislike status
  const [canSkip, setCanSkip] = useState(false); // Track if 30 seconds have been played
  const audioRef = useRef<HTMLAudioElement>(null);
  const userInteractionRef = useRef(false); // Track if current state change is from user interaction
  const lastSeekFromRef = useRef<number | null>(null);

  // Use external values if provided, otherwise use internal state
  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : internalIsPlaying;
  const currentTime = externalCurrentTime !== undefined ? externalCurrentTime : internalCurrentTime;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      const time = audio.currentTime;
      setInternalCurrentTime(time);
      onTimeUpdate?.(time);
      
      // Enable skip button after 30 seconds of playback (only during song phase, not introduction)
      if (!showLyrics && time >= 30 && !canSkip) {
        setCanSkip(true);
        console.log('⏭️ SKIP BUTTON ENABLED - 30 seconds played:', {
          song_id: song.id,
          song_title: song.title,
          current_time: time,
          timestamp: new Date().toISOString()
        });
      }
    };
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setInternalIsPlaying(false);
      setInternalCurrentTime(0);
      setHasFinished(true);
      onPlayStateChange?.(false);
      
      // Track song completion only during song phase (not introduction)
      if (songStartTime && !showLyrics) {
        const listeningTime = Date.now() - songStartTime;
        const totalTime = totalListeningTime + listeningTime;
        setTotalListeningTime(prev => prev + listeningTime);
        
        console.log('✅ SONG COMPLETED:', {
          song_id: song.id,
          song_title: song.title,
          listening_time_ms: totalTime,
          timestamp: new Date().toISOString()
        });
        
        onSongComplete?.(totalTime);
      }
      
      // If we're in explanation phase and have a completion callback, call it
      if (showLyrics && onExplanationComplete) {
        onExplanationComplete();
      } else {
        // If we're in the song phase, call the song completion handler
        onComplete?.();
      }
    };

    const handleSeeking = () => {
      lastSeekFromRef.current = audio.currentTime;
    };
    const handleSeeked = () => {
      const from = lastSeekFromRef.current ?? audio.currentTime;
      const to = audio.currentTime;
      if (from !== to) {
        onSeek?.(from, to);
      }
      lastSeekFromRef.current = null;
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('seeking', handleSeeking);
    audio.addEventListener('seeked', handleSeeked);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('seeking', handleSeeking);
      audio.removeEventListener('seeked', handleSeeked);
    };
  }, [song]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    const newPlayingState = !isPlaying;
    userInteractionRef.current = true; // Mark as user interaction
    
    try {
      if (newPlayingState) {
        await audio.play();
        // Start tracking only during song phase
        if (!showLyrics) {
          setSongStartTime(Date.now());
        }
      } else {
        audio.pause();
        // Track pause time
        if (songStartTime && !showLyrics) {
          const listeningTime = Date.now() - songStartTime;
          setTotalListeningTime(prev => prev + listeningTime);
          setSongStartTime(null);
        }
      }
      
      // Update state after successful play/pause
      setInternalIsPlaying(newPlayingState);
      onPlayStateChange?.(newPlayingState);
      onPlayPause?.(newPlayingState);
    } catch (error) {
      console.log('Play/pause failed:', error);
    } finally {
      // Reset user interaction flag after a short delay
      setTimeout(() => {
        userInteractionRef.current = false;
      }, 100);
    }
  };

  const handleSkip = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const skippedAtMs = audio.currentTime * 1000; // Convert to milliseconds
    const listeningTime = songStartTime && !showLyrics ? Date.now() - songStartTime : 0;
    const totalTime = totalListeningTime + listeningTime;
    
    console.log('⏭️ SONG SKIPPED:', {
      song_id: song.id,
      song_title: song.title,
      skipped_at_ms: skippedAtMs,
      listening_time_ms: totalTime,
      timestamp: new Date().toISOString()
    });
    
    // Track skip and update total listening time
    if (songStartTime && !showLyrics) {
      setTotalListeningTime(prev => prev + listeningTime);
    }
    // Pause and mark as finished
    audio.pause();
    setInternalIsPlaying(false);
    onPlayStateChange?.(false);
    setHasFinished(true);
    
    // Call both skip and completion callbacks to track all data
    onSkip?.(skippedAtMs);
    onSongComplete?.(totalTime);
  };

  const handleLike = () => {
    const newLikedStatus = liked === true ? null : true; // Toggle like
    setLiked(newLikedStatus);
    // Clear dislike when liking
    if (newLikedStatus) {
      setDisliked(false);
    }
    updateSongLikeStatus(song.id, newLikedStatus);
    
    console.log('👍 SONG LIKED:', {
      song_id: song.id,
      song_title: song.title,
      liked: newLikedStatus,
      timestamp: new Date().toISOString()
    });
  };

  const handleDislike = () => {
    const newDislikeStatus = disliked === true ? null : true; // Toggle dislike
    setDisliked(newDislikeStatus);
    // Clear like when disliking
    if (newDislikeStatus) {
      setLiked(false);
    }
    updateSongDislikeStatus(song.id, newDislikeStatus);
    
    console.log('👎 SONG DISLIKED:', {
      song_id: song.id,
      song_title: song.title,
      dislike: newDislikeStatus,
      timestamp: new Date().toISOString()
    });
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const [waveform, setWaveform] = useState<number[]>([]);

  // Generate waveform on client side only to avoid hydration mismatch
  useEffect(() => {
    const generateWaveform = () => {
      // Generate random waveform bars for visualization
      const bars = Array.from({ length: 50 }, () => Math.random() * 100);
      return bars;
    };
    
    setWaveform(generateWaveform());
  }, []);

  // Sync audio element with isPlaying state (but not during user interactions)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || userInteractionRef.current) return;

    // Sync the audio element's play state with the component's play state
    if (isPlaying && audio.paused) {
      audio.play().catch(error => {
        console.log('Play failed during sync:', error);
      });
    } else if (!isPlaying && !audio.paused) {
      audio.pause();
    }
  }, [isPlaying]);

  // Reset listening time tracking when song changes (not when audio URL changes within same song)
  const previousSongIdRef = useRef<string | null>(null);
  const previousAudioUrlRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (previousSongIdRef.current !== song.id) {
      // New song detected, reset listening time tracking
      console.log('🔄 NEW SONG DETECTED, RESETTING TRACKING:', {
        previous_song: previousSongIdRef.current,
        new_song: song.id,
        timestamp: new Date().toISOString()
      });
      setTotalListeningTime(0);
      setSongStartTime(null);
      setCanSkip(false); // Reset skip button state for new song
      previousSongIdRef.current = song.id;
    }
  }, [song.id]);

  // When leaving introduction (lyrics) phase to song phase, reset listening counters
  const prevShowLyricsRef = useRef<boolean>(showLyrics);
  useEffect(() => {
    if (prevShowLyricsRef.current && !showLyrics) {
      // Transitioned from intro to song, reset timers to avoid counting intro time
      setTotalListeningTime(0);
      setSongStartTime(null);
      setCanSkip(false); // Reset skip button state when transitioning to song
    }
    prevShowLyricsRef.current = showLyrics;
  }, [showLyrics]);

  // Autoplay when audio URL changes (introduction → song or new song) or when shouldAutoplay changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !song.audioUrl) return;
    
    // Only autoplay if the audio URL actually changed (not on every re-render) OR if shouldAutoplay is true
    if (previousAudioUrlRef.current === song.audioUrl && !shouldAutoplay) {
      return;
    }
    
    previousAudioUrlRef.current = song.audioUrl;

    // Reset finished state when audio changes
    setHasFinished(false);

    // Small delay to ensure audio is ready
    const timer = setTimeout(() => {
      audio.play()
        .then(() => {
          // Update play state when autoplay succeeds
          setInternalIsPlaying(true);
          onPlayStateChange?.(true);
          // Start/restart tracking listening time only during song phase
          if (!showLyrics) {
            setSongStartTime(Date.now());
          }
          // Emit play event for analytics if needed
          onPlayPause?.(true);
          
          console.log('🎵 AUTOPLAY STARTED:', {
            song_id: song.id,
            song_title: song.title,
            audio_url: song.audioUrl,
            accumulated_time: totalListeningTime,
            start_time: Date.now(),
            should_autoplay: shouldAutoplay,
            timestamp: new Date().toISOString()
          });
        })
        .catch(error => {
          console.log('Autoplay prevented by browser:', error);
          // Autoplay was prevented, user will need to manually start
        });
    }, 100);

    return () => clearTimeout(timer);
  }, [song.audioUrl, song.id, song.title, onPlayStateChange, totalListeningTime, shouldAutoplay]);

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Album Art or Lyrics */}
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
        {showLyrics && transcript ? (
          <div 
            className="w-full h-full flex flex-col"
            style={{ backgroundColor: genre.color }}
          >
            <div className="flex-1 p-2 min-h-0">
              <LyricsDisplay
                transcript={transcript}
                currentTime={currentTime}
                isPlaying={isPlaying}
                className="text-white h-full"
              />
            </div>
          </div>
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center text-white font-bold text-2xl"
            style={{ backgroundColor: genre.color }}
          >
            <div className="text-center">
              <div className="text-4xl mb-2">🎵</div>
              <div className="text-sm opacity-80">{genre.name}</div>
            </div>
          </div>
        )}
      </div>

      {/* Song Info */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-dark-purple">{song.title}</h3>
        <p className="text-dark-purple/70">{song.artist}</p>
      </div>

      {/* Waveform */}
      <div className="flex items-end justify-center space-x-1 h-16">
        {waveform.length > 0 ? (
          waveform.map((height, index) => {
            // Calculate progress percentage
            const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
            const barProgress = (index / (waveform.length - 1)) * 100;
            const isPlayed = barProgress <= progressPercentage;
            
            return (
              <div
                key={index}
                className={cn(
                  "w-1 transition-all duration-700 ease-in-out",
                  isPlayed 
                    ? "bg-dark-purple" 
                    : "bg-gray-300",
                  isPlaying && isPlayed && "animate-pulse"
                )}
                style={{ height: `${height}%` }}
              />
            );
          })
        ) : (
          // Placeholder bars while waveform is generating
          Array.from({ length: 50 }, (_, index) => (
            <div
              key={index}
              className="w-1 bg-dark-purple/20"
              style={{ height: '20%' }}
            />
          ))
        )}
      </div>

      {/* Time Display */}
      <div className="flex justify-between text-sm text-dark-purple/70">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-4">
        {/* <Button
          variant="outline"
          size="icon"
          onClick={onPrevious}
          disabled={!hasPrevious}
          className="w-12 h-12 rounded-full border-dark-purple text-dark-purple hover:bg-maize hover:border-maize disabled:opacity-50"
        >
          ⏮
        </Button> */}
        
        {hasFinished ? (
          <Button
            onClick={onNext}
            disabled={!hasNext}
            className="w-16 h-16 rounded-full bg-dark-purple text-white hover:bg-dark-purple/90"
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={togglePlayPause}
            className="w-16 h-16 rounded-full bg-dark-purple text-white hover:bg-dark-purple/90"
          >
            {isPlaying ? '⏸' : '▶'}
          </Button>
        )}
        
        <Button
          onClick={handleSkip}
          disabled={showLyrics || !canSkip} // Disable skip during introduction/explanation phase or until 30 seconds played
          className="w-12 h-12 rounded-full bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            showLyrics 
              ? "Cannot skip during introduction" 
              : !canSkip 
                ? "Skip available after 30 seconds" 
                : "Skip song"
          }
        >
          ⏭
        </Button>
      </div>

      {/* Like/Dislike Buttons - Only show during song playback (not introduction) */}
      {!showLyrics && (
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={handleDislike}
            variant={disliked === true ? "default" : "outline"}
            className={cn(
              "w-12 h-12 rounded-full",
              disliked === true 
                ? "bg-red-500 text-white hover:bg-red-600" 
                : "border-red-500 text-red-500 hover:bg-red-50"
            )}
            title={disliked === true ? "Remove dislike" : "Dislike this song"}
          >
            👎
          </Button>
          
          <Button
            onClick={handleLike}
            variant={liked === true ? "default" : "outline"}
            className={cn(
              "w-12 h-12 rounded-full",
              liked === true 
                ? "bg-green-500 text-white hover:bg-green-600" 
                : "border-green-500 text-green-500 hover:bg-green-50"
            )}
            title={liked === true ? "Remove like" : "Like this song"}
          >
            👍
          </Button>
        </div>
      )}

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={song.audioUrl || undefined}
        preload="metadata"
        loop={false}
      />
    </div>
  );
}
