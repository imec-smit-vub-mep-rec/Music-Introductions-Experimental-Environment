'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { Transcript, Word } from '@/lib/types';
import { cn } from '@/lib/utils';

const transcriptCache = new Map<string, Promise<Transcript>>();

function loadTranscript(url: string): Promise<Transcript> {
  let request = transcriptCache.get(url);
  if (!request) {
    request = fetch(url).then((response) => {
      if (!response.ok) throw new Error(`Failed to load transcript ${url}`);
      return response.json() as Promise<Transcript>;
    });
    request.catch(() => transcriptCache.delete(url));
    transcriptCache.set(url, request);
  }
  return request;
}

export function prefetchTranscript(url: string) {
  loadTranscript(url).catch(() => undefined);
}

const isPunctuation = (word: Word) => !/\w/.test(word.text);

function transcriptToText(words: Word[]): string {
  return words
    .map((word, index) => (index > 0 && !isPunctuation(word) ? ' ' : '') + word.text.trim())
    .join('');
}

function formatTime(seconds: number): string {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

interface IntroductionPlayerProps {
  audioUrl: string;
  transcriptUrl: string;
}

export function IntroductionPlayer({ audioUrl, transcriptUrl }: IntroductionPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadTranscript(transcriptUrl)
      .then((data) => !cancelled && setTranscript(data))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [transcriptUrl]);

  const words = useMemo(
    () =>
      transcript
        ? [...transcript.subtitles]
            .sort((a, b) => a.timing.start - b.timing.start)
            .flatMap((subtitle) => subtitle.words)
        : [],
    [transcript]
  );

  // Follow playback and highlight the word being spoken
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || words.length === 0) return;

    let frame = 0;
    const update = () => {
      const time = audio.currentTime;
      let index = -1;
      if (time > 0 && !audio.ended) {
        for (let i = 0; i < words.length && words[i].start <= time; i++) index = i;
      }
      setActiveIndex(index);
    };
    const tick = () => {
      update();
      frame = requestAnimationFrame(tick);
    };
    const handlePlay = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(tick);
    };
    const handleStop = () => {
      cancelAnimationFrame(frame);
      update();
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handleStop);
    audio.addEventListener('ended', handleStop);
    audio.addEventListener('seeked', update);
    return () => {
      cancelAnimationFrame(frame);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handleStop);
      audio.removeEventListener('ended', handleStop);
      audio.removeEventListener('seeked', update);
    };
  }, [words]);

  const playFrom = (word: Word) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = word.start;
    audio.play().catch(() => undefined);
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(transcriptToText(words));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context); the text can still be selected manually
    }
  };

  return (
    <div className="space-y-5">
      <audio ref={audioRef} src={audioUrl} controls preload="metadata" className="w-full" />

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-dark-purple/60">
        <span>
          {transcript ? `${words.length} words` : '\u00a0'}
        </span>
        {transcript && (
          <button
            type="button"
            onClick={copyText}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-dark-purple/70 hover:bg-ivory hover:text-dark-purple"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy text'}
          </button>
        )}
      </div>

      {loadError ? (
        <p className="text-sm text-red-600">The transcript for this introduction could not be loaded.</p>
      ) : !transcript ? (
        <div className="space-y-3" aria-label="Loading transcript">
          {[0, 1, 2, 3].map((line) => (
            <div key={line} className="h-4 animate-pulse rounded bg-dark-purple/10" style={{ width: `${95 - line * 12}%` }} />
          ))}
        </div>
      ) : (
        <p className="text-lg leading-relaxed text-dark-purple">
          {words.map((word, index) => (
            <span key={word.id}>
              {index > 0 && !isPunctuation(word) ? ' ' : ''}
              <span
                onClick={() => playFrom(word)}
                title={`Play from ${formatTime(word.start)}`}
                className={cn(
                  'cursor-pointer rounded transition-colors duration-150 hover:bg-maize/40',
                  index === activeIndex && 'bg-maize'
                )}
              >
                {word.text.trim()}
              </span>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
