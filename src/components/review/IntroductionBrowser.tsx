'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import type { Genre, Song } from '@/lib/types';
import type { IntroductionStyle } from '@/lib/session';
import { getIntroductionTranscriptUrl } from '@/lib/randomization';
import { cn } from '@/lib/utils';
import { AudioPlayerScreen } from '@/components/screens/AudioPlayerScreen';
import { IntroductionTranscript, prefetchTranscript } from './IntroductionTranscript';

export type ReviewStyle = 'informative' | 'immersive';

const STYLES: Record<ReviewStyle, { label: string; introductionStyle: IntroductionStyle }> = {
  informative: { label: 'Informative', introductionStyle: 'informative_introduction' },
  immersive: { label: 'Immersive', introductionStyle: 'immersive_introduction' },
};

// The public experiment serves placeholder songs from /data; the original
// recordings live in /review-audio, which only logged-in reviewers can load.
const toReviewAudioUrl = (url: string) => url.replace(/^\/data\//, '/review-audio/');

interface IntroductionBrowserProps {
  genres: Genre[];
  songs: Song[];
  initialSongId?: string;
  initialStyle: ReviewStyle;
}

export function IntroductionBrowser({ genres, songs, initialSongId, initialStyle }: IntroductionBrowserProps) {
  const router = useRouter();

  // Songs grouped by genre, in genre order
  const groups = useMemo(
    () =>
      genres
        .map((genre) => ({ genre, songs: songs.filter((song) => song.genre === genre.id) }))
        .filter((group) => group.songs.length > 0),
    [genres, songs]
  );
  const orderedSongs = useMemo(() => groups.flatMap((group) => group.songs), [groups]);

  const [songId, setSongId] = useState(
    orderedSongs.some((song) => song.id === initialSongId) ? initialSongId! : orderedSongs[0].id
  );
  const [style, setStyle] = useState<ReviewStyle>(initialStyle);

  const songIndex = orderedSongs.findIndex((song) => song.id === songId);
  const song = orderedSongs[songIndex];
  const group = groups.find((g) => g.genre.id === song.genre)!;
  const genre = group.genre;
  const introductionStyle = STYLES[style].introductionStyle;
  const transcriptUrl = getIntroductionTranscriptUrl(song, introductionStyle);
  // Stable object: AudioPlayerScreen restarts the introduction whenever `song` changes
  const reviewSong = useMemo(() => ({ ...song, audioUrl: toReviewAudioUrl(song.audioUrl) }), [song]);

  // Keep the selection in the URL so reviewers can share or bookmark it
  useEffect(() => {
    window.history.replaceState(null, '', `?song=${encodeURIComponent(songId)}&style=${style}`);
  }, [songId, style]);

  // Make toggling instant by loading the other introduction of this song too
  useEffect(() => {
    for (const { introductionStyle: other } of Object.values(STYLES)) {
      const url = getIntroductionTranscriptUrl(song, other);
      if (url) prefetchTranscript(url);
    }
  }, [song]);

  const goTo = (offset: number) => {
    const next = orderedSongs[(songIndex + offset + orderedSongs.length) % orderedSongs.length];
    setSongId(next.id);
  };

  const handleLogout = async () => {
    await fetch('/api/review/auth', { method: 'DELETE' });
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-ivory">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-dark-purple sm:text-3xl">Music introductions</h1>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-dark-purple/15 bg-white px-3 py-2 text-sm text-dark-purple/70 hover:text-dark-purple"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
          <p className="mt-2 max-w-3xl text-dark-purple/70">
            All spoken introductions used in the experiment: {orderedSongs.length} songs across{' '}
            {groups.length} genres, each with an informative and an immersive version. In the experiment,
            each participant heard three songs from one genre in random order, and each song was randomly paired
            with no introduction, the informative introduction, or the immersive introduction. Each introduction
            is shown below in the player participants used: the lyrics scroll along with the spoken
            introduction, and the song starts automatically when it ends.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
          {/* Song list */}
          <nav aria-label="Songs" className="hidden md:sticky md:top-8 md:block md:self-start">
            <div className="space-y-5">
              {groups.map((group) => (
                <div key={group.genre.id}>
                  <h2 className="mb-1.5 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-dark-purple/50">
                    <span aria-hidden>{group.genre.icon}</span>
                    {group.genre.name}
                  </h2>
                  <ul>
                    {group.songs.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setSongId(item.id)}
                          aria-current={item.id === songId ? 'true' : undefined}
                          className={cn(
                            'w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors',
                            item.id === songId
                              ? 'bg-dark-purple text-white'
                              : 'text-dark-purple hover:bg-dark-purple/5'
                          )}
                        >
                          <span className="block truncate font-medium">{item.title}</span>
                          <span
                            className={cn(
                              'block truncate text-xs',
                              item.id === songId ? 'text-white/70' : 'text-dark-purple/50'
                            )}
                          >
                            {item.artist}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          {/* Song picker for small screens */}
          <label className="block md:hidden">
            <span className="mb-1 block text-sm font-medium text-dark-purple">Song</span>
            <select
              value={songId}
              onChange={(event) => setSongId(event.target.value)}
              className="h-10 w-full rounded-md border border-dark-purple/20 bg-white px-3 text-dark-purple"
            >
              {groups.map((group) => (
                <optgroup key={group.genre.id} label={group.genre.name}>
                  {group.songs.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} — {item.artist}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          {/* Selected song */}
          <main className="min-w-0 space-y-6">
            <section className="rounded-2xl border border-dark-purple/10 bg-white p-5 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="mb-1 text-sm font-medium text-dark-purple/60">
                    <span aria-hidden>{genre.icon}</span> {genre.name} · song {songIndex + 1} of{' '}
                    {orderedSongs.length}
                  </p>
                  <h2 className="text-2xl font-bold text-dark-purple">{song.title}</h2>
                  <p className="text-dark-purple/70">{song.artist}</p>
                </div>

                <div
                  role="radiogroup"
                  aria-label="Introduction style"
                  className="inline-flex rounded-lg bg-dark-purple/5 p-1"
                >
                  {(Object.keys(STYLES) as ReviewStyle[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={style === key}
                      onClick={() => setStyle(key)}
                      className={cn(
                        'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                        style === key
                          ? 'bg-ultra-violet text-white shadow-sm'
                          : 'text-dark-purple/70 hover:text-dark-purple'
                      )}
                    >
                      {STYLES[key].label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section
              aria-labelledby="participant-view"
              className="overflow-hidden rounded-2xl border border-dark-purple/10 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-dark-purple/10 bg-white px-5 py-3 text-sm">
                <h3 id="participant-view" className="font-semibold text-dark-purple">
                  Participant view
                </h3>
                <span className="text-dark-purple/60">Introduction first, then the song</span>
              </div>
              <AudioPlayerScreen
                key={`${song.id}-${style}`}
                song={reviewSong}
                genre={genre}
                currentSongIndex={group.songs.indexOf(song)}
                totalSongs={group.songs.length}
                songNumber={group.songs.indexOf(song) + 1}
                introductionStyle={introductionStyle}
                hasNextSong
                hasPreviousSong
                onNextSong={() => goTo(1)}
                onPreviousSong={() => goTo(-1)}
                onComplete={() => undefined}
              />
            </section>

            {transcriptUrl && (
              <section className="rounded-2xl border border-dark-purple/10 bg-white p-5 shadow-sm sm:p-8">
                <IntroductionTranscript key={transcriptUrl} transcriptUrl={transcriptUrl} />
              </section>
            )}

            <div className="flex justify-between gap-4">
              <button
                type="button"
                onClick={() => goTo(-1)}
                className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm text-dark-purple/70 hover:bg-white hover:text-dark-purple"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous song
              </button>
              <button
                type="button"
                onClick={() => goTo(1)}
                className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm text-dark-purple/70 hover:bg-white hover:text-dark-purple"
              >
                Next song
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
