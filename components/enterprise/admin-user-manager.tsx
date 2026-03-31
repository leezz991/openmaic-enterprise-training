'use client';

import { useMemo, useState } from 'react';
import {
  APP_PERMISSIONS,
  APP_ROLES,
  type AppPermission,
  type AppRole,
  getRolePermissions,
} from '@/lib/auth/permissions';

interface SessionView {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
}

interface ManagedUser {
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
  activeSessionCount: number;
}

interface AdminUserManagerProps {
  initialUsers: ManagedUser[];
}

const PERMISSION_LABELS: Record<AppPermission, string> = {
  'portal.access': '访问课程门户',
  'courses.read': '查看课程目录',
  'courses.learn': '学习已发布课程',
  'courses.manage': '管理课程元数据',
  'courses.publish': '发布或下架课程',
  'classroom.access': '进入创作工作台',
  'classroom.generate': '执行课程生成流程',
  'users.read': '查看用户',
  'users.manage': '管理用户',
  'sessions.read': '查看会话',
  'sessions.manage': '吊销会话',
};

const ROLE_LABELS: Record<AppRole, string> = {
  admin: '管理员',
  creator: '创作者',
  learner: '学员',
};

export function AdminUserManager({ initialUsers }: AdminUserManagerProps) {
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers);
  const [message, setMessage] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [sessionMap, setSessionMap] = useState<Record<string, SessionView[]>>({});
  const [loadingSessionsId, setLoadingSessionsId] = useState<string | null>(null);
  const [expandedSessionUserId, setExpandedSessionUserId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    displayName: '',
    password: '',
    role: 'learner' as AppRole,
    enabled: true,
  });

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.username.localeCompare(b.username)),
    [users],
  );

  function updateUser(id: string, updates: Partial<ManagedUser>) {
    setUsers((current) => current.map((user) => (user.id === id ? { ...user, ...updates } : user)));
  }

  function togglePermission(id: string, type: 'grantedPermissions' | 'revokedPermissions', permission: AppPermission) {
    setUsers((current) =>
      current.map((user) => {
        if (user.id !== id) return user;
        const currentSet = new Set(user[type]);
        if (currentSet.has(permission)) {
          currentSet.delete(permission);
        } else {
          currentSet.add(permission);
        }

        const nextGranted =
          type === 'grantedPermissions'
            ? Array.from(currentSet).sort()
            : user.grantedPermissions.filter((item) => item !== permission);
        const nextRevoked =
          type === 'revokedPermissions'
            ? Array.from(currentSet).sort()
            : user.revokedPermissions.filter((item) => item !== permission);

        const effectiveBase = new Set(getRolePermissions(user.role).filter((item) => !nextRevoked.includes(item)));
        for (const item of nextGranted) effectiveBase.add(item);

        return {
          ...user,
          grantedPermissions: nextGranted,
          revokedPermissions: nextRevoked,
          effectivePermissions: Array.from(effectiveBase).sort(),
        };
      }),
    );
  }

  async function createUser() {
    setSavingId('new');
    setMessage('');
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || '创建用户失败');
      }

      const created = result.user as ManagedUser;
      setUsers((current) => [...current, { ...created, activeSessionCount: 0 }]);
      setNewUser({
        username: '',
        displayName: '',
        password: '',
        role: 'learner',
        enabled: true,
      });
      setMessage(`已创建用户 ${created.username}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '创建用户失败');
    } finally {
      setSavingId(null);
    }
  }

  async function saveUser(user: ManagedUser) {
    setSavingId(user.id);
    setMessage('');
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          enabled: user.enabled,
          grantedPermissions: user.grantedPermissions,
          revokedPermissions: user.revokedPermissions,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || '保存用户失败');
      }
      const updated = result.user as ManagedUser;
      updateUser(user.id, updated);
      setMessage(`已保存 ${updated.username}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存用户失败');
    } finally {
      setSavingId(null);
    }
  }

  async function resetPassword(id: string) {
    const password = passwordDrafts[id]?.trim();
    if (!password) {
      setMessage('请先输入新密码');
      return;
    }

    setSavingId(id);
    setMessage('');
    try {
      const response = await fetch(`/api/users/${id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || '重置密码失败');
      }
      setPasswordDrafts((current) => ({ ...current, [id]: '' }));
      setMessage('密码已重置，且全部活跃会话已下线');
      updateUser(id, { activeSessionCount: 0 });
      setSessionMap((current) => ({ ...current, [id]: [] }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '重置密码失败');
    } finally {
      setSavingId(null);
    }
  }

  async function removeUser(id: string) {
    setSavingId(id);
    setMessage('');
    try {
      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || '删除用户失败');
      }
      setUsers((current) => current.filter((user) => user.id !== id));
      setMessage('用户已删除');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '删除用户失败');
    } finally {
      setSavingId(null);
    }
  }

  async function loadSessions(userId: string) {
    setLoadingSessionsId(userId);
    setMessage('');
    try {
      const response = await fetch(`/api/users/${userId}/sessions`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || '加载会话失败');
      }
      setSessionMap((current) => ({ ...current, [userId]: result.sessions as SessionView[] }));
      setExpandedSessionUserId((current) => (current === userId ? null : userId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '加载会话失败');
    } finally {
      setLoadingSessionsId(null);
    }
  }

  async function revokeAllSessions(userId: string) {
    setSavingId(userId);
    setMessage('');
    try {
      const response = await fetch(`/api/users/${userId}/sessions`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || '吊销会话失败');
      }
      updateUser(userId, { activeSessionCount: 0 });
      setSessionMap((current) => ({ ...current, [userId]: [] }));
      setMessage('已吊销全部会话');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '吊销会话失败');
    } finally {
      setSavingId(null);
    }
  }

  async function revokeSingleSession(userId: string, sessionId: string) {
    setSavingId(sessionId);
    setMessage('');
    try {
      const response = await fetch(`/api/users/${userId}/sessions/${sessionId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || '吊销会话失败');
      }
      setSessionMap((current) => ({
        ...current,
        [userId]: (current[userId] || []).filter((session) => session.id !== sessionId),
      }));
      updateUser(userId, {
        activeSessionCount: Math.max(
          0,
          (users.find((item) => item.id === userId)?.activeSessionCount || 1) - 1,
        ),
      });
      setMessage('会话已吊销');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '吊销会话失败');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          {message}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-slate-200/70 bg-white/90 p-6 shadow-sm backdrop-blur">
        <h2 className="text-xl font-semibold text-slate-950">创建用户</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-5">
          <input
            value={newUser.username}
            onChange={(event) => setNewUser((current) => ({ ...current, username: event.target.value }))}
            placeholder="账号"
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />
          <input
            value={newUser.displayName}
            onChange={(event) => setNewUser((current) => ({ ...current, displayName: event.target.value }))}
            placeholder="显示名称"
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />
          <input
            value={newUser.password}
            onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))}
            placeholder="初始密码"
            type="password"
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />
          <select
            value={newUser.role}
            onChange={(event) => setNewUser((current) => ({ ...current, role: event.target.value as AppRole }))}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          >
            {APP_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={createUser}
            disabled={savingId === 'new'}
            className="rounded-2xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {savingId === 'new' ? '创建中...' : '创建用户'}
          </button>
        </div>
      </section>

      {sortedUsers.map((user) => {
        const sessions = sessionMap[user.id] || [];
        const pending = savingId === user.id;

        return (
          <section
            key={user.id}
            className="rounded-[28px] border border-slate-200/70 bg-white/90 p-6 shadow-sm backdrop-blur"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <span>{user.id}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                    {ROLE_LABELS[user.role]}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] ${
                      user.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {user.enabled ? '启用' : '停用'}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-slate-950">{user.displayName}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  最近登录：{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '从未登录'}
                </p>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
                活跃会话：{user.activeSessionCount}
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">账号</label>
                  <input
                    value={user.username}
                    onChange={(event) => updateUser(user.id, { username: event.target.value })}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">显示名称</label>
                  <input
                    value={user.displayName}
                    onChange={(event) => updateUser(user.id, { displayName: event.target.value })}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">角色</label>
                    <select
                      value={user.role}
                      onChange={(event) => {
                        const nextRole = event.target.value as AppRole;
                        const effective = Array.from(
                          new Set(
                            getRolePermissions(nextRole).filter(
                              (item) => !user.revokedPermissions.includes(item),
                            ),
                          ),
                        );
                        for (const item of user.grantedPermissions) effective.push(item);
                        updateUser(user.id, {
                          role: nextRole,
                          effectivePermissions: Array.from(new Set(effective)).sort(),
                        });
                      }}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    >
                      {APP_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">状态</label>
                    <select
                      value={user.enabled ? 'enabled' : 'disabled'}
                      onChange={(event) => updateUser(user.id, { enabled: event.target.value === 'enabled' })}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    >
                      <option value="enabled">启用</option>
                      <option value="disabled">停用</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">重置密码</label>
                  <div className="flex gap-3">
                    <input
                      value={passwordDrafts[user.id] || ''}
                      onChange={(event) =>
                        setPasswordDrafts((current) => ({ ...current, [user.id]: event.target.value }))
                      }
                      type="password"
                      placeholder="输入新密码"
                      className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => resetPassword(user.id)}
                      disabled={pending}
                      className="rounded-2xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      重置
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-700">权限覆盖</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {APP_PERMISSIONS.map((permission) => (
                      <div key={permission} className="rounded-2xl border border-slate-200 p-3">
                        <div className="text-sm font-medium text-slate-900">
                          {PERMISSION_LABELS[permission]}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <label className="flex items-center gap-2 text-xs text-slate-600">
                            <input
                              type="checkbox"
                              checked={user.grantedPermissions.includes(permission)}
                              onChange={() => togglePermission(user.id, 'grantedPermissions', permission)}
                            />
                            授予
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-600">
                            <input
                              type="checkbox"
                              checked={user.revokedPermissions.includes(permission)}
                              onChange={() => togglePermission(user.id, 'revokedPermissions', permission)}
                            />
                            撤销
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  生效权限：{user.effectivePermissions.join(', ') || '无'}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => saveUser(user)}
                disabled={pending}
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {pending ? '保存中...' : '保存用户'}
              </button>
              <button
                type="button"
                onClick={() => loadSessions(user.id)}
                disabled={loadingSessionsId === user.id}
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingSessionsId === user.id ? '加载会话中...' : '查看会话'}
              </button>
              <button
                type="button"
                onClick={() => revokeAllSessions(user.id)}
                disabled={pending}
                className="rounded-full border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                全部下线
              </button>
              <button
                type="button"
                onClick={() => removeUser(user.id)}
                disabled={pending}
                className="rounded-full border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                删除用户
              </button>
            </div>

            {expandedSessionUserId === user.id ? (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 text-sm font-medium text-slate-700">活跃会话</div>
                {sessions.length === 0 ? (
                  <div className="text-sm text-slate-500">当前没有活跃会话。</div>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <div className="min-w-0 text-sm text-slate-600">
                          <div className="font-medium text-slate-900">{session.id}</div>
                          <div>创建时间：{new Date(session.createdAt).toLocaleString()}</div>
                          <div>过期时间：{new Date(session.expiresAt).toLocaleString()}</div>
                          {session.ipAddress ? <div>IP: {session.ipAddress}</div> : null}
                          {session.userAgent ? <div className="truncate">UA: {session.userAgent}</div> : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => revokeSingleSession(user.id, session.id)}
                          disabled={savingId === session.id}
                          className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingId === session.id ? '吊销中...' : '吊销'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
