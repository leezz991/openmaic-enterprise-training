'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ExternalLink, Eye, Loader2, Upload } from 'lucide-react';
import type { CourseCatalogEntry, CourseStatus, CourseVisibility } from '@/lib/server/course-catalog';

interface AdminCourseManagerProps {
  initialCourses: CourseCatalogEntry[];
  focusCourseId?: string;
  initialMessage?: string;
}

type DraftState = CourseCatalogEntry;

const STATUS_LABELS: Record<CourseStatus, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已下架',
};

const VISIBILITY_LABELS: Record<CourseVisibility, string> = {
  internal: '内部可见',
  private: '仅后台',
};

export function AdminCourseManager({
  initialCourses,
  focusCourseId,
  initialMessage = '',
}: AdminCourseManagerProps) {
  const [courses, setCourses] = useState<DraftState[]>(initialCourses);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>(initialMessage);

  const sortedCourses = useMemo(() => {
    const ordered = [...courses].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (!focusCourseId) return ordered;

    return ordered.sort((a, b) => {
      if (a.id === focusCourseId) return -1;
      if (b.id === focusCourseId) return 1;
      return 0;
    });
  }, [courses, focusCourseId]);

  function updateDraft(id: string, updates: Partial<DraftState>) {
    setCourses((current) =>
      current.map((course) => (course.id === id ? { ...course, ...updates } : course)),
    );
  }

  async function saveCourse(course: DraftState) {
    setSavingId(course.id);
    setMessage('');
    try {
      const response = await fetch('/api/courses/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(course),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || '保存失败');
      }
      const updatedCourse = result.course as DraftState;
      updateDraft(course.id, updatedCourse);
      setMessage(`课程《${updatedCourse.title}》已保存`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSavingId(null);
    }
  }

  async function updateStatus(id: string, status: CourseStatus) {
    setSavingId(id);
    setMessage('');
    try {
      const response = await fetch(`/api/courses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || '状态更新失败');
      }
      const updatedCourse = result.course as DraftState;
      updateDraft(id, updatedCourse);
      setMessage(`课程状态已更新为${STATUS_LABELS[updatedCourse.status]}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '状态更新失败');
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

      {sortedCourses.map((course) => {
        const pending = savingId === course.id;
        const focused = focusCourseId === course.id;

        return (
          <section
            key={course.id}
            className={`rounded-[28px] border bg-white/90 p-6 shadow-sm backdrop-blur ${
              focused
                ? 'border-blue-300 ring-2 ring-blue-100'
                : 'border-slate-200/70'
            }`}
          >
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <span>{course.id}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                    {STATUS_LABELS[course.status]}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                    {VISIBILITY_LABELS[course.visibility]}
                  </span>
                  {focused ? (
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] text-blue-700">
                      刚刚固化
                    </span>
                  ) : null}
                </div>
                <h3 className="text-xl font-semibold text-slate-950">{course.title}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  最后更新时间：{new Date(course.updatedAt).toLocaleString('zh-CN')}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/classroom/${course.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  原始课堂
                </Link>
                <Link
                  href={`/learn/${course.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <Eye className="h-4 w-4" />
                  学员预览
                </Link>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">课程标题</label>
                  <input
                    value={course.title}
                    onChange={(event) => updateDraft(course.id, { title: event.target.value })}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">课程简介</label>
                  <textarea
                    value={course.summary}
                    onChange={(event) => updateDraft(course.id, { summary: event.target.value })}
                    className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">标签</label>
                  <input
                    value={course.tags.join(', ')}
                    onChange={(event) =>
                      updateDraft(course.id, {
                        tags: event.target.value
                          .split(',')
                          .map((tag) => tag.trim())
                          .filter(Boolean),
                      })
                    }
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                    placeholder="例如：新员工培训，销售规范，产品认知"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">封面链接</label>
                  <input
                    value={course.cover}
                    onChange={(event) => updateDraft(course.id, { cover: event.target.value })}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                    placeholder="可填写图片 URL"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">发布状态</label>
                    <select
                      value={course.status}
                      onChange={(event) =>
                        updateDraft(course.id, { status: event.target.value as CourseStatus })
                      }
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    >
                      <option value="draft">草稿</option>
                      <option value="published">已发布</option>
                      <option value="archived">已下架</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">可见性</label>
                    <select
                      value={course.visibility}
                      onChange={(event) =>
                        updateDraft(course.id, {
                          visibility: event.target.value as CourseVisibility,
                        })
                      }
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    >
                      <option value="internal">内部可见</option>
                      <option value="private">仅后台</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">发布人</label>
                  <input
                    value={course.author}
                    onChange={(event) => updateDraft(course.id, { author: event.target.value })}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                </div>

                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  课程正文仍然来自服务端 `data/classrooms/{course.id}.json`。这里维护的是课程列表展示和发布状态。
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => saveCourse(course)}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                保存课程信息
              </button>

              <button
                type="button"
                onClick={() => updateStatus(course.id, 'published')}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                发布课程
              </button>

              <button
                type="button"
                onClick={() => updateStatus(course.id, 'archived')}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                下架课程
              </button>

              {course.status === 'published' ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  已进入课程门户
                </span>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
