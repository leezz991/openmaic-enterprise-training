import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';
import { CLASSROOMS_DIR, readClassroom, writeJsonFileAtomic } from '@/lib/server/classroom-storage';

export type CourseStatus = 'draft' | 'published' | 'archived';
export type CourseVisibility = 'internal' | 'private';

export interface CourseMetadata {
  id: string;
  title: string;
  summary: string;
  cover: string;
  tags: string[];
  status: CourseStatus;
  visibility: CourseVisibility;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseCatalogEntry extends CourseMetadata {
  classroomExists: boolean;
}

const COURSE_CATALOG_DIR = path.join(process.cwd(), 'data', 'course-catalog');
const COURSE_CATALOG_FILE = path.join(COURSE_CATALOG_DIR, 'index.json');

async function ensureCatalogDir() {
  await fs.mkdir(COURSE_CATALOG_DIR, { recursive: true });
}

async function readCatalogFile() {
  try {
    const raw = await fs.readFile(COURSE_CATALOG_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as { courses?: Record<string, CourseMetadata> };
    return parsed.courses || {};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function writeCatalogFile(courses: Record<string, CourseMetadata>) {
  await ensureCatalogDir();
  await writeJsonFileAtomic(COURSE_CATALOG_FILE, { courses });
}

function normalizeTags(tags: string[] | string | undefined) {
  if (!tags) return [];
  const source = Array.isArray(tags) ? tags : tags.split(',');
  return source
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

async function listClassroomIds() {
  try {
    const entries = await fs.readdir(CLASSROOMS_DIR, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => entry.name.replace(/\.json$/i, ''));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

function buildDefaultMetadata(
  id: string,
  classroom: NonNullable<Awaited<ReturnType<typeof readClassroom>>>,
  existing?: CourseMetadata,
): CourseMetadata {
  const stage = classroom.stage;
  const fallbackTimestamp = classroom.createdAt;
  const stageUpdatedAt =
    typeof stage.updatedAt === 'number'
      ? new Date(stage.updatedAt).toISOString()
      : fallbackTimestamp;

  return {
    id,
    title: existing?.title || stage.name || `Course ${id}`,
    summary: existing?.summary || stage.description || 'Internal training course',
    cover: existing?.cover || '',
    tags: existing?.tags || [],
    status: existing?.status || 'draft',
    visibility: existing?.visibility || 'internal',
    author: existing?.author || 'Training Admin',
    createdAt: existing?.createdAt || fallbackTimestamp,
    updatedAt: existing?.updatedAt || stageUpdatedAt,
  };
}

export async function listCourseCatalog(options?: { includeUnpublished?: boolean }) {
  const catalog = await readCatalogFile();
  const classroomIds = await listClassroomIds();
  const ids = Array.from(new Set([...classroomIds, ...Object.keys(catalog)]));

  const entries = await Promise.all(
    ids.map(async (id) => {
      const classroom = await readClassroom(id);
      const existing = catalog[id];
      if (!classroom && !existing) {
        return null;
      }

      const metadata = classroom
        ? buildDefaultMetadata(id, classroom, existing)
        : {
            ...existing!,
            tags: normalizeTags(existing?.tags),
          };

      return {
        ...metadata,
        tags: normalizeTags(metadata.tags),
        classroomExists: Boolean(classroom),
      } satisfies CourseCatalogEntry;
    }),
  );

  return entries
    .filter((entry): entry is CourseCatalogEntry => Boolean(entry))
    .filter((entry) => {
      if (!options?.includeUnpublished) {
        return (
          entry.classroomExists &&
          entry.status === 'published' &&
          entry.visibility === 'internal'
        );
      }
      return entry.classroomExists || entry.status !== 'published';
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getCourseCatalogEntry(id: string) {
  const catalog = await readCatalogFile();
  const classroom = await readClassroom(id);
  const existing = catalog[id];

  if (!classroom && !existing) {
    return null;
  }

  const metadata = classroom
    ? buildDefaultMetadata(id, classroom, existing)
    : {
        ...existing!,
        tags: normalizeTags(existing?.tags),
      };

  return {
    metadata: {
      ...metadata,
      tags: normalizeTags(metadata.tags),
    },
    classroom,
  };
}

export async function saveCourseMetadata(
  input: Partial<CourseMetadata> & Pick<CourseMetadata, 'id' | 'title'>,
) {
  const course = await getCourseCatalogEntry(input.id);
  if (!course?.classroom) {
    throw new Error('Classroom not found');
  }

  const catalog = await readCatalogFile();
  const current = catalog[input.id];
  const nextMetadata: CourseMetadata = {
    ...buildDefaultMetadata(input.id, course.classroom, current),
    ...current,
    ...input,
    tags: normalizeTags(input.tags ?? current?.tags ?? course.metadata.tags),
    summary:
      input.summary !== undefined
        ? input.summary.trim()
        : current?.summary || course.metadata.summary,
    cover:
      input.cover !== undefined ? input.cover.trim() : current?.cover || course.metadata.cover,
    author:
      input.author !== undefined
        ? input.author.trim()
        : current?.author || course.metadata.author,
    status: input.status || current?.status || course.metadata.status,
    visibility: input.visibility || current?.visibility || course.metadata.visibility,
    updatedAt: new Date().toISOString(),
  };

  catalog[input.id] = nextMetadata;
  await writeCatalogFile(catalog);
  return nextMetadata;
}

export async function updateCourseStatus(id: string, status: CourseStatus) {
  const course = await getCourseCatalogEntry(id);
  if (!course?.classroom) {
    throw new Error('Classroom not found');
  }

  return saveCourseMetadata({
    id,
    title: course.metadata.title,
    status,
  });
}
