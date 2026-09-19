import { DocsLayout, DocsSection } from '../components/ui/DocsLayout';

export default function TermsPage() {
  return (
    <DocsLayout slug="introduction" title="Terms of service" lede="The basic terms for using RepoPilot.">
      <DocsSection title="Acceptable use">
        <p>
          Use RepoPilot only with repositories and credentials you are authorized to access. Do not use the
          service to bypass access controls, abuse GitHub or upstream providers, or submit unlawful content.
        </p>
      </DocsSection>
      <DocsSection title="Service output">
        <p>
          RepoPilot provides engineering analysis and review suggestions. Treat generated results as decision
          support and verify them before relying on them in production systems.
        </p>
      </DocsSection>
      <DocsSection title="Availability">
        <p>
          The service may change or be temporarily unavailable for maintenance, provider failures, or resource
          limits. You remain responsible for maintaining source-code backups and reviewing integrations.
        </p>
      </DocsSection>
    </DocsLayout>
  );
}
