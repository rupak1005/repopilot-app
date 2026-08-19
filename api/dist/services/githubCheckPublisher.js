"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoOpReviewPublisher = exports.GitHubCheckPublisher = void 0;
exports.getDefaultReviewPublisher = getDefaultReviewPublisher;
const reviewPolicy_1 = require("./reviewPolicy");
function severityToAnnotationLevel(severity) {
    if (severity === 'CRITICAL' || severity === 'HIGH')
        return 'failure';
    if (severity === 'MEDIUM')
        return 'warning';
    return 'notice';
}
function buildSummaryMarkdown(review, outcome) {
    const lines = [
        `## RepoPilot Review — ${outcome}`,
        '',
        review.summary.summary,
        '',
        `- Files changed: ${review.summary.filesChanged}`,
        `- Symbols changed: ${review.summary.symbolsChanged}`,
        `- Findings: ${review.summary.findingsCount}`
    ];
    if (review.findings.length > 0) {
        lines.push('', '### Findings');
        for (const finding of review.findings.slice(0, 10)) {
            lines.push(`- **${finding.severity}** (${finding.confidence} confidence): ${finding.title}`);
        }
    }
    return lines.join('\n');
}
class GitHubCheckPublisher {
    constructor(token) {
        this.token = token;
    }
    async publishReview(args) {
        const conclusion = (0, reviewPolicy_1.outcomeToCheckConclusion)(args.outcome);
        const summary = buildSummaryMarkdown(args.review, args.outcome);
        const body = {
            name: 'RepoPilot Review',
            head_sha: args.headSha,
            status: 'completed',
            conclusion,
            output: {
                title: `RepoPilot Review — ${args.outcome}`,
                summary
            }
        };
        const endpoint = args.existingCheckRunId
            ? `https://api.github.com/repos/${args.owner}/${args.repo}/check-runs/${args.existingCheckRunId}`
            : `https://api.github.com/repos/${args.owner}/${args.repo}/check-runs`;
        const response = await fetch(endpoint, {
            method: args.existingCheckRunId ? 'PATCH' : 'POST',
            headers: {
                Authorization: `Bearer ${this.token}`,
                Accept: 'application/vnd.github+json',
                'Content-Type': 'application/json',
                'X-GitHub-Api-Version': '2022-11-28'
            },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`GitHub check publish failed: ${response.status} ${errorBody}`);
        }
        const payload = (await response.json());
        const checkRunId = payload.id ? String(payload.id) : args.existingCheckRunId ?? null;
        if (checkRunId && args.review.findings.length > 0) {
            const annotations = args.review.findings
                .flatMap((finding) => {
                const evidence = finding.evidence[0];
                if (!evidence)
                    return [];
                return [
                    {
                        path: evidence.file,
                        start_line: evidence.lines[0],
                        end_line: evidence.lines[1],
                        annotation_level: severityToAnnotationLevel(finding.severity),
                        message: finding.description,
                        title: finding.title
                    }
                ];
            })
                .slice(0, 50);
            if (annotations.length > 0) {
                await fetch(`https://api.github.com/repos/${args.owner}/${args.repo}/check-runs/${checkRunId}/annotations`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                        Accept: 'application/vnd.github+json',
                        'Content-Type': 'application/json',
                        'X-GitHub-Api-Version': '2022-11-28'
                    },
                    body: JSON.stringify(annotations)
                });
            }
        }
        console.log(JSON.stringify({
            event: 'check.updated',
            owner: args.owner,
            repo: args.repo,
            headSha: args.headSha,
            checkRunId,
            outcome: args.outcome
        }));
        return { checkRunId };
    }
}
exports.GitHubCheckPublisher = GitHubCheckPublisher;
class NoOpReviewPublisher {
    async publishReview(args) {
        console.log(JSON.stringify({
            event: 'check.skipped',
            owner: args.owner,
            repo: args.repo,
            headSha: args.headSha,
            outcome: args.outcome,
            findings: args.review.findings.length
        }));
        return { checkRunId: null };
    }
}
exports.NoOpReviewPublisher = NoOpReviewPublisher;
function getDefaultReviewPublisher() {
    const token = process.env.GITHUB_TOKEN;
    if (token) {
        return new GitHubCheckPublisher(token);
    }
    return new NoOpReviewPublisher();
}
