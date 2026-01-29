"use client";

import { useState, useMemo } from "react";
import { AudioPlayerScreen } from "@/components/screens/AudioPlayerScreen";
import type { Genre, Song } from "@/lib/types";
import type { IntroductionStyle } from "@/lib/session";
import songsData from "@/data/songs.json";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function PlayerScreenPage() {
  const [selectedSongId, setSelectedSongId] = useState<string>("disco_1");
  const [selectedIntroStyle, setSelectedIntroStyle] = useState<IntroductionStyle>("no_introduction");

  // Get selected song and genre
  const selectedSong = useMemo(() => {
    return songsData.songs.find(song => song.id === selectedSongId) || songsData.songs[0];
  }, [selectedSongId]);

  const selectedGenre = useMemo(() => {
    return songsData.genres.find(genre => genre.id === selectedSong.genre) || songsData.genres[0];
  }, [selectedSong]);

  // Format song display name
  const getSongDisplayName = (song: Song) => {
    return `${song.title} - ${song.artist} (${song.genre})`;
  };

  // Format introduction style display name
  const getIntroStyleDisplayName = (style: IntroductionStyle) => {
    const styles: Record<IntroductionStyle, string> = {
      no_introduction: "No Introduction",
      informative_introduction: "Informative Introduction",
      immersive_introduction: "Immersive Introduction",
    };
    return styles[style];
  };

  return (
    <div className="p-6 space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 space-y-4">
        <h2 className="text-xl font-semibold text-dark-purple mb-4">Player Controls</h2>
        
        <div className="space-y-2">
          <Label htmlFor="song-select" className="text-sm font-medium text-dark-purple">
            Select Song
          </Label>
          <select
            id="song-select"
            value={selectedSongId}
            onChange={(e) => setSelectedSongId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
          >
            {songsData.songs.map((song) => (
              <option key={song.id} value={song.id}>
                {getSongDisplayName(song)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="intro-select" className="text-sm font-medium text-dark-purple">
            Select Introduction Style
          </Label>
          <select
            id="intro-select"
            value={selectedIntroStyle}
            onChange={(e) => setSelectedIntroStyle(e.target.value as IntroductionStyle)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
          >
            <option value="no_introduction">No Introduction</option>
            <option value="informative_introduction">Informative Introduction</option>
            <option value="immersive_introduction">Immersive Introduction</option>
          </select>
        </div>
      </div>

      {/* Player */}
      <AudioPlayerScreen
        song={selectedSong}
        genre={selectedGenre}
        currentSongIndex={0}
        totalSongs={1}
        onNextSong={() => {}}
        onPreviousSong={() => {}}
        onComplete={() => {}}
        hasNextSong={false}
        hasPreviousSong={false}
        songNumber={1}
        introductionStyle={selectedIntroStyle}
        onSkip={() => {}}
        onSongComplete={() => {}}
      />
    </div>
  );
}


