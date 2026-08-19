# RepoPilot --- Product Requirements Document (PRD)

**Document status:** Product definition\
**Version:** 1.0\
**Product:** RepoPilot\
**Category:** AI Engineering Intelligence Platform\
**Audience:** Founders, product engineers, staff engineers, engineering
managers, design, security, and future contributors

------------------------------------------------------------------------

## 1. Executive Summary

RepoPilot is an AI-powered engineering intelligence platform that builds
a continuously updated understanding of a software repository.

Instead of treating a repository as a collection of files that an LLM
can merely search, RepoPilot constructs a structured representation of
the codebase:

-   source files and symbols
-   imports and dependencies
-   callers and callees
-   repository revisions
-   pull requests and diffs
-   historical commits and changes
-   semantic code/document retrieval
-   AI-generated engineering explanations and review findings
-   engineering risk and hotspot signals

The core product principle is:

> **RepoPilot should reason from evidence, not guess from code
> snippets.**

The platform first performs deterministic analysis and retrieval, then
uses AI to interpret the evidence. AI responses must be grounded in
repository data and should expose supporting files, symbols, lines,
commits, PRs, or graph relationships whenever possible.

The long-term product is not simply an "AI code reviewer." It is an
**engineering intelligence layer for the entire software development
lifecycle**.

------------------------------------------------------------------------

# 2. Product Vision

### Vision

Make every software repository understandable as a living engineering
system.

A developer should be able to ask:

-   "Where is authentication implemented?"
-   "What depends on this service?"
-   "If I change this function, what could break?"
-   "Why was this module designed this way?"
-   "Has this problem happened before?"
-   "Which areas of this repository are risky?"
-   "What changed in this PR and what is the likely impact?"
-   "Is this review finding actually supported by the code?"
-   "Show me the architectural relationship between these modules."

RepoPilot should answer using repository evidence rather than generic
programming knowledge.

### Product thesis

Traditional developer tools are fragmented:

-   Git understands history.
-   IDEs understand local code.
-   static analyzers understand syntax.
-   CI understands builds and tests.
-   code search understands text.
-   LLMs understand natural language.

RepoPilot combines these signals into one engineering intelligence
system.

------------------------------------------------------------------------

# 3. Problem Statement

Modern repositories become difficult to understand as they grow.

The difficulty is not simply finding a file. Engineers need to
understand relationships:

``` text
Change
  ↓
Symbol
  ↓
Callers / Callees
  ↓
Modules
  ↓
Tests
  ↓
Historical Changes
  ↓
Pull Requests
  ↓
Potential Risk
```

Existing AI coding tools often operate on incomplete context. This can
cause:

-   hallucinated explanations
-   missing dependencies
-   shallow code review
-   duplicate or noisy findings
-   poor understanding of historical intent
-   inability to explain architectural impact
-   lack of reproducibility
-   weak evidence for recommendations

RepoPilot addresses this by building a structured repository model
before asking AI to reason over it.

------------------------------------------------------------------------

# 4. Target Users

## 4.1 Primary Persona --- Software Developer

A developer working on an unfamiliar or large repository.

### Goals

-   understand unfamiliar code quickly
-   safely modify existing functionality
-   understand change impact
-   investigate bugs
-   understand PR feedback
-   search architecture semantically

### Pain points

-   spending hours tracing dependencies
-   reading large amounts of code manually
-   uncertainty about downstream effects
-   difficulty understanding historical decisions

------------------------------------------------------------------------

## 4.2 Primary Persona --- Senior / Staff Engineer

Responsible for architecture and high-impact changes.

### Goals

-   understand system topology
-   identify architectural hotspots
-   review risky changes
-   investigate dependency cycles
-   understand historical evolution

------------------------------------------------------------------------

## 4.3 Secondary Persona --- Engineering Manager

Needs repository-level engineering signals without evaluating individual
developers.

### Goals

-   identify recurring engineering risks
-   understand areas of architectural instability
-   track review quality
-   understand repository health

