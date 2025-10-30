"use client";

import { AudioPlayerScreen } from "@/components/screens/AudioPlayerScreen";
import type { Genre, Song } from "@/lib/types";

export default function PlayerScreenPage() {
  const dummyGenre: Genre = {
    id: "demo",
    name: "Demo Genre",
    icon: "🎵",
    color: "#6b5b95",
    pattern: "dots",
  };

  const dummySong: Song = {
    id: "demo-song",
    title: "Demo Track",
    artist: "Unknown Artist",
    genre: dummyGenre.id,
    audioUrl: "/audio/demo.m4a",
  };

  return (
    <div className="p-6">
      <AudioPlayerScreen
        song={dummySong}
        genre={dummyGenre}
        currentSongIndex={0}
        totalSongs={1}
        onNextSong={() => {}}
        onPreviousSong={() => {}}
        onComplete={() => {}}
        hasNextSong={false}
        hasPreviousSong={false}
        songNumber={1}
        introductionStyle="no_introduction"
        onSkip={() => {}}
        onSongComplete={() => {}}
      />
    </div>
  );
}


