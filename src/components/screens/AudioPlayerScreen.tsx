'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ExperimentLayout } from '@/components/layout/ExperimentLayout';
import { AudioPlayer } from '@/components/audio/AudioPlayer';
import { LyricsDisplay } from '@/components/audio/LyricsDisplay';
import { Song, Genre, Transcript } from '@/lib/types';

interface AudioPlayerScreenProps {
  song: Song;
  genre: Genre;
  currentSongIndex: number;
  totalSongs: number;
  onNextSong: () => void;
  onPreviousSong: () => void;
  onComplete: () => void;
  onBack?: () => void;
  hasNextSong: boolean;
  hasPreviousSong: boolean;
}

export function AudioPlayerScreen({
  song,
  genre,
  currentSongIndex,
  totalSongs,
  onNextSong,
  onPreviousSong,
  onComplete,
  onBack,
  hasNextSong,
  hasPreviousSong
}: AudioPlayerScreenProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [isExplanationPhase, setIsExplanationPhase] = useState(true);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string>('');

  // Load transcript data and set initial audio URL
  useEffect(() => {
    if (song.explanationTranscriptUrl) {
      fetch(song.explanationTranscriptUrl)
        .then(response => response.json())
        .then(data => setTranscript(data as Transcript))
        .catch(error => console.error('Error loading transcript:', error));
    }
    
    // Set initial audio URL to explanation if available
    if (song.explanationAudioUrl) {
      setIsExplanationPhase(true);
      setCurrentAudioUrl(song.explanationAudioUrl);
    } else {
      setCurrentAudioUrl(song.audioUrl);
      setIsExplanationPhase(false);
    }
  }, [song]);

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const handlePlayStateChange = (playing: boolean) => {
    setIsPlaying(playing);
  };

  const handleExplanationComplete = () => {
    // Switch to song phase
    setIsExplanationPhase(false);
    setCurrentAudioUrl(song.audioUrl);
    setCurrentTime(0);
  };
  return (
    <ExperimentLayout background="light">
      <div className="min-h-screen px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            {onBack && (
              <Button
                variant="ghost"
                onClick={onBack}
                className="text-dark-purple hover:bg-maize/20"
              >
                ← Back
              </Button>
            )}
            <div className="flex-1 text-center">
              <h1 className="text-2xl font-bold text-dark-purple">
                {isExplanationPhase ? `Understanding ${genre.name}` : `Listening to ${genre.name}`}
              </h1>
              <p className="text-dark-purple/70">
                Song {currentSongIndex + 1} of {totalSongs}
                {isExplanationPhase && ' • Explanation'}
              </p>
            </div>
            <div className="w-16" /> {/* Spacer for centering */}
          </div>

          {/* Audio Player */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-ivory">
            <AudioPlayer
              song={{
                ...song,
                audioUrl: currentAudioUrl
              }}
              genre={genre}
              onNext={onNextSong}
              onPrevious={onPreviousSong}
              hasNext={hasNextSong}
              hasPrevious={hasPreviousSong}
              onTimeUpdate={handleTimeUpdate}
              onPlayStateChange={handlePlayStateChange}
              showLyrics={isExplanationPhase}
              transcript={transcript}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onExplanationComplete={isExplanationPhase ? handleExplanationComplete : undefined}
            onComplete={onComplete}
            />
          </div>
        </div>
      </div>
    </ExperimentLayout>
  );
}