RepoPilot must **not** become an employee surveillance or developer
performance-scoring system.

------------------------------------------------------------------------

## 4.4 Future Persona --- Engineering Organization

Multiple repositories, teams, services, and organizations.

Potential future capabilities:

-   cross-repository dependency intelligence
-   organization-wide architecture maps
-   engineering knowledge discovery
-   service ownership metadata
-   incident/change correlation

These are outside the initial MVP.

------------------------------------------------------------------------

# 5. Product Goals

## Primary Goals

1.  Build a structured representation of a repository.
2.  Parse source code into files, symbols, imports, and exports.
3.  Construct dependency relationships.
4.  Persist immutable repository revisions.
5.  Provide hybrid semantic + lexical code search.
6.  Provide grounded AI codebase Q&A.
7.  Integrate with GitHub.
8.  Analyze pull requests using repository context.
9.  Provide high-signal AI review findings.
10. Provide engineering intelligence from code + history + PRs.
11. Make every AI claim traceable to evidence where practical.
12. Support incremental, reproducible, and recoverable analysis.

------------------------------------------------------------------------

# 6. Non-Goals

The initial product will not attempt to:

-   replace an IDE
-   replace GitHub
-   automatically merge pull requests
-   automatically modify production code
-   make autonomous architectural decisions
-   provide employee performance scores
-   guarantee that every AI finding is correct
-   support every programming language immediately
-   build a general-purpose autonomous software engineer
-   execute untrusted repository code as part of analysis
-   expose private repository data across tenants

------------------------------------------------------------------------

# 7. Product Principles

## 7.1 Evidence Over Speculation

Every important answer should be based on repository evidence.

Bad:

> "This service probably handles authentication."

Good:

> "Authentication is handled by `AuthService`, referenced by
> `LoginController` and `SessionMiddleware`."

------------------------------------------------------------------------

## 7.2 Deterministic Before Generative

The system should first collect deterministic facts:

``` text
Repository
→ Revision
→ Files
→ AST
→ Symbols
→ Dependencies
→ Diff
→ Retrieval
→ Evidence
→ AI reasoning
```

AI should interpret the evidence rather than invent the evidence.

------------------------------------------------------------------------

## 7.3 Explicit Uncertainty

When evidence is insufficient, RepoPilot should say so.

Example:

> "No documented architectural reason was found in the indexed commits
> or PR descriptions."

This is better than inventing an explanation.

------------------------------------------------------------------------

## 7.4 Reproducibility

A review should be reproducible from:

-   repository
-   base SHA
-   head SHA
-   analyzer version
-   prompt version
-   model
-   retrieval configuration
-   policy configuration

------------------------------------------------------------------------

## 7.5 Incremental Processing

A one-line change should not require rebuilding the entire repository
unless necessary.

------------------------------------------------------------------------

## 7.6 Idempotency

Duplicate webhook events or jobs must not create duplicate analysis
results.

------------------------------------------------------------------------

## 7.7 Tenant Isolation

Repository data must always be scoped to an authorized
tenant/repository.

------------------------------------------------------------------------

## 7.8 Derived Data Must Be Rebuildable

Indexes, embeddings, graphs, and analytics should be treated as derived
data.

The system should be able to rebuild them from authoritative
repository/revision data.

------------------------------------------------------------------------

# 8. Product Scope

RepoPilot is divided into ten implementation phases.

  Phase   Capability
  ------- ----------------------------------------
  1       Foundation & Engineering Platform
  2       Source Code Intelligence
  3       Dependency Graph
  4       Persistence, Revisions & Analysis Runs
  5       Search & Retrieval
  6       AI Codebase Intelligence
  7       GitHub Integration
  8       PR Intelligence & AI Review
  9       Production Developer Platform
  10      Advanced Engineering Intelligence

------------------------------------------------------------------------

# 9. Core User Experience

## 9.1 Landing Page

The landing page should communicate one idea immediately:

