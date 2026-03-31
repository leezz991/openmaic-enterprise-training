import { NextRequest } from 'next/server';
import { apiError, API_ERROR_CODES, apiSuccess } from '@/lib/server/api-response';
import { requireApiPermission } from '@/lib/server/api-auth';
import { listSessionsForUser, revokeSessionsForUser } from '@/lib/server/user-store';

export async function GET(_request: NextRequest, { params }: { params: Promise<unknown> }) {
  const auth = await requireApiPermission('sessions.read');
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = (await params) as { id: string };
    const sessions = await listSessionsForUser(id);
    return apiSuccess({ sessions });
  } catch (error) {
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to list sessions',
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function POST(_request: NextRequest, { params }: { params: Promise<unknown> }) {
  const auth = await requireApiPermission('sessions.manage');
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = (await params) as { id: string };
    await revokeSessionsForUser(id);
    return apiSuccess({ revoked: true });
  } catch (error) {
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to revoke sessions',
      error instanceof Error ? error.message : String(error),
    );
  }
}
