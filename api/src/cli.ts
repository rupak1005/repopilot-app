import { syncRepository } from './services/repositorySync';
import { buildDependencyGraph } from './services/dependencyGraphBuilder';
import { indexRepositorySearch } from './services/searchIndex';
import { runPullRequestReview } from './services/prReview';
import { ingestRepositoryHistory } from './services/historyIngest';

function getArgValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function requireArg(flag: string): string {
  const v = getArgValue(flag);
  if (!v) {
    console.error(`Missing required argument: ${flag}`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const cmd = process.argv[2];

  if (cmd === 'sync-repo') {
    const repoPath = requireArg('--path');
    const repositoryId = requireArg('--repo-id');

    const revisionSha = getArgValue('--revision-sha');
    const repositoryName = getArgValue('--repo-name');
    const owner = getArgValue('--owner');
    const concurrencyRaw = getArgValue('--concurrency');
    const concurrency = concurrencyRaw ? Number(concurrencyRaw) : undefined;

    await syncRepository({
      repositoryId,
      repoPath,
      revisionSha,
      repositoryName,
      owner,
      concurrency
    });
    return;
  }

  if (cmd === 'build-graph') {
    const repositoryId = requireArg('--repo-id');
    const revisionSha = getArgValue('--revision-sha');
    await buildDependencyGraph({ repositoryId, revisionSha });
    return;
  }

  if (cmd === 'index-search') {
    const repositoryId = requireArg('--repo-id');
    const revisionSha = getArgValue('--revision-sha');
    await indexRepositorySearch({ repositoryId, revisionSha });
    return;
  }

  if (cmd === 'review-pr') {
    const repositoryId = requireArg('--repo-id');
    const pullNumberRaw = requireArg('--pull-number');
    const pullNumber = Number(pullNumberRaw);
    if (!Number.isFinite(pullNumber) || pullNumber < 1) {
      console.error('--pull-number must be a positive integer');
      process.exit(1);
    }
    const force = process.argv.includes('--force');
    const result = await runPullRequestReview({
      repositoryId,
      pullNumber,
      force
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (cmd === 'ingest-history') {
    const repositoryId = requireArg('--repo-id');
    const repoPath = requireArg('--path');
    const rebuild = process.argv.includes('--rebuild');
    const maxCountRaw = getArgValue('--max-count');
    const maxCount = maxCountRaw ? Number(maxCountRaw) : undefined;
    const result = await ingestRepositoryHistory({
      repositoryId,
      repoPath,
      rebuild,
      maxCount
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.error(
    'Usage: node api/dist/cli.js <sync-repo|build-graph|index-search|review-pr|ingest-history> --repo-id <repositoryId> [--revision-sha <sha>] [sync-repo flags: --path <repoPath> --repo-name <name> --owner <owner> --concurrency <n>] [review-pr flags: --pull-number <n> --force] [ingest-history flags: --path <repoPath> --rebuild --max-count <n>]'
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