> **RepoPilot understands your entire codebase --- not just the file
> you're looking at.**

Primary CTA:

**Connect GitHub**

Secondary CTA:

**Explore how it works**

The landing page should demonstrate:

-   repository intelligence
-   dependency understanding
-   AI answers
-   PR intelligence
-   architecture visibility
-   engineering risk signals

------------------------------------------------------------------------

# 10. Home Dashboard

After authentication, the user sees a repository-centric dashboard.

### Dashboard sections

#### Repository overview

-   repository name
-   default branch
-   latest indexed revision
-   indexing status
-   supported languages
-   file count
-   symbol count
-   dependency count

#### Recent activity

-   recent commits
-   recent PRs
-   recent reviews
-   indexing jobs

#### Intelligence signals

-   high-risk modules
-   dependency cycles
-   frequently changed files
-   recurring review findings
-   high-impact modules

#### Quick actions

-   Ask RepoPilot
-   Explore architecture
-   Search code
-   Review recent PRs
-   View repository health

------------------------------------------------------------------------

# 11. Core Functional Requirements

## FR-001 Repository Connection

Users must be able to connect a GitHub repository.

The system must:

-   authenticate through GitHub
-   identify installation permissions
-   store repository metadata
-   initiate initial indexing
-   display indexing progress

------------------------------------------------------------------------

## FR-002 Repository Indexing

RepoPilot must be able to analyze a repository revision.

The pipeline should:

1.  resolve revision SHA
2.  discover source files
3.  parse files
4.  extract symbols
5.  extract imports/exports
6.  construct dependencies
7.  create searchable chunks
8.  generate embeddings
9.  persist analysis state

------------------------------------------------------------------------

## FR-003 Source Code Intelligence

The system must understand:

-   files
-   directories
-   modules
-   functions
-   classes
-   interfaces
-   variables
-   imports
-   exports
-   declarations
-   references

The architecture should allow additional languages later.

------------------------------------------------------------------------

## FR-004 Dependency Intelligence

The system must support:

-   direct dependencies
-   direct dependents
-   callers
-   callees
-   transitive dependencies
-   cycle detection
-   bounded graph traversal

Example query:

> "What depends on PaymentService?"

Expected result:

``` text
PaymentController
CheckoutService
OrderProcessor
PaymentWebhookHandler
```

------------------------------------------------------------------------

# 12. Repository Revision Model

Every analyzed state must correspond to a revision.

Example:

``` text
Repository
  ├── Revision A
  ├── Revision B
  ├── Revision C
  └── Revision D
```

Revision identity should primarily use commit SHA.

A revision should preserve:

-   source snapshot metadata
-   parsing results
-   dependency graph
-   search index state
-   analysis status

Historical revisions must remain immutable.

------------------------------------------------------------------------

# 13. Search Requirements

RepoPilot search should combine:

### Lexical search

Useful for:

-   exact identifiers
-   file names
-   API names
-   error messages
-   configuration keys

### Semantic search

Useful for:

-   conceptual questions
-   unfamiliar terminology
-   behavior-based queries

### Graph-aware retrieval

Useful for:

-   callers
-   dependencies
-   impacted modules
-   related tests

The final retrieval layer should combine these signals.

------------------------------------------------------------------------

# 14. AI Codebase Q&A

Users can ask natural-language questions about the repository.

Examples:

> How does authentication work?

> Where is the payment transaction created?

> What calls `createOrder`?

> What modules would be affected if I change `UserService`?

> Why does this service depend on Redis?

> Where are retries implemented?

The answer should contain:

-   concise explanation
-   supporting code references
-   relevant symbols
-   related modules
-   uncertainty when appropriate

------------------------------------------------------------------------

# 15. AI Grounding Requirements

The AI layer must receive structured context.

Example:

``` text
Question
↓
Query understanding
↓
Hybrid retrieval
↓
Graph expansion
↓
Relevant symbols
↓
Relevant files
↓
Relevant history
↓
Context ranking
↓
LLM
↓
Structured answer
↓
Evidence validation
```

