export interface Repository {
  id: string;
  name: string;
  owner: string;
  createdAt: Date;
}

export interface PullRequest {
  repositoryId: string;
  number: number;
  title: string;
  baseBranch: string;
  headBranch: string;
  baseRevision: string;
  headRevision: string;
  status: string;
}

export interface SymbolDependency {
  fromSymbolId: string;
  toSymbolId: string;
}

export interface ModuleDependency {
  fromModule: string;
  toModule: string;
}

export interface DependencySymbolNode {
  symbolId: string;
  name: string;
  type: string;
}

export interface SymbolDependencyTraversalResponse {
  symbol: DependencySymbolNode;
  directCallers: DependencySymbolNode[];
  transitiveCallers: DependencySymbolNode[];
  graphDepth: number;
  cycleDetected: boolean;
}

export interface ModuleDependencyEdge {
  fromModule: string;
  toModule: string;
}

export interface ModuleDependencyTraversalResponse {
  file: {
    filePath: string;
  };
  directModuleDependents: ModuleDependencyEdge[];
  transitiveModuleDependents: ModuleDependencyEdge[];
  graphDepth: number;
}

export interface SearchResult {
  file: string;
  lines: [number, number];
  text: string;
  score: number;
  sources: Array<'lexical' | 'semantic' | 'graph'>;
}

export interface SearchResponse {
  results: SearchResult[];
}

export interface AnswerCitation {
  file: string;
  lines: [number, number];
}

export interface CodebaseAnswer {
  answer: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  citations: AnswerCitation[];
  notes?: string[];
}

export interface ReviewEvidenceRef {
  type: 'diff' | 'symbol' | 'caller' | 'test' | 'context';
  file: string;
  lines: [number, number];
}

export interface ReviewFindingResult {
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  suggestedAction?: string;
  evidence: ReviewEvidenceRef[];
}

export interface PullRequestReviewSummary {
  summary: string;
  filesChanged: number;
  symbolsChanged: number;
  findingsCount: number;
  testSignals: string[];
}

export interface PullRequestReviewResult {
  reviewId: string;
  pullRequestId: string;
  pullNumber: number;
  headRevision: string;
  baseRevision: string;
  status: 'QUEUED' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  outcome?: 'PASS' | 'WARN' | 'FAIL' | 'INCOMPLETE';
  checkRunId?: string | null;
  summary: PullRequestReviewSummary;
  findings: ReviewFindingResult[];
}

export interface RepositoryAnalytics {
  repositoryId: string;
  totalReviews: number;
  completedReviews: number;
  failedReviews: number;
  averageReviewLatencyMs: number | null;
  findingsBySeverity: Record<string, number>;
  recurringFindings: Array<{ fingerprint: string; count: number }>;
}

