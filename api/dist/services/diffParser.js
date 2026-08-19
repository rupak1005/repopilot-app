"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseUnifiedDiff = parseUnifiedDiff;
exports.buildFileChange = buildFileChange;
exports.isBinaryOrIgnoredPath = isBinaryOrIgnoredPath;
const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;
function parseUnifiedDiff(patch) {
    const hunks = [];
    let current = null;
    let oldLine = 0;
    let newLine = 0;
    for (const rawLine of patch.split('\n')) {
        const headerMatch = rawLine.match(HUNK_HEADER);
        if (headerMatch) {
            if (current)
                hunks.push(current);
            current = {
                oldStart: Number(headerMatch[1]),
                oldLines: Number(headerMatch[2] ?? '1'),
                newStart: Number(headerMatch[3]),
                newLines: Number(headerMatch[4] ?? '1'),
                lines: []
            };
            oldLine = current.oldStart;
            newLine = current.newStart;
            continue;
        }
        if (!current)
            continue;
        if (rawLine.startsWith('+')) {
            current.lines.push({
                type: 'added',
                content: rawLine.slice(1),
                newLine
            });
            newLine += 1;
            continue;
        }
        if (rawLine.startsWith('-')) {
            current.lines.push({
                type: 'removed',
                content: rawLine.slice(1),
                oldLine
            });
            oldLine += 1;
            continue;
        }
        if (rawLine.startsWith(' ') || rawLine === '') {
            current.lines.push({
                type: 'context',
                content: rawLine.startsWith(' ') ? rawLine.slice(1) : rawLine,
                oldLine,
                newLine
            });
            oldLine += 1;
            newLine += 1;
        }
    }
    if (current)
        hunks.push(current);
    return hunks;
}
function buildFileChange(args) {
    const hunks = args.patch ? parseUnifiedDiff(args.patch) : [];
    let additions = 0;
    let deletions = 0;
    for (const hunk of hunks) {
        for (const line of hunk.lines) {
            if (line.type === 'added')
                additions += 1;
            if (line.type === 'removed')
                deletions += 1;
        }
    }
    return {
        path: args.path,
        status: args.status,
        additions,
        deletions,
        hunks
    };
}
function isBinaryOrIgnoredPath(filePath) {
    const lower = filePath.toLowerCase();
    return (lower.endsWith('.png') ||
        lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.gif') ||
        lower.endsWith('.webp') ||
        lower.endsWith('.ico') ||
        lower.endsWith('.pdf') ||
        lower.endsWith('.zip') ||
        lower.endsWith('.woff') ||
        lower.endsWith('.woff2') ||
        lower.endsWith('.ttf') ||
        lower.endsWith('.eot'));
}
