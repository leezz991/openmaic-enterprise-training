import { NextRequest } from 'next/server';
import { apiError, apiSuccess, API_ERROR_CODES } from '@/lib/server/api-response';
import { getServerSession, sessionHasPermission } from '@/lib/server/auth';
import { saveCourseMetadata, type CourseStatus, type CourseVisibility } from '@/lib/server/course-catalog';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (
      !session ||
      (!sessionHasPermission(session, 'courses.manage') &&
        !sessionHasPermission(session, 'courses.publish'))
    ) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 403, 'Course management access required');
    }

    const body = await request.json();
    const id = String(body.id || '').trim();
    const title = String(body.title || '').trim();

    if (!id || !title) {
      return apiError(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD,
        400,
        'Missing required fields: id, title',
      );
    }

    const course = await saveCourseMetadata({
      id,
      title,
      summary: String(body.summary || ''),
      cover: String(body.cover || ''),
      tags: Array.isArray(body.tags) ? body.tags : String(body.tags || '').split(','),
      status: (body.status || 'draft') as CourseStatus,
      visibility: (body.visibility || 'internal') as CourseVisibility,
      author: String(body.author || session.displayName || session.username),
    });

    return apiSuccess({ course });
  } catch (error) {
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to save course metadata',
      error instanceof Error ? error.message : String(error),
    );
  }
}
