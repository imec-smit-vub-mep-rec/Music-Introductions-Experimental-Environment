'use client';

import { Button } from '@/components/ui/button';
import { ExperimentLayout } from '@/components/layout/ExperimentLayout';
import { AudioPlayer } from '@/components/audio/AudioPlayer';
import { Song, Genre } from '@/lib/types';

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
                Listening to {genre.name}
              </h1>
              <p className="text-dark-purple/70">
                Song {currentSongIndex + 1} of {totalSongs}
              </p>
            </div>
            <div className="w-16" /> {/* Spacer for centering */}
          </div>

          {/* Audio Player */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-ivory">
            <AudioPlayer
              song={song}
              genre={genre}
              onNext={onNextSong}
              onPrevious={onPreviousSong}
              hasNext={hasNextSong}
              hasPrevious={hasPreviousSong}
            />
          </div>

          {/* Complete Button */}
          <div className="flex justify-center">
            <Button
              onClick={onComplete}
              className="bg-dark-purple text-white hover:bg-dark-purple/90 px-8 py-3 rounded-full"
            >
              Continue to Survey
            </Button>
          </div>
        </div>
      </div>
    </ExperimentLayout>
  );
}
