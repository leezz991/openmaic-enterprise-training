import Link from 'next/link';
import { ShieldCheck, Users } from 'lucide-react';
import { LogoutButton } from '@/components/enterprise/logout-button';
import { AdminUserManager } from '@/components/enterprise/admin-user-manager';
import { requirePermission, sessionHasPermission } from '@/lib/server/auth';
import { getUserWithStatsList } from '@/lib/server/user-store';

export default async function AdminUsersPage() {
  const session = await requirePermission('users.manage');
  const users = await getUserWithStatsList();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-6 py-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-[32px] border border-slate-200/70 bg-white/85 px-8 py-7 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <Users className="h-4 w-4" />
                简而言之AI交互学习平台
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">用户与权限管理</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                在这里统一管理用户、角色、权限覆盖项和活跃会话。每次登录都会生成独立服务端会话，支持多人并发使用平台。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {sessionHasPermission(session, 'courses.manage') ? (
                <Link
                  href="/admin/courses"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  课程发布
                </Link>
              ) : null}
              {sessionHasPermission(session, 'classroom.access') ? (
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  打开创作工作台
                </Link>
              ) : null}
              <LogoutButton />
            </div>
          </div>
        </header>

        <AdminUserManager initialUsers={users} />
      </div>
    </main>
  );
}
