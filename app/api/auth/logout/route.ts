import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  getClearedSessionCookieOptions,
  verifySessionToken,
} from '@/lib/auth/session';
import { revokeSession } from '@/lib/server/user-store';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const payload = await verifySessionToken(token);

  if (payload?.sessionId) {
    await revokeSession(payload.sessionId);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE_NAME, '', getClearedSessionCookieOptions());
  return response;
}
