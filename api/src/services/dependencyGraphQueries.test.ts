import { describe, expect, it } from 'vitest';
import {
  breadthFirstExpand,
  findStronglyConnectedComponents
} from './dependencyGraphQueries';

describe('dependencyGraphQueries (unit)', () => {
  it('expands caller graph breadth-first with a depth limit', () => {
    const adjacency = new Map<string, Set<string>>([
      ['B', new Set(['A1', 'A2'])],
      ['A1', new Set(['A3'])],
      ['A2', new Set(['A4'])]
    ]);

    const depthOne = breadthFirstExpand({
      startIds: ['A1', 'A2'],
      adjacency,
      depthLimit: 1
    });
    expect(depthOne).toEqual(['A1', 'A2']);

    const depthTwo = breadthFirstExpand({
      startIds: ['A1', 'A2'],
      adjacency,
      depthLimit: 2
    });
    expect(depthTwo).toEqual(expect.arrayContaining(['A1', 'A2', 'A3', 'A4']));
  });

  it('finds strongly connected components for cyclic graphs', () => {
    const adjacency = new Map<string, Set<string>>([
      ['A', new Set(['B'])],
      ['B', new Set(['A'])],
      ['C', new Set(['D'])],
      ['D', new Set()]
    ]);

    const components = findStronglyConnectedComponents(adjacency);
    expect(components).toEqual(
      expect.arrayContaining([expect.arrayContaining(['A', 'B'])])
    );
  });
});
