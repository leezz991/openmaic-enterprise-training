import { notFound } from 'next/navigation';
import { LearnerClassroomShell } from '@/components/enterprise/learner-classroom-shell';
import { requireServerSession } from '@/lib/server/auth';
import { getCourseCatalogEntry } from '@/lib/server/course-catalog';

interface LearnPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function LearnPage({ params }: LearnPageProps) {
  await requireServerSession();
  const { id } = await params;
  const course = await getCourseCatalogEntry(id);

  if (
    !course?.classroom ||
    course.metadata.status !== 'published' ||
    course.metadata.visibility !== 'internal'
  ) {
    notFound();
  }

  return <LearnerClassroomShell course={course.metadata} classroom={course.classroom} />;
}