The system must not treat repository content as trusted instructions.

Repository files are untrusted data.

------------------------------------------------------------------------

# 16. AI Output Contract

AI responses should use structured schemas where appropriate.

Example:

``` json
{
  "answer": "Authentication is handled by...",
  "confidence": "HIGH",
  "evidence": [
    {
      "file": "src/auth/AuthService.ts",
      "startLine": 20,
      "endLine": 65
    }
  ],
  "relatedSymbols": [
    "AuthService.login",
    "SessionMiddleware"
  ]
}
```

Evidence must be validated before being shown.

------------------------------------------------------------------------

# 17. GitHub Integration

RepoPilot will integrate through a GitHub App.

Required capabilities include:

-   repository discovery
-   repository metadata
-   commit information
-   pull requests
-   PR files
-   diffs
-   webhook events
-   GitHub Checks

The integration must follow least-privilege permissions.

Webhook deliveries must be authenticated and idempotently processed.

------------------------------------------------------------------------

# 18. Pull Request Intelligence

When a PR changes:

``` text
GitHub PR
   ↓
Diff
   ↓
Changed Files
   ↓
Changed Symbols
   ↓
Dependency Impact
   ↓
Related Tests
   ↓
Relevant Historical Context
   ↓
AI Review
   ↓
Validated Findings
   ↓
GitHub Check
```

------------------------------------------------------------------------

# 19. AI Review Product

RepoPilot should focus on **high-signal findings**, not maximum finding
count.

Potential review categories:

-   correctness
-   security
-   reliability
-   API contract changes
-   data integrity
-   concurrency
-   dependency impact
-   regression risk
-   missing relevant tests
-   architectural inconsistency

The system should avoid reporting:

-   stylistic preferences
-   obvious formatting issues
-   speculative concerns
-   low-value comments
-   findings unrelated to the change

------------------------------------------------------------------------

# 20. Review Finding Model

Each finding should contain:

``` text
Title
Severity
Confidence
Category
Description
Evidence
Suggested Action
Fingerprint
Status
```

Severity:

``` text
CRITICAL
HIGH
MEDIUM
LOW
INFO
```

Confidence:

``` text
HIGH
MEDIUM
LOW
```

Severity and confidence are separate dimensions.

------------------------------------------------------------------------

# 21. Review Policy

Repositories should be able to configure policies.

Example:

``` yaml
review:
  fail_on:
    - CRITICAL
    - HIGH

  warn_on:
    - MEDIUM

  min_confidence:
    block: HIGH
```

The policy engine determines whether a review becomes:

``` text
PASS
WARN
FAIL
NEUTRAL
```

AI should not directly determine whether CI fails.

------------------------------------------------------------------------

# 22. Review Lifecycle

A PR review should have explicit states:

``` text
QUEUED
↓
RUNNING
↓
COMPLETED
```

Failure paths:

``` text
RUNNING
↓
FAILED
```

New PR revision:

``` text
OLD REVIEW
↓
STALE
```

This prevents stale results from being treated as current.

------------------------------------------------------------------------

# 23. Production Architecture Requirements

The platform should separate:

### Web application

Responsible for:

-   authentication
-   dashboards
-   search
-   repository views
-   review UI

### API

Responsible for:

-   domain APIs
-   authorization
-   repository operations
-   orchestration

### Workers

Responsible for:

-   repository indexing
-   parsing
-   graph construction
-   embeddings
-   AI reviews
-   history ingestion

### Queue

Responsible for:

-   asynchronous work
-   retries
-   backoff
-   concurrency
-   job lifecycle

### Database

PostgreSQL is the primary system of record.

Potential extensions:

-   pgvector
-   full-text search
-   relational graph representation

------------------------------------------------------------------------

# 24. Recommended Technology Direction

Initial implementation:

### Frontend

-   Next.js
-   TypeScript
-   Tailwind CSS or equivalent design system

### Backend

