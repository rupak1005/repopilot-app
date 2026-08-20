type IndexHintProps = {
  repoFullName?: string;
};

export function IndexHint({ repoFullName }: IndexHintProps) {
  const slug = repoFullName ?? 'owner/repo';
  return (
    <div className="ui-index-hint">
      <p className="ui-index-hint__title">Repository not indexed yet</p>
      <p className="ui-index-hint__body">
        Run sync from the repo root to populate pulls, search, ask, and hotspots. Replace the
        owner/repo with your GitHub slug.
      </p>
      <pre className="ui-index-hint__code">{`yarn --cwd api build
./scripts/index-repo.sh ${slug}`}</pre>
      <p className="ui-index-hint__body">
        Or open <strong>Settings</strong> in the dashboard and click <strong>Re-index repository</strong>,
        or enable preview data with <code>NEXT_PUBLIC_DEMO_MODE=true</code> in{' '}
        <code>web/.env.local</code>.
      </p>
    </div>
  );
}
