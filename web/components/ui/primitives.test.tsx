import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BentoPanel } from './BentoPanel';
import { Button, GitHubIcon } from './Button';
import { ChatBubble } from './ChatBubble';
import { CitationChip } from './CitationChip';
import { Dialog } from './Dialog';
import { EmptyState } from './EmptyState';
import { ErrorBanner } from './ErrorBanner';
import { IconButton } from './IconButton';
import { KpiTile } from './KpiTile';
import { NavItem } from './NavItem';
import { RepoCard } from './RepoCard';
import { RepoPicker, splitRepoFullName } from './RepoPicker';
import { SearchHitRow } from './SearchHitRow';
import { SquaresFour } from '@phosphor-icons/react';

describe('splitRepoFullName', () => {
  it('parses owner/repo slugs', () => {
    expect(splitRepoFullName('octo/hello')).toEqual({ owner: 'octo', name: 'hello' });
    expect(splitRepoFullName('solo')).toEqual({ owner: '', name: 'solo' });
  });
});

describe('KpiTile', () => {
  it('renders tone and meta', () => {
    const html = renderToStaticMarkup(
      <KpiTile label="Failed" value={3} meta="Attention" tone="danger" />
    );
    expect(html).toContain('ui-kpi-tile--danger');
    expect(html).toContain('Attention');
  });
});

describe('BentoPanel', () => {
  it('renders title and body', () => {
    const html = renderToStaticMarkup(
      <BentoPanel title="Pull Requests" action={<a href="/pulls">View all</a>}>
        <p>content</p>
      </BentoPanel>
    );
    expect(html).toContain('Pull Requests');
    expect(html).toContain('View all');
    expect(html).toContain('content');
  });
});

describe('CitationChip', () => {
  it('renders file range and optional score', () => {
    const html = renderToStaticMarkup(
      <CitationChip file="src/auth.ts" lines={[10, 20]} score={0.87} />
    );
    expect(html).toContain('src/auth.ts:10–20');
    expect(html).toContain('0.87');
  });
});

describe('ChatBubble', () => {
  it('renders user and assistant roles', () => {
    const user = renderToStaticMarkup(<ChatBubble role="user">Hello?</ChatBubble>);
    expect(user).toContain('ui-chat-bubble--user');
    expect(user).toContain('Hello?');

    const assistant = renderToStaticMarkup(
      <ChatBubble role="assistant" meta={<span>high</span>}>
        Answer
      </ChatBubble>
    );
    expect(assistant).toContain('ui-chat-bubble--assistant');
    expect(assistant).toContain('RepoPilot');
    expect(assistant).toContain('Answer');
  });
});

describe('Button', () => {
  it('renders button and link variants', () => {
    const button = renderToStaticMarkup(<Button variant="secondary">Save</Button>);
    expect(button).toContain('ui-button--secondary');
    expect(button).toContain('Save');

    const link = renderToStaticMarkup(
      <Button href="/login" variant="primary" icon={<GitHubIcon />}>
        Sign in
      </Button>
    );
    expect(link).toContain('href="/login"');
    expect(link).toContain('Sign in');
  });
});

describe('IconButton', () => {
  it('requires aria-label and renders children', () => {
    const html = renderToStaticMarkup(
      <IconButton label="Notifications">
        <span data-testid="bell" />
      </IconButton>
    );
    expect(html).toContain('aria-label="Notifications"');
    expect(html).toContain('ui-icon-button');
  });
});

describe('RepoPicker', () => {
  it('links to repos and shows owner/name', () => {
    const html = renderToStaticMarkup(<RepoPicker repoFullName="acme/app" href="/repos" />);
    expect(html).toContain('href="/repos"');
    expect(html).toContain('ui-repo-picker');
    expect(html).toContain('acme');
    expect(html).toContain('app');
  });
});

describe('NavItem', () => {
  it('marks active route with aria-current', () => {
    const html = renderToStaticMarkup(
      <NavItem href="/dashboard/x" label="Overview" icon={SquaresFour} active />
    );
    expect(html).toContain('ui-nav-item--active');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('Overview');
  });
});

describe('RepoCard', () => {
  it('renders repo metadata and private badge', () => {
    const html = renderToStaticMarkup(
      <RepoCard
        fullName="acme/secret"
        owner="acme"
        name="secret"
        description="Private tools"
        isPrivate
        updatedAt="2026-01-15T00:00:00.000Z"
        onSelect={() => {}}
      />
    );
    expect(html).toContain('ui-repo-card');
    expect(html).toContain('Private tools');
    expect(html).toContain('title="Private repository"');
  });
});

describe('SearchHitRow', () => {
  it('renders citation chip and snippet', () => {
    const html = renderToStaticMarkup(
      <SearchHitRow
        hit={{
          file: 'lib/sync.ts',
          lines: [1, 5],
          text: 'export async function syncRepository() {}',
          score: 0.92
        }}
      />
    );
    expect(html).toContain('lib/sync.ts:1–5');
    expect(html).toContain('syncRepository');
  });
});

describe('EmptyState', () => {
  it('renders title, description, and compact mode', () => {
    const html = renderToStaticMarkup(
      <EmptyState compact title="No data" description="Try again later" />
    );
    expect(html).toContain('ui-empty-state--compact');
    expect(html).toContain('No data');
    expect(html).toContain('Try again later');
  });
});

describe('ErrorBanner', () => {
  it('renders alert role', () => {
    const html = renderToStaticMarkup(<ErrorBanner>Something broke</ErrorBanner>);
    expect(html).toContain('role="alert"');
    expect(html).toContain('Something broke');
  });
});

describe('Dialog', () => {
  it('renders title and footer', () => {
    const html = renderToStaticMarkup(
      <Dialog open title="Confirm" description="Are you sure?" footer={<button type="button">OK</button>} onClose={() => {}} />
    );
    expect(html).toContain('ui-dialog');
    expect(html).toContain('Confirm');
    expect(html).toContain('Are you sure?');
  });
});
