export type BlastOverlay = {
  seed: string;
  direct: string[];
  transitive: string[];
};

export type BlastRole = 'seed' | 'direct' | 'transitive';

export function blastRole(filePath: string, blast: BlastOverlay): BlastRole | null {
  if (filePath === blast.seed) return 'seed';
  if (blast.direct.includes(filePath)) return 'direct';
  if (blast.transitive.includes(filePath)) return 'transitive';
  return null;
}

export function blastHighlightSet(blast: BlastOverlay): Set<string> {
  return new Set([blast.seed, ...blast.direct, ...blast.transitive]);
}

export function blastFromImpactPayload(payload: {
  target: { filePath: string };
  directDependents: string[];
  transitiveDependents: string[];
}): BlastOverlay {
  return {
    seed: payload.target.filePath,
    direct: payload.directDependents,
    transitive: payload.transitiveDependents
  };
}
