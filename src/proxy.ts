import { NextResponse, type NextRequest } from 'next/server';
import { REVIEW_COOKIE_NAME, isValidReviewToken } from '@/lib/review-auth';

// The original songs in public/review-audio are only served to reviewers logged in
// on /review. The public experiment uses the placeholder songs in public/data.
export function proxy(request: NextRequest) {
  if (!isValidReviewToken(request.cookies.get(REVIEW_COOKIE_NAME)?.value)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/review-audio/:path*',
};
