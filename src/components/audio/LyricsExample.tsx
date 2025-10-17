'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AudioPlayerScreen } from '@/components/screens/AudioPlayerScreen';
import { Song, Genre } from '@/lib/types';

// Example usage of the AudioPlayerScreen with lyrics
export function LyricsExample() {
  // Example song data
  const exampleSong: Song = {
    id: 'example_1',
    title: 'Love Me Again',
    artist: 'John Newman',
    genre: 'pop',
    audioUrl: '/data/demo/1/song.mp3',
    duration: 180,
    explanationAudioUrl: '/data/demo/1/explanation.ogg',
    explanationTranscriptUrl: '/data/demo/1/transcript.json'
  };

  const exampleGenre: Genre = {
    id: 'pop',
    name: 'Pop',
    color: '#FFB17A',
    pattern: 'sandy-brown'
  };

  return (
    <AudioPlayerScreen
      song={exampleSong}
      genre={exampleGenre}
      currentSongIndex={0}
      totalSongs={3}
      onNextSong={() => console.log('Next song')}
      onPreviousSong={() => console.log('Previous song')}
      onComplete={() => console.log('Complete')}
      hasNextSong={true}
      hasPreviousSong={false}
    />
  );
}
