'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ExperimentLayout } from '@/components/layout/ExperimentLayout';
import { AudioPlayer } from '@/components/audio/AudioPlayer';
import { Song, Genre, Transcript } from '@/lib/types';
import { getIntroductionTranscriptUrl } from '@/lib/randomization';
import { getSession, addSongSession, IntroductionStyle, SongSession } from '@/lib/session';
import { useEngagementTracking } from '@/hooks/useEngagementTracking';

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
  songNumber?: number;
  introductionStyle?: string;
  onSkip?: (skippedAtMs: number) => void;
  onSongComplete?: (listeningTimeMs: number) => void;
}

export function AudioPlayerScreen({
  song,
  genre,
  totalSongs,
  onNextSong,
  onPreviousSong,
  onComplete,
  onBack,
  hasNextSong,
  hasPreviousSong,
  songNumber = 1,
  introductionStyle = 'no_introduction',
  onSkip,
  onSongComplete
}: AudioPlayerScreenProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [isExplanationPhase, setIsExplanationPhase] = useState(true);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string>('');
  const [shouldAutoplay, setShouldAutoplay] = useState(true);

  // Engagement tracking for audio interactions
  const { trackPlayPause, trackSeek, trackSongSkip, trackSongCompletion } = useEngagementTracking({
    page: 'audio',
    trackClicks: false,
    trackScrolls: false,
    trackAudioInteractions: true,
  });

  // Load transcript data and set initial audio URL based on introduction style
  useEffect(() => {
    const transcriptUrl = getIntroductionTranscriptUrl(song, introductionStyle as IntroductionStyle);
    if (transcriptUrl) {
      fetch(transcriptUrl)
        .then(response => response.json())
        .then(data => setTranscript(data as Transcript))
        .catch(error => console.error('Error loading transcript:', error));
    }
    
    // Set initial audio URL based on introduction style
    if (introductionStyle === 'no_introduction') {
      setIsExplanationPhase(false);
      setCurrentAudioUrl(song.audioUrl);
      setShouldAutoplay(true);
    } else if (introductionStyle === 'informative_introduction' && song.informIntroductionUrl) {
      setIsExplanationPhase(true);
      setCurrentAudioUrl(song.informIntroductionUrl);
      setShouldAutoplay(true);
    } else if (introductionStyle === 'immersive_introduction' && song.immersIntroductionUrl) {
      setIsExplanationPhase(true);
      setCurrentAudioUrl(song.immersIntroductionUrl);
      setShouldAutoplay(true);
    } else {
      // Fallback to song if introduction not available
      setIsExplanationPhase(false);
      setCurrentAudioUrl(song.audioUrl);
      setShouldAutoplay(true);
    }
  }, [song, introductionStyle, song.title]);

  // Create initial song session when component mounts
  useEffect(() => {
    const songSession: SongSession = {
      songId: song.id,
      introduction_style: introductionStyle as IntroductionStyle,
      answers: {},
      skipped: false,
      skipped_at_ms: null,
      listening_time_ms: 0,
      liked: null,
      liked_at_ms: null,
      dislike: null,
      dislike_at_ms: null,
    };
    
    // Check if song session already exists
    const existingSession = getSession();
    if (existingSession) {
      const existingSongIndex = existingSession.answers.songs.findIndex(s => s.songId === song.id);
      if (existingSongIndex === -1) {
        // Song session doesn't exist, create it
        console.log('🎵 CREATING SONG SESSION:', {
          song_id: song.id,
          song_title: song.title,
          introduction_style: introductionStyle,
          timestamp: new Date().toISOString()
        });
        addSongSession(songSession);
      }
    }
  }, [song.id, introductionStyle]);

  // Note: `shouldAutoplay` is set when audio URL changes or phase transitions.

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const handlePlayStateChange = (playing: boolean) => {
    setIsPlaying(playing);
    trackPlayPause(playing, song.id);
    
    // Reset autoplay flag once user has interacted with the player
    if (playing && shouldAutoplay) {
      setShouldAutoplay(false);
    }
  };

  const handleExplanationComplete = () => {
    // Switch to song phase
    setIsExplanationPhase(false);
    setCurrentAudioUrl(song.audioUrl);
    setCurrentTime(0);
    setShouldAutoplay(true);
  };

  const handleSongComplete = () => {
    // When song completes, automatically go to survey
    onComplete();
  };
  return (
    <ExperimentLayout background="light">
      <div className="min-h-screen px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            {/* {onBack && (
              <Button
                variant="ghost"
                onClick={onBack}
                className="text-dark-purple hover:bg-maize/20"
              >
                ← Back
              </Button>
            )} */}
            <div className="flex-1 text-center">
              <h1 className="text-2xl font-bold text-dark-purple">
                {isExplanationPhase ? `Understanding ${genre.name}` : `Listening to ${genre.name}`}
              </h1>
              <p className="text-dark-purple/70">
                Song {songNumber} of {totalSongs}
                {isExplanationPhase && ' • Explanation'}
              </p>
            </div>
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
              onComplete={handleSongComplete}
              onSkip={(skippedAtMs) => {
                trackSongSkip(song.id, skippedAtMs);
                onSkip?.(skippedAtMs);
              }}
              onSongComplete={(listeningTimeMs) => {
                trackSongCompletion(song.id, listeningTimeMs);
                onSongComplete?.(listeningTimeMs);
              }}
              onPlayPause={(playing) => trackPlayPause(playing, song.id)}
              onSeek={(from, to) => trackSeek(from, to, song.id)}
              shouldAutoplay={shouldAutoplay}
            />
          </div>
        </div>
      </div>
    </ExperimentLayout>
  );
}
