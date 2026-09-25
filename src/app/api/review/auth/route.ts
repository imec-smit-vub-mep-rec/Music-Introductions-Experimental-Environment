import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  REVIEW_COOKIE_MAX_AGE,
  REVIEW_COOKIE_NAME,
  createReviewToken,
  getReviewPassword,
  isValidReviewPassword,
} from '@/lib/review-auth';

export async function POST(request: NextRequest) {
  try {
    const reviewPassword = getReviewPassword();
    if (!reviewPassword) {
      return NextResponse.json(
        { error: 'Reviewer access is not configured' },
        { status: 503 }
      );
    }

    const { password } = await request.json();

    if (typeof password === 'string' && isValidReviewPassword(password)) {
      const cookieStore = await cookies();
      cookieStore.set(REVIEW_COOKIE_NAME, createReviewToken(reviewPassword), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: REVIEW_COOKIE_MAX_AGE,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  } catch (error) {
    console.error('Review auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(REVIEW_COOKIE_NAME);
  return NextResponse.json({ success: true });
}
