import path from 'path';
import { promises as fs } from 'fs';
import { NextRequest } from 'next/server';
import { apiError, apiSuccess, API_ERROR_CODES } from '@/lib/server/api-response';
import { getServerSession, sessionHasPermission } from '@/lib/server/auth';
import {
  CLASSROOMS_DIR,
  buildRequestOrigin,
  isValidClassroomId,
} from '@/lib/server/classroom-storage';

function sanitizeRelativePath(input: string) {
  const normalized = input.replace(/\\/g, '/').trim();
  if (!normalized || normalized.includes('..') || normalized.startsWith('/')) {
    return null;
  }
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length !== 2) {
    return null;
  }
  const [subdir, filename] = segments;
  if ((subdir !== 'media' && subdir !== 'audio') || !filename || filename.includes('/')) {
    return null;
  }
  return `${subdir}/${path.basename(filename)}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !sessionHasPermission(session, 'classroom.access')) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 403, 'Creator access required');
    }

    const formData = await request.formData();
    const classroomId = String(formData.get('classroomId') || '').trim();
    const relativePath = sanitizeRelativePath(String(formData.get('relativePath') || ''));
    const file = formData.get('file');

    if (!classroomId || !relativePath || !(file instanceof File)) {
      return apiError(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD,
        400,
        'Missing required fields: classroomId, relativePath, file',
      );
    }

    if (!isValidClassroomId(classroomId)) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, 'Invalid classroom id');
    }

    const targetPath = path.join(CLASSROOMS_DIR, classroomId, relativePath);
    const classroomRoot = path.resolve(CLASSROOMS_DIR, classroomId);
    const resolvedTarget = path.resolve(targetPath);
    if (!resolvedTarget.startsWith(classroomRoot + path.sep) && resolvedTarget !== classroomRoot) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, 'Invalid asset path');
    }

    await fs.mkdir(path.dirname(resolvedTarget), { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(resolvedTarget, buffer);

    const baseUrl = buildRequestOrigin(request);
    return apiSuccess({
      url: `${baseUrl}/api/classroom-media/${classroomId}/${relativePath.replace(/\\/g, '/')}`,
      relativePath,
      size: buffer.length,
    });
  } catch (error) {
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to store classroom asset',
      error instanceof Error ? error.message : String(error),
    );
  }
}