-   TypeScript
-   Fastify

### Data

-   PostgreSQL
-   pgvector

### Queue

-   Redis
-   BullMQ or equivalent

### Code analysis

-   Tree-sitter
-   language-specific parsers where necessary

### AI

Provider abstraction supporting one or more LLM providers.

### GitHub

GitHub App + GitHub API.

### Testing

-   unit tests
-   integration tests
-   API tests
-   repository fixture tests
-   evaluation datasets
-   security tests

------------------------------------------------------------------------

# 25. Data Model --- Product-Level Entities

Core entities:

``` text
Organization
User
Repository
RepositoryInstallation
RepositoryRevision
AnalysisRun
File
Symbol
Import
Export
Dependency
CodeChunk
Embedding
PullRequest
PullRequestRevision
Review
ReviewFinding
ReviewEvidence
Commit
CommitFile
CoChange
Hotspot
```

Relationships:

``` text
Organization
  ↓
Repository
  ↓
RepositoryRevision
  ↓
Files
  ↓
Symbols
  ↓
Dependencies
```

And:

``` text
Repository
  ↓
PullRequest
  ↓
PullRequestRevision
  ↓
Review
  ↓
ReviewFinding
  ↓
Evidence
```

------------------------------------------------------------------------

# 26. Analysis Run Model

Every expensive analysis should have a tracked run.

An analysis run should record:

-   run ID
-   repository
-   revision
-   run type
-   status
-   analyzer version
-   started time
-   completed time
-   failure reason
-   metrics

Example:

``` text
RUN-123
Repository: acme/payments
Revision: 83fa...
Type: PR_REVIEW
Status: COMPLETED
Analyzer: 0.8.2
Duration: 42s
```

This enables reproducibility and debugging.

------------------------------------------------------------------------

# 27. Background Job Requirements

Jobs must be:

-   idempotent
-   retryable
-   observable
-   bounded
-   cancellable where possible
-   associated with tenant/repository context

Potential queues:

``` text
repository-sync
repository-analysis
embedding-index
pr-review
history-index
analytics
```

Transient failures should use exponential backoff.

Permanent failures should enter a dead-letter workflow.

------------------------------------------------------------------------

# 28. Security Requirements

## Repository Security

-   strict tenant isolation
-   repository-level authorization
-   least-privilege GitHub permissions
-   encrypted secrets
-   no credentials in source control
-   secure webhook validation

## AI Security

Repository content must be treated as untrusted input.

Defenses should include:

-   prompt injection resistance
-   secret detection/redaction
-   output validation
-   evidence validation
-   context boundaries
-   tool isolation

RepoPilot should never allow arbitrary repository content to override
system instructions.

------------------------------------------------------------------------

# 29. Privacy Requirements

RepoPilot may process private source code.

Therefore:

-   repository content must never leak between tenants
-   logs must not contain raw source unnecessarily
-   secrets must not be persisted in plaintext
-   LLM provider policies must be understood before sending private code
-   data retention must be configurable
-   deletion must remove repository-derived data

------------------------------------------------------------------------

# 30. Observability Requirements

Every major pipeline must emit structured events.

Examples:

``` text
repository.index.started
repository.index.completed
repository.index.failed

analysis.run.started
analysis.run.completed
analysis.run.failed

pr.review.started
pr.review.completed
pr.review.failed

llm.request.started
llm.request.completed
llm.request.failed

github.webhook.received
github.webhook.rejected
github.check.created
```

Metrics should include:

-   indexing latency
-   PR review latency
-   queue depth
-   job failures
-   GitHub API failures
-   LLM latency
-   LLM token usage
-   embedding cost
-   retrieval latency
-   finding count
-   high-confidence finding rate

------------------------------------------------------------------------

# 31. Performance Requirements

Initial targets should be measurable rather than blindly optimized.

### API

Target:

-   P50 \< 150 ms for normal metadata requests
-   P95 \< 500 ms for normal metadata requests

### Search

Target:

