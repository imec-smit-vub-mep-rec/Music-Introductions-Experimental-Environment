'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Song, Genre, Transcript } from '@/lib/types';
import { LyricsDisplay } from '@/components/audio/LyricsDisplay';
import { cn } from '@/lib/utils';

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
  onComplete
}: AudioPlayerProps) {
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const [internalCurrentTime, setInternalCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasFinished, setHasFinished] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

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
    };
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setInternalIsPlaying(false);
      setInternalCurrentTime(0);
      setHasFinished(true);
      onPlayStateChange?.(false);
      
      // If we're in explanation phase and have a completion callback, call it
      if (showLyrics && onExplanationComplete) {
        onExplanationComplete();
      } else {
        // If we're in the song phase, automatically advance or complete if no next
        if (hasNext) {
          onNext?.();
        } else {
          onComplete?.();
        }
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [song]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const newPlayingState = !isPlaying;
    if (newPlayingState) {
      audio.play();
    } else {
      audio.pause();
    }
    setInternalIsPlaying(newPlayingState);
    onPlayStateChange?.(newPlayingState);
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

  // Autoplay when component mounts or song changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !song.audioUrl) return;

    // Reset finished state when song changes
    setHasFinished(false);

    // Small delay to ensure audio is ready
    const timer = setTimeout(() => {
      audio.play()
        .then(() => {
          // Update play state when autoplay succeeds
          setInternalIsPlaying(true);
          onPlayStateChange?.(true);
        })
        .catch(error => {
          console.log('Autoplay prevented by browser:', error);
          // Autoplay was prevented, user will need to manually start
        });
    }, 100);

    return () => clearTimeout(timer);
  }, [song.audioUrl, onPlayStateChange]);

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Album Art or Lyrics */}
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
        {showLyrics && transcript ? (
          <div 
            className="w-full h-full flex flex-col overflow-hidden"
            style={{ backgroundColor: genre.color }}
          >
            <div className="flex-1 p-2">
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
          waveform.map((height, index) => (
            <div
              key={index}
              className={cn(
                "w-1 bg-dark-purple transition-all duration-300",
                isPlaying && "animate-pulse"
              )}
              style={{ height: `${height}%` }}
            />
          ))
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
          variant="outline"
          size="icon"
          onClick={onNext}
          disabled={!hasNext}
          className="w-12 h-12 rounded-full border-dark-purple text-dark-purple hover:bg-maize hover:border-maize disabled:opacity-50"
        >
          ⏭
        </Button>
      </div>

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
