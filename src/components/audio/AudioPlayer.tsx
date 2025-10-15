'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Song, Genre } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  song: Song;
  genre: Genre;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export function AudioPlayer({ 
  song, 
  genre, 
  onNext, 
  onPrevious, 
  hasNext = false, 
  hasPrevious = false 
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
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

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const generateWaveform = () => {
    // Generate random waveform bars for visualization
    const bars = Array.from({ length: 50 }, () => Math.random() * 100);
    return bars;
  };

  const waveform = generateWaveform();

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Album Art */}
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
        <div 
          className="w-full h-full flex items-center justify-center text-white font-bold text-2xl"
          style={{ backgroundColor: genre.color }}
        >
          <div className="text-center">
            <div className="text-4xl mb-2">🎵</div>
            <div className="text-sm opacity-80">{genre.name}</div>
          </div>
        </div>
      </div>

      {/* Song Info */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-dark-purple">{song.title}</h3>
        <p className="text-dark-purple/70">{song.artist}</p>
      </div>

      {/* Waveform */}
      <div className="flex items-end justify-center space-x-1 h-16">
        {waveform.map((height, index) => (
          <div
            key={index}
            className={cn(
              "w-1 bg-dark-purple transition-all duration-300",
              isPlaying && "animate-pulse"
            )}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>

      {/* Time Display */}
      <div className="flex justify-between text-sm text-dark-purple/70">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-4">
        <Button
          variant="outline"
          size="icon"
          onClick={onPrevious}
          disabled={!hasPrevious}
          className="w-12 h-12 rounded-full border-dark-purple text-dark-purple hover:bg-maize hover:border-maize disabled:opacity-50"
        >
          ⏮
        </Button>
        
        <Button
          onClick={togglePlayPause}
          className="w-16 h-16 rounded-full bg-dark-purple text-white hover:bg-dark-purple/90"
        >
          {isPlaying ? '⏸' : '▶'}
        </Button>
        
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
        src={song.audioUrl}
        preload="metadata"
      />
    </div>
  );
}
