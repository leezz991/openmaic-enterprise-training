import type { AppPermission, AppRole } from '@/lib/auth/permissions';

export interface SessionTokenPayload {
  sessionId: string;
  userId: string;
  username: string;
  role: AppRole;
  displayName: string;
  permissions: AppPermission[];
  expiresAt: number;
}

export interface AuthenticatedSession extends SessionTokenPayload {
  enabled: boolean;
}

export const AUTH_COOKIE_NAME = 'openmaic_session';
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 12;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getSessionSecret() {
  return process.env.OPENMAIC_SESSION_SECRET || 'openmaic-dev-session-secret-change-me';
}

function shouldUseSecureCookies() {
  return process.env.OPENMAIC_SECURE_COOKIES === 'true';
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function stringToBase64Url(value: string) {
  return bytesToBase64Url(encoder.encode(value));
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(normalized + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlToString(value: string) {
  return decoder.decode(base64UrlToBytes(value));
}

async function signValue(value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function createSessionToken(payload: SessionTokenPayload) {
  const encodedPayload = stringToBase64Url(JSON.stringify(payload));
  const signature = await signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionTokenPayload | null> {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = await signValue(encodedPayload);
  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlToString(encodedPayload)) as SessionTokenPayload;
    if (!payload.expiresAt || payload.expiresAt <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions(expiresAt: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: shouldUseSecureCookies(),
    path: '/',
    expires: new Date(expiresAt),
  };
}

export function getClearedSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: shouldUseSecureCookies(),
    path: '/',
    expires: new Date(0),
  };
}

export function isRouteMatch(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function getPostLoginDestination(_role: AppRole) {
  return '/courses';
}
