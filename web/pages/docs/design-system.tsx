import { DocsLayout, DocsSection, DocsTable } from '../../components/ui/DocsLayout';

export default function DocsDesignSystemPage() {
  return (
    <DocsLayout
      slug="design-system"
      title="Design system"
      lede="Neo-brutalist tokens inspired by GitDiagram — hard shadows, purple surfaces, and monospace data UI."
    >
      <DocsSection title="Design philosophy">
        <p>
          RepoPilot uses a GitDiagram-inspired neo-brutalist system: high-contrast borders, offset hard shadows,
          bold typography, and a purple-tinted marketing shell. The dashboard shifts to a calmer canvas layer for
          dense data views.
        </p>
      </DocsSection>

      <DocsSection title="Token layers">
        <DocsTable
          headers={['Layer', 'CSS', 'Used for']}
          rows={[
            ['A — Brand', 'tokens.css, public-site.css, landing.css', 'Marketing header, landing, browse, docs'],
            ['B — App chrome', 'page-layout.css, shell.css, nav-item.css', 'Dashboard sidebar, page headers, forms'],
            ['C — Canvas', 'neo-panels.css, overview-bento.css', 'Bento panels, KPI tiles, data tables']
          ]}
        />
        <p>
          Semantic colors live in <code>web/styles/tokens.css</code>. Light and dark themes swap HSL values on{' '}
          <code>[data-theme=&quot;dark&quot;]</code>. <code>ThemeToggle</code> persists preference to localStorage.
        </p>
      </DocsSection>

      <DocsSection title="Typography">
        <ul>
          <li>
            <strong>UI text</strong> — system sans stack via <code>--font-sans</code>
          </li>
          <li>
            <strong>Data / code</strong> — monospace via <code>--font-mono</code> for inputs, tables, KPI labels
          </li>
          <li>
            <strong>Scale</strong> — <code>--text-h1</code>, <code>--text-h2</code>, <code>--text-body</code>,{' '}
            <code>--text-ui</code>, <code>--text-micro</code>
          </li>
        </ul>
      </DocsSection>

      <DocsSection title="Core components">
        <DocsTable
          headers={['Component', 'Location', 'Purpose']}
          rows={[
            ['Button / IconButton', 'components/ui/Button.tsx', 'Primary actions, neo shadow hover'],
            ['NavItem', 'components/ui/NavItem.tsx', 'Dashboard sidebar links with icons'],
            ['AppShell', 'components/AppShell.tsx', 'Dashboard layout + mobile nav'],
            ['PublicSiteHeader', 'components/ui/PublicSiteHeader.tsx', 'Marketing nav + auth'],
            ['BentoPanel / KpiTile', 'components/ui/', 'Overview metric cards'],
            ['MermaidDiagram', 'components/ui/MermaidDiagram.tsx', 'Architecture graph rendering'],
            ['DocsLayout', 'components/ui/DocsLayout.tsx', 'Documentation sidebar shell']
          ]}
        />
      </DocsSection>

      <DocsSection title="Motion">
        <p>
          Page transitions use Motion (<code>motion/react</code>) with <code>reducedMotion: &quot;user&quot;</code>.
          Enter animations are defined in <code>web/lib/motion.ts</code>. Index progress uses a floating pill with
          animated percentage.
        </p>
      </DocsSection>

      <DocsSection title="Accessibility">
        <ul>
          <li>Focus rings via <code>--focus-ring</code> token</li>
          <li>ARIA labels on site nav, mobile menu, and icon-only buttons</li>
          <li><code>prefers-reduced-motion</code> respected in CSS transitions</li>
          <li>Semantic heading hierarchy on docs and dashboard pages</li>
        </ul>
      </DocsSection>
    </DocsLayout>
  );
}
