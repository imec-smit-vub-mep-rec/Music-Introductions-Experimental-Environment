'use client';

import { useState } from 'react';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { AudioPlayerScreen } from '@/components/screens/AudioPlayerScreen';
import { ExperimentLayout } from '@/components/layout/ExperimentLayout';
import type { Genre, Song } from '@/lib/types';
import type { IntroductionStyle } from '@/lib/session';

interface ParticipantViewProps {
  song: Song;
  genre: Genre;
  songNumber: number;
  totalSongs: number;
  introductionStyle: IntroductionStyle;
  onNextSong: () => void;
}

/**
 * The experiment's own player screen, stopped where the song would start: the song
 * recordings are not published, so their title and artist are shown instead.
 */
export function ParticipantView({
  song,
  genre,
  songNumber,
  totalSongs,
  introductionStyle,
  onNextSong,
}: ParticipantViewProps) {
  const [introductionDone, setIntroductionDone] = useState(false);
  const [plays, setPlays] = useState(0);

  if (!introductionDone) {
    return (
      <AudioPlayerScreen
        key={plays}
        song={song}
        genre={genre}
        currentSongIndex={songNumber - 1}
        totalSongs={totalSongs}
        songNumber={songNumber}
        introductionStyle={introductionStyle}
        hasNextSong={false}
        hasPreviousSong={false}
        onNextSong={onNextSong}
        onPreviousSong={() => undefined}
        onComplete={() => undefined}
        onIntroductionComplete={() => setIntroductionDone(true)}
      />
    );
  }

  const replayIntroduction = () => {
    setPlays((count) => count + 1);
    setIntroductionDone(false);
  };

  // Mirrors the layout of the song phase in AudioPlayerScreen / AudioPlayer
  return (
    <ExperimentLayout background="light">
      <div className="min-h-screen px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-dark-purple">Listening to {genre.name}</h1>
            <p className="text-dark-purple/70">
              Song {songNumber} of {totalSongs}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-ivory">
            <div className="w-full max-w-md mx-auto space-y-6">
              <div
                className="w-full aspect-square rounded-2xl flex items-center justify-center text-white font-bold text-2xl"
                style={{ backgroundColor: genre.color }}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">🎵</div>
                  <div className="text-sm opacity-80">{genre.name}</div>
                </div>
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-dark-purple">{song.title}</h3>
                <p className="text-dark-purple/70">{song.artist}</p>
              </div>

              <p className="rounded-lg bg-ivory px-4 py-3 text-sm text-dark-purple/80">
                In the experiment, the full song started playing automatically at this point. Participants
                could skip it after 30 seconds and like or dislike it. The recording is not included on
                this page.
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={replayIntroduction}
                  className="inline-flex items-center gap-1.5 rounded-full border border-dark-purple/20 px-4 py-2 text-sm font-medium text-dark-purple hover:bg-ivory"
                >
                  <RotateCcw className="h-4 w-4" />
                  Replay introduction
                </button>
                <button
                  type="button"
                  onClick={onNextSong}
                  className="inline-flex items-center gap-1 rounded-full bg-dark-purple px-4 py-2 text-sm font-medium text-white hover:bg-dark-purple/90"
                >
                  Next song
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ExperimentLayout>
  );
}
