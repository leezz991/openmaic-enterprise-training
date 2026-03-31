export const APP_ROLES = ['admin', 'creator', 'learner'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const APP_PERMISSIONS = [
  'portal.access',
  'courses.read',
  'courses.learn',
  'courses.manage',
  'courses.publish',
  'classroom.access',
  'classroom.generate',
  'users.read',
  'users.manage',
  'sessions.read',
  'sessions.manage',
] as const;

export type AppPermission = (typeof APP_PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<AppRole, AppPermission[]> = {
  admin: [...APP_PERMISSIONS],
  creator: [
    'portal.access',
    'courses.read',
    'courses.learn',
    'courses.manage',
    'courses.publish',
    'classroom.access',
    'classroom.generate',
  ],
  learner: ['portal.access', 'courses.read', 'courses.learn'],
};

export function isAppRole(value: string): value is AppRole {
  return APP_ROLES.includes(value as AppRole);
}

export function isAppPermission(value: string): value is AppPermission {
  return APP_PERMISSIONS.includes(value as AppPermission);
}

export function normalizePermissions(values: string[] | undefined): AppPermission[] {
  if (!values) return [];
  return Array.from(new Set(values.filter(isAppPermission))).sort();
}

export function getRolePermissions(role: AppRole): AppPermission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function getEffectivePermissions(config: {
  role: AppRole;
  grantedPermissions?: string[];
  revokedPermissions?: string[];
}): AppPermission[] {
  const granted = normalizePermissions(config.grantedPermissions);
  const revoked = new Set(normalizePermissions(config.revokedPermissions));
  const base = getRolePermissions(config.role).filter((permission) => !revoked.has(permission));
  return Array.from(new Set([...base, ...granted])).sort();
}

export function hasPermission(
  permissions: readonly AppPermission[] | undefined,
  permission: AppPermission,
): boolean {
  return (permissions || []).includes(permission);
}
