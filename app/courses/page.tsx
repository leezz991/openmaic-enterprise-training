import Link from 'next/link';
import { BookOpenCheck, ExternalLink, Shield, Sparkles, Users } from 'lucide-react';
import { LogoutButton } from '@/components/enterprise/logout-button';
import { requireServerSession, sessionHasPermission } from '@/lib/server/auth';
import { listCourseCatalog } from '@/lib/server/course-catalog';

export default async function CoursesPage() {
  const session = await requireServerSession();
  const courses = await listCourseCatalog();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-6 py-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-[32px] border border-slate-200/70 bg-white/85 px-8 py-7 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <Shield className="h-4 w-4" />
                简而言之AI交互学习平台
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">企业培训课程门户</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                已发布课程全部来自服务端固化的课堂数据。学员会始终停留在培训门户内，不会回到创作工作台。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {sessionHasPermission(session, 'courses.manage') ? (
                <Link
                  href="/admin/courses"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <BookOpenCheck className="h-4 w-4" />
                  课程管理
                </Link>
              ) : null}
              {sessionHasPermission(session, 'users.manage') ? (
                <Link
                  href="/admin/users"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <Users className="h-4 w-4" />
                  用户管理
                </Link>
              ) : null}
              {sessionHasPermission(session, 'classroom.access') ? (
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  打开创作工作台
                </Link>
              ) : null}
              <LogoutButton />
            </div>
          </div>
        </header>

        <section className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">已发布课程</p>
            <p className="text-sm text-slate-400">共 {courses.length} 门</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm text-slate-600 shadow-sm">
            <Sparkles className="h-4 w-4 text-blue-500" />
            服务端持久化课程目录
          </div>
        </section>

        {courses.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-8 py-16 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">当前还没有已发布课程</h2>
            <p className="mt-3 text-sm text-slate-500">
              创作者可先生成课堂并固化，再到管理后台补充信息后发布。
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/learn/${course.id}`}
                className="group overflow-hidden rounded-[30px] border border-slate-200/70 bg-white/90 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_30px_70px_rgba(15,23,42,0.10)]"
              >
                <div className="relative h-52 overflow-hidden bg-[linear-gradient(135deg,#dbeafe_0%,#e2e8f0_45%,#f8fafc_100%)]">
                  {course.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.cover}
                      alt={course.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-end p-6">
                      <div className="rounded-full bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        简而言之AI
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4 p-6">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {course.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h2 className="line-clamp-2 text-xl font-semibold text-slate-950">{course.title}</h2>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                      {course.summary}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>{course.author}</span>
                    <span>{new Date(course.updatedAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
