import { syncRepository } from './services/repositorySync';
import { buildDependencyGraph } from './services/dependencyGraphBuilder';

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

    const repositoryName = getArgValue('--repo-name');
    const owner = getArgValue('--owner');
    const concurrencyRaw = getArgValue('--concurrency');
    const concurrency = concurrencyRaw ? Number(concurrencyRaw) : undefined;

    await syncRepository({
      repositoryId,
      repoPath,
      repositoryName,
      owner,
      concurrency
    });
    return;
  }

  if (cmd === 'build-graph') {
    const repositoryId = requireArg('--repo-id');
    await buildDependencyGraph({ repositoryId });
    return;
  }

  console.error(
    'Usage: node api/dist/cli.js <sync-repo|build-graph> --repo-id <repositoryId> [sync-repo flags: --path <repoPath> --repo-name <name> --owner <owner> --concurrency <n>]'
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

