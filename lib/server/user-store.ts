import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto';
import type { AppPermission, AppRole } from '@/lib/auth/permissions';
import { getEffectivePermissions, isAppRole, normalizePermissions } from '@/lib/auth/permissions';
import { SESSION_DURATION_MS, type SessionTokenPayload } from '@/lib/auth/session';

const AUTH_DIR = path.join(process.cwd(), 'data', 'auth');
const USERS_DIR = path.join(AUTH_DIR, 'users');
const SESSIONS_DIR = path.join(AUTH_DIR, 'sessions');

export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  role: AppRole;
  enabled: boolean;
  passwordHash: string;
  grantedPermissions: AppPermission[];
  revokedPermissions: AppPermission[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  username: string;
  role: AppRole;
  displayName: string;
  permissions: AppPermission[];
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SafeUserRecord {
  id: string;
  username: string;
  displayName: string;
  role: AppRole;
  enabled: boolean;
  grantedPermissions: AppPermission[];
  revokedPermissions: AppPermission[];
  effectivePermissions: AppPermission[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserWithStats extends SafeUserRecord {
  activeSessionCount: number;
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeJsonFileAtomic(filePath: string, data: unknown) {
  await ensureDir(path.dirname(filePath));
  const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempFilePath, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tempFilePath, filePath);
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function userFilePath(id: string) {
  return path.join(USERS_DIR, `${id}.json`);
}

function sessionFilePath(id: string) {
  return path.join(SESSIONS_DIR, `${id}.json`);
}

function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, saltHex, hashHex] = passwordHash.split('$');
  if (algorithm !== 'scrypt' || !saltHex || !hashHex) {
    return false;
  }
  const derived = scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
  return timingSafeEqual(derived, Buffer.from(hashHex, 'hex'));
}

function sanitizeUserRecord(user: UserRecord): SafeUserRecord {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    enabled: user.enabled,
    grantedPermissions: user.grantedPermissions,
    revokedPermissions: user.revokedPermissions,
    effectivePermissions: getEffectivePermissions(user),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    ...(user.lastLoginAt ? { lastLoginAt: user.lastLoginAt } : {}),
  };
}

function buildSeedUsers() {
  const now = new Date().toISOString();
  return [
    {
      id: 'seed-admin',
      username: normalizeUsername(process.env.OPENMAIC_ADMIN_USERNAME || 'admin'),
      displayName: process.env.OPENMAIC_ADMIN_DISPLAY_NAME || 'Platform Admin',
      role: 'admin' as const,
      enabled: true,
      passwordHash: hashPassword(
        process.env.OPENMAIC_ADMIN_PASSWORD || 'change-me-admin-password',
      ),
      grantedPermissions: [],
      revokedPermissions: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-creator',
      username: normalizeUsername(process.env.OPENMAIC_CREATOR_USERNAME || 'creator'),
      displayName: process.env.OPENMAIC_CREATOR_DISPLAY_NAME || 'Course Creator',
      role: 'creator' as const,
      enabled: true,
      passwordHash: hashPassword(
        process.env.OPENMAIC_CREATOR_PASSWORD || 'change-me-creator-password',
      ),
      grantedPermissions: [],
      revokedPermissions: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-learner',
      username: normalizeUsername(process.env.OPENMAIC_LEARNER_USERNAME || 'learner'),
      displayName: process.env.OPENMAIC_LEARNER_DISPLAY_NAME || 'Training Learner',
      role: 'learner' as const,
      enabled: true,
      passwordHash: hashPassword(
        process.env.OPENMAIC_LEARNER_PASSWORD || 'change-me-learner-password',
      ),
      grantedPermissions: [],
      revokedPermissions: [],
      createdAt: now,
      updatedAt: now,
    },
  ] satisfies UserRecord[];
}

export async function ensureAuthStorage() {
  await ensureDir(USERS_DIR);
  await ensureDir(SESSIONS_DIR);

  const files = await fs.readdir(USERS_DIR);
  if (files.some((name) => name.endsWith('.json'))) {
    return;
  }

  const seeds = buildSeedUsers();
  await Promise.all(seeds.map((user) => writeJsonFileAtomic(userFilePath(user.id), user)));
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function listUserRecords(): Promise<UserRecord[]> {
  await ensureAuthStorage();
  const files = (await fs.readdir(USERS_DIR)).filter((name) => name.endsWith('.json')).sort();
  const users = await Promise.all(
    files.map(async (name) => readJsonFile<UserRecord>(path.join(USERS_DIR, name))),
  );
  return users.filter((user): user is UserRecord => user != null);
}

export async function listSessions(): Promise<SessionRecord[]> {
  await ensureAuthStorage();
  const files = (await fs.readdir(SESSIONS_DIR)).filter((name) => name.endsWith('.json')).sort();
  const sessions = await Promise.all(
    files.map(async (name) => readJsonFile<SessionRecord>(path.join(SESSIONS_DIR, name))),
  );
  const now = Date.now();
  const active: SessionRecord[] = [];

  for (const session of sessions) {
    if (!session) continue;
    if (new Date(session.expiresAt).getTime() <= now) {
      await fs.rm(sessionFilePath(session.id), { force: true });
      continue;
    }
    active.push(session);
  }

  return active.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getUserRecordById(id: string) {
  await ensureAuthStorage();
  return readJsonFile<UserRecord>(userFilePath(id));
}

export async function getUserRecordByUsername(username: string) {
  const normalized = normalizeUsername(username);
  const users = await listUserRecords();
  return users.find((user) => user.username === normalized) || null;
}

async function assertUsernameAvailable(username: string, excludeUserId?: string) {
  const normalized = normalizeUsername(username);
  const users = await listUserRecords();
  const conflict = users.find((user) => user.username === normalized && user.id !== excludeUserId);
  if (conflict) {
    throw new Error('Username already exists');
  }
}

export async function createUserRecord(input: {
  username: string;
  displayName: string;
  role: AppRole;
  password: string;
  enabled?: boolean;
  grantedPermissions?: string[];
  revokedPermissions?: string[];
}) {
  await assertUsernameAvailable(input.username);
  const now = new Date().toISOString();
  const user: UserRecord = {
    id: randomUUID(),
    username: normalizeUsername(input.username),
    displayName: input.displayName.trim(),
    role: input.role,
    enabled: input.enabled ?? true,
    passwordHash: hashPassword(input.password),
    grantedPermissions: normalizePermissions(input.grantedPermissions),
    revokedPermissions: normalizePermissions(input.revokedPermissions),
    createdAt: now,
    updatedAt: now,
  };
  await writeJsonFileAtomic(userFilePath(user.id), user);
  return sanitizeUserRecord(user);
}

export async function updateUserRecord(
  id: string,
  updates: Partial<{
    username: string;
    displayName: string;
    role: string;
    enabled: boolean;
    grantedPermissions: string[];
    revokedPermissions: string[];
  }>,
) {
  const existing = await getUserRecordById(id);
  if (!existing) {
    throw new Error('User not found');
  }

  if (updates.username && normalizeUsername(updates.username) !== existing.username) {
    await assertUsernameAvailable(updates.username, id);
  }

  const nextRole =
    typeof updates.role === 'string' && isAppRole(updates.role) ? updates.role : existing.role;
  const nextEnabled = typeof updates.enabled === 'boolean' ? updates.enabled : existing.enabled;

  if ((existing.role === 'admin' && nextRole !== 'admin') || (existing.role === 'admin' && !nextEnabled)) {
    const users = await listUserRecords();
    const remainingEnabledAdmins = users.filter(
      (user) => user.id !== id && user.role === 'admin' && user.enabled,
    );
    if (remainingEnabledAdmins.length === 0) {
      throw new Error('At least one enabled admin account must remain');
    }
  }

  const updated: UserRecord = {
    ...existing,
    username: updates.username ? normalizeUsername(updates.username) : existing.username,
    displayName: updates.displayName?.trim() || existing.displayName,
    role: nextRole,
    enabled: nextEnabled,
    grantedPermissions: updates.grantedPermissions
      ? normalizePermissions(updates.grantedPermissions)
      : existing.grantedPermissions,
    revokedPermissions: updates.revokedPermissions
      ? normalizePermissions(updates.revokedPermissions)
      : existing.revokedPermissions,
    updatedAt: new Date().toISOString(),
  };

  await writeJsonFileAtomic(userFilePath(id), updated);
  return sanitizeUserRecord(updated);
}

export async function resetUserPassword(id: string, password: string) {
  const existing = await getUserRecordById(id);
  if (!existing) {
    throw new Error('User not found');
  }
  const updated: UserRecord = {
    ...existing,
    passwordHash: hashPassword(password),
    updatedAt: new Date().toISOString(),
  };
  await writeJsonFileAtomic(userFilePath(id), updated);
  await revokeSessionsForUser(id);
  return sanitizeUserRecord(updated);
}

export async function deleteUserRecord(id: string) {
  const existing = await getUserRecordById(id);
  if (!existing) {
    throw new Error('User not found');
  }

  const users = await listUserRecords();
  const enabledAdmins = users.filter((user) => user.role === 'admin' && user.enabled && user.id !== id);
  if (existing.role === 'admin' && existing.enabled && enabledAdmins.length === 0) {
    throw new Error('At least one enabled admin account must remain');
  }

  await fs.rm(userFilePath(id), { force: true });
  await revokeSessionsForUser(id);
}

export async function authenticateUser(username: string, password: string) {
  const user = await getUserRecordByUsername(username);
  if (!user || !user.enabled) {
    return null;
  }
  if (!verifyPassword(password, user.passwordHash)) {
    return null;
  }
  return sanitizeUserRecord(user);
}

export async function createSessionForUser(
  user: SafeUserRecord,
  context: {
    ipAddress?: string;
    userAgent?: string;
  } = {},
) {
  await ensureAuthStorage();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);
  const session: SessionRecord = {
    id: randomUUID(),
    userId: user.id,
    username: user.username,
    role: user.role,
    displayName: user.displayName,
    permissions: user.effectivePermissions,
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    ...(context.ipAddress ? { ipAddress: context.ipAddress } : {}),
    ...(context.userAgent ? { userAgent: context.userAgent } : {}),
  };
  await writeJsonFileAtomic(sessionFilePath(session.id), session);

  const storedUser = await getUserRecordById(user.id);
  if (storedUser) {
    const updatedUser: UserRecord = {
      ...storedUser,
      lastLoginAt: now.toISOString(),
      updatedAt: storedUser.updatedAt,
    };
    await writeJsonFileAtomic(userFilePath(user.id), updatedUser);
  }

  return {
    session,
    tokenPayload: {
      sessionId: session.id,
      userId: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
      permissions: user.effectivePermissions,
      expiresAt: expiresAt.getTime(),
    } satisfies SessionTokenPayload,
  };
}

export async function getSessionRecordById(id: string) {
  await ensureAuthStorage();
  const session = await readJsonFile<SessionRecord>(sessionFilePath(id));
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await fs.rm(sessionFilePath(id), { force: true });
    return null;
  }
  return session;
}

export async function revokeSession(sessionId: string) {
  await fs.rm(sessionFilePath(sessionId), { force: true });
}

export async function revokeSessionsForUser(userId: string) {
  const sessions = await listSessions();
  await Promise.all(
    sessions.filter((session) => session.userId === userId).map((session) => revokeSession(session.id)),
  );
}

export async function listSessionsForUser(userId: string) {
  const sessions = await listSessions();
  return sessions.filter((session) => session.userId === userId);
}

export async function updateSessionLastSeen(sessionId: string) {
  const session = await getSessionRecordById(sessionId);
  if (!session) return null;
  const updated: SessionRecord = {
    ...session,
    lastSeenAt: new Date().toISOString(),
  };
  await writeJsonFileAtomic(sessionFilePath(sessionId), updated);
  return updated;
}

export async function getUserWithStatsList(): Promise<UserWithStats[]> {
  const [users, sessions] = await Promise.all([listUserRecords(), listSessions()]);
  return users
    .map((user) => {
      const activeSessionCount = sessions.filter((session) => session.userId === user.id).length;
      return {
        ...sanitizeUserRecord(user),
        activeSessionCount,
      };
    })
    .sort((a, b) => a.username.localeCompare(b.username));
}

export async function getValidatedSessionFromTokenPayload(payload: SessionTokenPayload) {
  const [session, user] = await Promise.all([
    getSessionRecordById(payload.sessionId),
    getUserRecordById(payload.userId),
  ]);

  if (!session || !user || !user.enabled) {
    return null;
  }

  if (session.userId !== user.id) {
    return null;
  }

  const safeUser = sanitizeUserRecord(user);
  const effectivePermissions = safeUser.effectivePermissions;

  return {
    sessionId: session.id,
    userId: user.id,
    username: user.username,
    role: user.role,
    displayName: user.displayName,
    permissions: effectivePermissions,
    expiresAt: new Date(session.expiresAt).getTime(),
    enabled: user.enabled,
  };
}

export async function countUserSessions(userId: string) {
  const sessions = await listSessionsForUser(userId);
  return sessions.length;
}

export async function hasAnyUsers() {
  await ensureAuthStorage();
  return fileExists(USERS_DIR);
}
