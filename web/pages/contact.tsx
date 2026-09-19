import { DocsLayout, DocsSection } from '../components/ui/DocsLayout';

export default function ContactPage() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  return (
    <DocsLayout slug="introduction" title="Contact RepoPilot" lede="Questions about access, privacy, or the product?">
      <DocsSection title="Support">
        {email ? (
          <p>
            Email <a href={`mailto:${email}`}>{email}</a> and include the repository URL and a short description
            of the issue. Do not send access tokens or private source code in plain email.
          </p>
        ) : (
          <p>
            Set <code>NEXT_PUBLIC_CONTACT_EMAIL</code> in the production web environment to publish the support
            address here. The application intentionally does not invent a contact address.
          </p>
        )}
      </DocsSection>
      <DocsSection title="Security reports">
        <p>
          Avoid sharing credentials or sensitive repository content in support requests. Report suspected security
          issues privately through the configured support address.
        </p>
      </DocsSection>
    </DocsLayout>
  );
}