-   P95 \< 1 second for normal repository search after indexes are warm

### Review

Target:

-   asynchronous
-   visible progress
-   bounded execution time
-   graceful degradation for very large PRs

### Indexing

Requirements:

-   incremental indexing
-   parallelizable workers
-   bounded memory usage
-   resumable failures

------------------------------------------------------------------------

# 32. Large Repository Strategy

RepoPilot should not assume every repository fits comfortably in memory.

The system should:

-   stream file processing
-   process files independently
-   batch database writes
-   batch embedding requests
-   limit graph traversal
-   limit context size
-   prioritize changed code for PR reviews
-   process large repositories incrementally

------------------------------------------------------------------------

# 33. Reliability Requirements

The platform should survive:

-   duplicate GitHub webhooks
-   worker crashes
-   API restarts
-   Redis restarts
-   transient GitHub failures
-   LLM failures
-   embedding provider failures
-   malformed source code
-   unsupported files
-   incomplete analysis

A failed derived-data pipeline must not corrupt the authoritative
repository/revision state.

------------------------------------------------------------------------

# 34. Evaluation Strategy

AI quality cannot be measured only through manual demos.

RepoPilot should maintain evaluation datasets covering:

### Codebase Q&A

Questions with known evidence.

### PR review

PRs with known defects and known-clean changes.

### Grounding

Answers must reference real repository evidence.

### Hallucination

Questions where evidence is absent.

Expected behavior:

> "Insufficient evidence."

### Prompt injection

Repository files containing malicious instructions.

Expected behavior:

The instructions are treated as data.

------------------------------------------------------------------------

# 35. Product Quality Metrics

## Search

-   retrieval relevance
-   top-k recall
-   query latency

## Q&A

-   grounded answer rate
-   citation validity
-   hallucination rate
-   user acceptance rate

## PR Review

-   precision of high-severity findings
-   false-positive rate
-   evidence validity
-   finding resolution rate
-   review latency

The key PR metric should be:

> **High-signal finding precision**

rather than total number of comments.

------------------------------------------------------------------------

# 36. Product Analytics

Track product usage at the aggregate level.

Useful events:

``` text
repository.connected
repository.indexed
search.performed
question.asked
architecture.explored
pr.review.viewed
finding.opened
finding.dismissed
finding.accepted
```

Avoid collecting developer-performance metrics.

------------------------------------------------------------------------

# 37. Phase-Based Product Milestones

## Phase 1 --- Foundation

Outcome:

A deployable engineering platform with frontend, API, database, Redis,
testing, CI, and logging.

------------------------------------------------------------------------

## Phase 2 --- Source Code Intelligence

Outcome:

RepoPilot understands repository structure, files, symbols, imports, and
exports.

------------------------------------------------------------------------

## Phase 3 --- Dependency Graph

Outcome:

RepoPilot understands relationships between symbols/modules and can
perform bounded impact analysis.

------------------------------------------------------------------------

## Phase 4 --- Persistence & Revisions

Outcome:

Repository state becomes immutable and reproducible by revision.

------------------------------------------------------------------------

## Phase 5 --- Search & Retrieval

Outcome:

Users can search the repository semantically, lexically, and using graph
context.

------------------------------------------------------------------------

## Phase 6 --- AI Intelligence

Outcome:

Users can ask grounded questions about the codebase.

------------------------------------------------------------------------

## Phase 7 --- GitHub Integration

Outcome:

GitHub repositories and events become connected to RepoPilot.

------------------------------------------------------------------------

## Phase 8 --- PR Intelligence

Outcome:

RepoPilot analyzes pull requests using diff + code + dependency + test
context.

------------------------------------------------------------------------

## Phase 9 --- Production Developer Platform

Outcome:

Automated reviews, GitHub Checks, workers, retries, policies,
dashboards, and production operations.

------------------------------------------------------------------------

## Phase 10 --- Advanced Engineering Intelligence

Outcome:

