type IndexHintProps = {
  repoFullName?: string;
};

/** Empty-index CTA for hosted + local. Prefer Settings; CLI is optional for local API. */
export function IndexHint({ repoFullName }: IndexHintProps) {
  const slug = repoFullName ?? 'owner/repo';
  return (
    <div className="ui-index-hint">
      <p className="ui-index-hint__title">Repository not indexed yet</p>
      <p className="ui-index-hint__body">
        Open <strong>Settings</strong> and click <strong>Re-index repository</strong> to clone and
        parse <code>{slug}</code>. Graph, impact, search, and Ask unlock when indexing finishes.
      </p>
      <p className="ui-index-hint__body ui-index-hint__body--muted">
        Local API only:{' '}
        <code className="ui-index-hint__inline">{`./scripts/index-repo.sh ${slug}`}</code>
      </p>
    </div>
  );
}
