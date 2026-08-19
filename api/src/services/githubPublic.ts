export type PublicRepositoryMeta = {
  fullName: string;
  owner: string;
  name: string;
  description: string | null;
  defaultBranch: string;
};

export async function fetchPublicRepositoryMeta(args: {
  owner: string;
  name: string;
}): Promise<PublicRepositoryMeta | null> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'repopilot-public-preview'
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`https://api.github.com/repos/${args.owner}/${args.name}`, {
    headers
  });

  if (response.status === 404) return null;
  if (!response.ok) return null;

  const data = (await response.json()) as {
    private?: boolean;
    full_name?: string;
    description?: string | null;
    default_branch?: string;
  };

  if (data.private) return null;

  return {
    fullName: data.full_name ?? `${args.owner}/${args.name}`,
    owner: args.owner,
    name: args.name,
    description: data.description ?? null,
    defaultBranch: data.default_branch ?? 'main'
  };
}

export type PublicRepositoryBrowseItem = {
  fullName: string;
  owner: string;
  name: string;
  description: string | null;
  stars: number;
  updatedAt: string;
};

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'repopilot-public-preview'
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function searchPublicRepositories(args: {
  q?: string;
  sort?: 'stars' | 'updated';
  minStars?: number;
  page?: number;
  perPage?: number;
}): Promise<{ totalCount: number; items: PublicRepositoryBrowseItem[] }> {
  const page = Math.max(1, args.page ?? 1);
  const perPage = Math.min(30, Math.max(1, args.perPage ?? 20));
  const parts: string[] = ['is:public'];
  const trimmed = args.q?.trim();
  if (trimmed) {
    if (trimmed.includes('/')) {
      parts.push(`repo:${trimmed}`);
    } else {
      parts.push(trimmed);
    }
  }
  if (args.minStars && args.minStars > 0) {
    parts.push(`stars:>=${args.minStars}`);
  }

  const sort = args.sort === 'updated' ? 'updated' : 'stars';
  const params = new URLSearchParams({
    q: parts.join(' '),
    sort,
    order: 'desc',
    per_page: String(perPage),
    page: String(page)
  });

  const response = await fetch(`https://api.github.com/search/repositories?${params}`, {
    headers: githubHeaders()
  });

  if (!response.ok) {
    return { totalCount: 0, items: [] };
  }

  const data = (await response.json()) as {
    total_count?: number;
    items?: Array<{
      full_name?: string;
      description?: string | null;
      stargazers_count?: number;
      updated_at?: string;
      owner?: { login?: string };
      name?: string;
    }>;
  };

  const items = (data.items ?? []).map((item) => ({
    fullName: item.full_name ?? '',
    owner: item.owner?.login ?? '',
    name: item.name ?? '',
    description: item.description ?? null,
    stars: item.stargazers_count ?? 0,
    updatedAt: item.updated_at ?? new Date().toISOString()
  }));

  return {
    totalCount: data.total_count ?? items.length,
    items: items.filter((item) => item.fullName.includes('/'))
  };
}
