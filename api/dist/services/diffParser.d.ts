export type DiffLineType = 'added' | 'removed' | 'context';
export type DiffLine = {
    type: DiffLineType;
    content: string;
    oldLine?: number;
    newLine?: number;
};
export type DiffHunk = {
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: DiffLine[];
};
export type FileChangeStatus = 'added' | 'modified' | 'deleted' | 'renamed';
export type FileChange = {
    path: string;
    status: FileChangeStatus;
    additions: number;
    deletions: number;
    hunks: DiffHunk[];
};
export declare function parseUnifiedDiff(patch: string): DiffHunk[];
export declare function buildFileChange(args: {
    path: string;
    status: FileChangeStatus;
    patch?: string | null;
}): FileChange;
export declare function isBinaryOrIgnoredPath(filePath: string): boolean;
