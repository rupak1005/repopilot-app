export const LANDING_BRAND = 'RepoPilot';

export const LANDING_HEADLINE = 'Understand your repository — with evidence';

export const LANDING_LEDE =
  'Index a GitHub codebase for real dependency graphs, impact analysis, topography, grounded Ask, and PR review — built from imports and AST, not LLM sketches.';

export const LANDING_HOW_IT_WORKS = [
  {
    id: 'paste',
    title: 'Paste a repo',
    body: 'Drop a public GitHub URL or owner/repo slug. Private repos work after GitHub sign-in.'
  },
  {
    id: 'index',
    title: 'Index once',
    body: 'RepoPilot clones, parses, builds the graph, embeds search, and ingests history.'
  },
  {
    id: 'investigate',
    title: 'Investigate with proof',
    body: 'Jump from Overview into graph, impact, topography, Ask citations, and History.'
  }
] as const;
