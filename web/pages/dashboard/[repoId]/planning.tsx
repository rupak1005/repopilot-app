import { useRouter } from 'next/router';
import { SurfaceStubPage } from '../../../components/ui/SurfaceStubPage';
import { DashboardLayout } from '../../../lib/dashboard';

export default function PlanningPage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;

  return (
    <DashboardLayout activeNav="planning">
      <SurfaceStubPage stubId="planning" repoId={repoId} />
    </DashboardLayout>
  );
}
