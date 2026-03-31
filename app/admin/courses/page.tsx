import Link from 'next/link';
import { ArrowLeftRight, LibraryBig } from 'lucide-react';
import { AdminCourseManager } from '@/components/enterprise/admin-course-manager';
import { LogoutButton } from '@/components/enterprise/logout-button';
import { requirePermission, sessionHasPermission } from '@/lib/server/auth';
import { listCourseCatalog } from '@/lib/server/course-catalog';

interface AdminCoursesPageProps {
  searchParams?: Promise<{
    courseId?: string;
    persisted?: string;
    warnings?: string;
  }>;
}

export default async function AdminCoursesPage({ searchParams }: AdminCoursesPageProps) {
  const session = await requirePermission('courses.manage');
  const params = (await searchParams) || {};
  const courses = await listCourseCatalog({ includeUnpublished: true });

  const initialMessage =
    params.persisted === '1'
      ? params.warnings === '1'
        ? '课程内容已经固化，但部分媒体上传仍需复核后再发布。'
        : '课程内容已经固化成功，请补充元数据后按需发布。'
      : '';

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-6 py-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-[32px] border border-slate-200/70 bg-white/85 px-8 py-7 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <LibraryBig className="h-4 w-4" />
                简而言之AI交互学习平台
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">课程发布管理</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                统一管理服务端课堂、补充课程元数据，并控制哪些课程会出现在学员门户中。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <ArrowLeftRight className="h-4 w-4" />
                返回课程门户
              </Link>
              {sessionHasPermission(session, 'users.manage') ? (
                <Link
                  href="/admin/users"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  用户管理
                </Link>
              ) : null}
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                打开创作工作台
              </Link>
              <LogoutButton />
            </div>
          </div>
        </header>

        <AdminCourseManager
          initialCourses={courses}
          focusCourseId={params.courseId}
          initialMessage={initialMessage}
        />
      </div>
    </main>
  );
}
