"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverSourceFiles = discoverSourceFiles;
const fast_glob_1 = __importDefault(require("fast-glob"));
const node_path_1 = __importDefault(require("node:path"));
/**
 * Discover source files for Phase 2 parsing.
 *
 * Roadmap rules:
 * - Include: TS/JS (ts, tsx, js, jsx)
 * - Exclude: node_modules, .git, and build artifacts
 */
async function discoverSourceFiles(repoPath) {
    const absRepoRoot = node_path_1.default.resolve(repoPath);
    const patterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
    const ignore = [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/out/**',
        '**/.next/**',
        '**/.turbo/**',
        '**/coverage/**'
    ];
    const absPaths = await (0, fast_glob_1.default)(patterns, {
        cwd: absRepoRoot,
        ignore,
        absolute: true,
        onlyFiles: true
    });
    return absPaths.map((absPath) => {
        const rel = node_path_1.default.relative(absRepoRoot, absPath);
        return {
            absPath,
            path: rel.split(node_path_1.default.sep).join('/')
        };
    });
}
