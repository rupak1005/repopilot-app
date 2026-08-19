"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const dependencyGraphQueries_1 = require("./dependencyGraphQueries");
(0, vitest_1.describe)('dependencyGraphQueries (unit)', () => {
    (0, vitest_1.it)('expands caller graph breadth-first with a depth limit', () => {
        const adjacency = new Map([
            ['B', new Set(['A1', 'A2'])],
            ['A1', new Set(['A3'])],
            ['A2', new Set(['A4'])]
        ]);
        const depthOne = (0, dependencyGraphQueries_1.breadthFirstExpand)({
            startIds: ['A1', 'A2'],
            adjacency,
            depthLimit: 1
        });
        (0, vitest_1.expect)(depthOne).toEqual(['A1', 'A2']);
        const depthTwo = (0, dependencyGraphQueries_1.breadthFirstExpand)({
            startIds: ['A1', 'A2'],
            adjacency,
            depthLimit: 2
        });
        (0, vitest_1.expect)(depthTwo).toEqual(vitest_1.expect.arrayContaining(['A1', 'A2', 'A3', 'A4']));
    });
    (0, vitest_1.it)('finds strongly connected components for cyclic graphs', () => {
        const adjacency = new Map([
            ['A', new Set(['B'])],
            ['B', new Set(['A'])],
            ['C', new Set(['D'])],
            ['D', new Set()]
        ]);
        const components = (0, dependencyGraphQueries_1.findStronglyConnectedComponents)(adjacency);
        (0, vitest_1.expect)(components).toEqual(vitest_1.expect.arrayContaining([vitest_1.expect.arrayContaining(['A', 'B'])]));
    });
});
