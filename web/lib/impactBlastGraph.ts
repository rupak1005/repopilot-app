import type { ForceGraphData } from './architecture';
import { blastFromImpactPayload, type BlastOverlay } from './blastOverlay';
import type { FileImpactAnalysis } from './types';
import {
  visualizationFromFileImpact,
  visualizationToForceGraphIds
} from './visualizationModel';

export type ImpactBlastGraphCaps = {
  maxDirect?: number;
  maxTransitive?: number;
  maxImports?: number;
  maxTests?: number;
};

function shortLabel(filePath: string): string {
  const parts = filePath.split('/');
  if (parts.length <= 2) return filePath;
  return parts.slice(-2).join('/');
}

/**
 * Cap + adapt file impact into a small ForceGraphData for the embedded Impact canvas.
 * Reuses visualizationFromFileImpact so 2D embed and 3D spike stay aligned.
 */
export function forceGraphFromFileImpact(
  impact: FileImpactAnalysis,
  caps: ImpactBlastGraphCaps = {}
): { data: ForceGraphData; blast: BlastOverlay } {
  const capped: FileImpactAnalysis = {
    ...impact,
    directDependents: impact.directDependents.slice(0, caps.maxDirect ?? 8),
    transitiveDependents: impact.transitiveDependents.slice(0, caps.maxTransitive ?? 6),
    outboundImports: impact.outboundImports.slice(0, caps.maxImports ?? 6),
    relevantTests: impact.relevantTests.slice(0, caps.maxTests ?? 3)
  };

  const viz = visualizationFromFileImpact(capped);
  const { nodeIds, linkPairs } = visualizationToForceGraphIds(viz);
  const byPath = new Map(viz.nodes.map((n) => [n.path ?? n.id.replace(/^file:/, ''), n]));

  const data: ForceGraphData = {
    nodes: nodeIds.map((id) => {
      const vizNode = byPath.get(id);
      const isSeed = id === capped.target.filePath;
      return {
        id,
        label: shortLabel(id),
        val: isSeed ? 3 : vizNode?.blastRole === 'direct' ? 2 : 1,
        isHotspot: Boolean(capped.hotspot && isSeed && capped.hotspot.score > 0),
        score: isSeed ? capped.hotspot?.score ?? 0 : 0,
        kind: 'file' as const
      };
    }),
    links: linkPairs.map((pair) => ({
      source: pair.source,
      target: pair.target,
      uncertain: pair.uncertain
    }))
  };

  return {
    data,
    blast: blastFromImpactPayload(capped)
  };
}