RepoPilot understands code evolution, historical changes, hotspots,
recurring issues, and architecture evolution.

------------------------------------------------------------------------

# 38. MVP Definition

The MVP should not require all Phase 10 functionality.

A strong MVP should demonstrate:

1.  Connect GitHub repository.
2.  Index a repository.
3.  Parse source code.
4.  Build dependency relationships.
5.  Search code.
6.  Ask grounded questions.
7.  Open a PR.
8.  Analyze the PR.
9.  Produce evidence-backed findings.
10. Publish a GitHub Check.

The MVP should tell a compelling end-to-end story:

> **Connect repository → RepoPilot understands it → developer changes
> code → RepoPilot understands the impact → RepoPilot reviews the PR
> using repository evidence.**

------------------------------------------------------------------------

# 39. Flagship Demo Scenario

Use a realistic TypeScript application.

Example:

``` text
User changes:
PaymentService.processPayment()
```

RepoPilot detects:

``` text
PaymentService
      ↓
CheckoutService
      ↓
OrderService
      ↓
DatabaseTransaction
```

It also finds:

``` text
PaymentService
  ← CheckoutController
  ← WebhookHandler
  ← RetryWorker
```

The PR changes transaction handling.

RepoPilot determines:

-   changed symbol
-   affected callers
-   related tests
-   historical changes
-   similar previous PRs
-   potential transaction-ordering risk

AI receives the evidence.

The final finding:

``` text
HIGH — Transaction ordering risk

PaymentService.processPayment() now commits the
transaction before the order state is updated.

Evidence:
src/payment/PaymentService.ts:84-102
src/order/OrderService.ts:41-67

Affected callers:
CheckoutService.processCheckout()
WebhookHandler.handlePayment()

Related test:
tests/payment/payment-flow.test.ts

Confidence:
HIGH
```

Then RepoPilot publishes the finding through a GitHub Check.

This is the core product story.

------------------------------------------------------------------------

# 40. Acceptance Criteria for the Product

RepoPilot is considered production-ready only when:

### Architecture

-   [ ] Services are clearly separated.
-   [ ] Background jobs are isolated from request handling.
-   [ ] Derived data is rebuildable.
-   [ ] Repository revisions are immutable.

### Security

-   [ ] Tenant isolation is enforced.
-   [ ] GitHub webhooks are verified.
-   [ ] Secrets are protected.
-   [ ] Repository content is treated as untrusted AI input.
-   [ ] Prompt injection tests exist.

### Reliability

-   [ ] Jobs are idempotent.
-   [ ] Jobs retry transient failures.
-   [ ] Dead-letter handling exists.
-   [ ] Stale PR reviews are invalidated.
-   [ ] Worker crashes do not corrupt state.

### AI

-   [ ] Outputs use schemas.
-   [ ] Evidence is validated.
-   [ ] Unsupported claims are rejected or marked uncertain.
-   [ ] Prompt versions are tracked.
-   [ ] Model/version metadata is stored.

### Search

-   [ ] Lexical search works.
-   [ ] Semantic search works.
-   [ ] Graph-aware retrieval works.
-   [ ] Retrieval is benchmarked.

### GitHub

-   [ ] Repository installation works.
-   [ ] Push events work.
-   [ ] PR events work.
-   [ ] Duplicate deliveries are safe.
-   [ ] GitHub Checks work.

### Operations

-   [ ] Structured logs exist.
-   [ ] Metrics exist.
-   [ ] Error tracking exists.
-   [ ] Queue health is visible.
-   [ ] Production runbooks exist.

------------------------------------------------------------------------

# 41. Definition of Done

A feature is not complete merely because it works locally.

A feature is done when:

-   [ ] requirements are implemented
-   [ ] architecture is documented
-   [ ] migrations are included
-   [ ] unit tests exist
-   [ ] integration tests exist where appropriate
-   [ ] failure cases are tested
-   [ ] observability exists
-   [ ] authorization is verified
-   [ ] performance implications are understood
-   [ ] documentation is updated
-   [ ] CI passes
-   [ ] code review passes
-   [ ] rollback/recovery path exists where applicable

