'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { Transcript, Word } from '@/lib/types';

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

interface IntroductionTranscriptProps {
  transcriptUrl: string;
}

export function IntroductionTranscript({ transcriptUrl }: IntroductionTranscriptProps) {
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loadError, setLoadError] = useState(false);
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

  const text = useMemo(
    () =>
      transcript
        ? transcriptToText(
            [...transcript.subtitles]
              .sort((a, b) => a.timing.start - b.timing.start)
              .flatMap((subtitle) => subtitle.words)
          )
        : '',
    [transcript]
  );

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context); the text can still be selected manually
    }
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-dark-purple">Transcript</h3>
        {transcript && (
          <div className="flex items-center gap-3 text-sm text-dark-purple/60">
            <span>{text.split(/\s+/).filter((token) => /\w/.test(token)).length} words</span>
            <button
              type="button"
              onClick={copyText}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-dark-purple/70 hover:bg-ivory hover:text-dark-purple"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy text'}
            </button>
          </div>
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
        <p className="leading-relaxed text-dark-purple">{text}</p>
      )}
    </div>
  );
}
