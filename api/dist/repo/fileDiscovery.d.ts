export type DiscoveredFile = {
    /** Path relative to the repo root, using forward slashes. */
    path: string;
    /** Absolute path on disk. */
    absPath: string;
};
/**
 * Discover source files for Phase 2 parsing.
 *
 * Roadmap rules:
 * - Include: TS/JS (ts, tsx, js, jsx)
 * - Exclude: node_modules, .git, and build artifacts
 */
export declare function discoverSourceFiles(repoPath: string): Promise<DiscoveredFile[]>;