------------------------------------------------------------------------

# 42. Documentation Requirements

The repository should contain:

``` text
docs/
├── PRD.md
├── HLD.md
├── LLD/
├── ADR/
├── API/
├── SECURITY.md
├── CONTRIBUTING.md
├── RUNBOOKS/
├── EVALUATION/
└── ARCHITECTURE/
```

Architecture Decision Records should document important decisions such
as:

-   Tree-sitter vs language-specific parsers
-   PostgreSQL graph vs graph database
-   pgvector vs external vector database
-   queue technology
-   LLM provider abstraction
-   review policy architecture
-   multi-tenancy model
-   data retention strategy

------------------------------------------------------------------------

# 43. Recommended Repository Structure

``` text
repopilot/
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
│
├── packages/
│   ├── domain/
│   ├── database/
│   ├── parser/
│   ├── graph/
│   ├── retrieval/
│   ├── ai/
│   ├── github/
│   ├── jobs/
│   ├── observability/
│   └── config/
│
├── docs/
│   ├── PRD.md
│   ├── HLD.md
│   ├── LLD/
│   ├── ADR/
│   └── runbooks/
│
├── tests/
│   ├── fixtures/
│   ├── integration/
│   ├── evaluation/
│   └── security/
│
├── infrastructure/
│   ├── docker/
│   └── deployment/
│
└── .github/
    └── workflows/
```

------------------------------------------------------------------------

# 44. Release Strategy

## Alpha

Target:

-   developer-only
-   selected repositories
-   manual indexing
-   limited languages
-   internal evaluation

## Private Beta

Target:

-   GitHub App
-   automatic PR reviews
-   multiple repositories
-   production monitoring
-   feedback collection

## Public Beta

Target:

-   multi-tenant SaaS
-   repository management
-   billing foundation
-   documented security model
-   strong evaluation benchmarks

## General Availability

Requires:

-   operational maturity
-   security review
-   data deletion workflows
-   predictable costs
-   reliability targets
-   support processes
-   production runbooks

------------------------------------------------------------------------

# 45. Future Expansion

After the core platform is stable:

### Cross-repository intelligence

Understand relationships between services and repositories.

### Incident intelligence

Connect incidents to:

-   commits
-   PRs
-   modules
-   deployments
-   changes

### Architecture evolution

Show:

``` text
Architecture
     ↓
Change
     ↓
PR
     ↓
Review
     ↓
Production signal
```

### Engineering knowledge graph

Build a unified graph of:

``` text
People* 
Repositories
Services
Files
Symbols
Dependencies
Commits
PRs
Reviews
Incidents
Documentation
```

`*` People data must be handled carefully and should not become
performance scoring.

------------------------------------------------------------------------

# 46. Product Success Definition

RepoPilot succeeds when a developer can enter an unfamiliar repository
and understand it substantially faster.

The most important product question is:

> **Does RepoPilot help engineers make safer changes with less codebase
> archaeology?**

Secondary questions:

-   Are AI answers grounded?
-   Are PR findings useful?
-   Is the architecture understandable?
-   Does the system identify real impact?
-   Does it reduce review noise?
-   Can engineers trust its evidence?

------------------------------------------------------------------------

# 47. Final Product Positioning

RepoPilot should not be positioned as:

> "Another AI code reviewer."

The stronger positioning is:

> **RepoPilot is an AI engineering intelligence platform that
> understands your codebase, architecture, dependencies, history, and
> pull requests --- then turns that understanding into actionable
> engineering insight.**

The product differentiator is the combination of:

``` text
Source Intelligence
        +
Dependency Graph
        +
Revision History
        +
Semantic Retrieval
        +
GitHub Context
        +
AI Reasoning
        +
Evidence Validation
        +
Engineering Signals
```

That combination is what turns RepoPilot from an LLM wrapper into a
serious engineering platform.
