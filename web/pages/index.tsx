import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    async function go() {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        void router.replace('/login');
        return;
      }
      const user = (await response.json()) as {
        selectedRepoId?: string;
      };
      if (user.selectedRepoId) {
        void router.replace(`/dashboard/${user.selectedRepoId}`);
        return;
      }
      void router.replace('/repos');
    }
    void go();
  }, [router]);

  return (
    <main className="main-content">
      <p className="empty-state">Loading…</p>
    </main>
  );
}
