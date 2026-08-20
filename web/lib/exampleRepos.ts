/** Curated public repos for landing chips and browse defaults (GitDiagram-style). */
export type ExampleRepo = {
  slug: string;
  label: string;
};

export const EXAMPLE_REPOS: ExampleRepo[] = [
  { slug: 'fastapi/fastapi', label: 'FastAPI' },
  { slug: 'streamlit/streamlit', label: 'Streamlit' },
  { slug: 'pallets/flask', label: 'Flask' },
  { slug: 'rupak1005/repopilot', label: 'RepoPilot' },
  { slug: 'monkeytypegame/monkeytype', label: 'Monkeytype' }
];

/** Subset pre-indexed on deploy — see scripts/preindex-examples.sh */
export const PREINDEX_EXAMPLE_SLUGS = [
  'fastapi/fastapi',
  'streamlit/streamlit',
  'rupak1005/repopilot'
] as const;

export function githubUrl(slug: string): string {
  return `https://github.com/${slug}`;
}
