import { NextRequest, NextResponse } from 'next/server';
import { apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  getPostLoginDestination,
  getSessionCookieOptions,
} from '@/lib/auth/session';
import { authenticateUser, createSessionForUser } from '@/lib/server/user-store';

function getClientIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body.username || '').trim();
    const password = String(body.password || '');

    if (!username || !password) {
      return apiError(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD,
        400,
        'Missing required fields: username, password',
      );
    }

    const user = await authenticateUser(username, password);
    if (!user) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 401, 'Invalid username or password');
    }

    const { session, tokenPayload } = await createSessionForUser(user, {
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
    });

    const token = await createSessionToken(tokenPayload);
    const response = NextResponse.json({
      success: true,
      role: user.role,
      displayName: user.displayName,
      permissions: user.effectivePermissions,
      redirectTo: getPostLoginDestination(user.role),
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions(new Date(session.expiresAt).getTime()));
    return response;
  } catch (error) {
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to login',
      error instanceof Error ? error.message : String(error),
    );
  }
}
