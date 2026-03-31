import { NextRequest } from 'next/server';
import { apiError, apiSuccess, API_ERROR_CODES } from '@/lib/server/api-response';
import { getServerSession, sessionHasPermission } from '@/lib/server/auth';
import { listCourseCatalog } from '@/lib/server/course-catalog';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 401, 'Authentication required');
    }

    const includeUnpublished =
      sessionHasPermission(session, 'courses.manage') &&
      request.nextUrl.searchParams.get('scope') === 'all';

    const courses = await listCourseCatalog({ includeUnpublished });
    return apiSuccess({ courses });
  } catch (error) {
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to load courses',
      error instanceof Error ? error.message : String(error),
    );
  }
}
