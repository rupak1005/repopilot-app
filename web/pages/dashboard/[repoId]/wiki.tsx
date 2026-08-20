import { useRouter } from 'next/router';
import { SurfaceStubPage } from '../../../components/ui/SurfaceStubPage';
import { DashboardLayout } from '../../../lib/dashboard';

export default function WikiPage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;

  return (
    <DashboardLayout activeNav="wiki">
      <SurfaceStubPage stubId="wiki" repoId={repoId} />
    </DashboardLayout>
  );
}
