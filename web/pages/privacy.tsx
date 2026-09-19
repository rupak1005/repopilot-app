import { DocsLayout, DocsSection } from '../components/ui/DocsLayout';

export default function PrivacyPage() {
  return (
    <DocsLayout slug="introduction" title="Privacy policy" lede="How RepoPilot handles repository, account, and usage data.">
      <DocsSection title="Data we process">
        <p>
          RepoPilot processes GitHub repository metadata and source content that you submit or authorize,
          plus account identity data needed to provide the service. Public repositories can be analyzed without
          a GitHub account.
        </p>
      </DocsSection>
      <DocsSection title="How data is used">
        <p>
          Data is used to build repository indexes, dependency graphs, search results, impact analysis, and
          review output. Credentials and session secrets are stored server-side and are not placed in client bundles.
        </p>
      </DocsSection>
      <DocsSection title="Retention and requests">
        <p>
          Indexed repository data is retained while it is needed to provide the service. Contact the RepoPilot
          team through the project owner to request deletion or ask questions about your data.
        </p>
      </DocsSection>
      <DocsSection title="Contact">
        <p>
          For privacy questions or deletion requests, configure <code>NEXT_PUBLIC_CONTACT_EMAIL</code> in
          production and publish the resulting support address here.
        </p>
      </DocsSection>
    </DocsLayout>
  );
}
