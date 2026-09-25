import type { Metadata } from 'next';
import songsData from '@/data/songs.json';
import type { Genre, Song } from '@/lib/types';
import { IntroductionBrowser } from '@/components/review/IntroductionBrowser';

export const metadata: Metadata = {
  title: 'Music introductions · Serendipity',
  description: 'All spoken music introductions used in the Serendipity experiment, per song.',
};

interface ReviewPageProps {
  searchParams: Promise<{ song?: string; style?: string }>;
}

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const { song, style } = await searchParams;

  return (
    <IntroductionBrowser
      genres={songsData.genres as Genre[]}
      songs={songsData.songs as Song[]}
      initialSongId={song}
      initialStyle={style === 'immersive' ? 'immersive' : 'informative'}
    />
  );
}
