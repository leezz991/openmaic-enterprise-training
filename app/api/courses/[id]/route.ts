import { NextRequest } from 'next/server';
import { apiError, apiSuccess, API_ERROR_CODES } from '@/lib/server/api-response';
import { getServerSession, sessionHasPermission } from '@/lib/server/auth';
import { getCourseCatalogEntry, updateCourseStatus, type CourseStatus } from '@/lib/server/course-catalog';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 401, 'Authentication required');
    }

    const { id } = await context.params;
    const course = await getCourseCatalogEntry(id);
    if (!course?.classroom) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 404, 'Course not found');
    }

    if (
      !sessionHasPermission(session, 'courses.manage') &&
      (course.metadata.status !== 'published' || course.metadata.visibility !== 'internal')
    ) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 404, 'Course not found');
    }

    return apiSuccess({ course });
  } catch (error) {
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to load course',
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (
      !session ||
      (!sessionHasPermission(session, 'courses.manage') &&
        !sessionHasPermission(session, 'courses.publish'))
    ) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 403, 'Course management access required');
    }

    const { id } = await context.params;
    const body = await request.json();
    const status = String(body.status || '').trim() as CourseStatus;

    if (!['draft', 'published', 'archived'].includes(status)) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, 'Invalid course status');
    }

    const course = await updateCourseStatus(id, status);
    return apiSuccess({ course });
  } catch (error) {
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to update course status',
      error instanceof Error ? error.message : String(error),
    );
  }
}
