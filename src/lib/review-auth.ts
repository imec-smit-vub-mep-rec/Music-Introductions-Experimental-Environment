import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

export const REVIEW_COOKIE_NAME = 'review-auth';
export const REVIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * The reviewer password comes from the REVIEW_PASSWORD environment variable.
 * There is deliberately no fallback: without it the review page stays locked.
 */
export function getReviewPassword(): string | null {
  const password = process.env.REVIEW_PASSWORD;
  return password && password.length > 0 ? password : null;
}

/**
 * Cookie value derived from the password, so it cannot be forged without
 * knowing the password and is invalidated when the password changes.
 */
export function createReviewToken(password: string): string {
  return createHmac('sha256', password).update('serendipity-review-access').digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

export function isValidReviewPassword(candidate: string): boolean {
  const password = getReviewPassword();
  if (!password) return false;
  return safeEqual(createReviewToken(candidate), createReviewToken(password));
}

export function isValidReviewToken(token: string | undefined): boolean {
  const password = getReviewPassword();
  return !!password && !!token && safeEqual(token, createReviewToken(password));
}

export async function isReviewAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidReviewToken(cookieStore.get(REVIEW_COOKIE_NAME)?.value);
}
