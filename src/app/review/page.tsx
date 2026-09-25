import type { Metadata } from 'next';
import songsData from '@/data/songs.json';
import type { Genre, Song } from '@/lib/types';
import { getReviewPassword, isReviewAuthenticated } from '@/lib/review-auth';
import { IntroductionBrowser } from '@/components/review/IntroductionBrowser';
import { ReviewLogin } from '@/components/review/ReviewLogin';

export const metadata: Metadata = {
  title: 'Music introductions · Serendipity',
  robots: { index: false, follow: false },
};

// Access depends on the request cookie and runtime env, so never prerender
export const dynamic = 'force-dynamic';

interface ReviewPageProps {
  searchParams: Promise<{ song?: string; style?: string }>;
}

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  if (!(await isReviewAuthenticated())) {
    return <ReviewLogin configured={getReviewPassword() !== null} />;
  }

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
