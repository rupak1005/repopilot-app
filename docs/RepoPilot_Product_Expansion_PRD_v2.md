**RepoPilot**

**Product Expansion PRD v2**

*From AI code review to a living engineering intelligence workspace*

Version 2.0 • Product definition • August 20, 2026

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>North-star statement<br />
</strong>RepoPilot should understand what a software system is, why it is the way it is, what will change when engineers modify it, and whether the change is safe — all from evidence that remains traceable to the repository and its engineering history.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# Table of Contents

- 1\. Document control and relationship to PRD v1

- 2\. Executive summary

- 3\. What changes in v2

- 4\. Competitive research and product lessons

- 5\. Product thesis and differentiation

- 6\. Target users and jobs-to-be-done

- 7\. Product principles

- 8\. Product model: the Context Graph

- 9\. Core product experience

- 10\. Capability portfolio and prioritization

- 11\. Feature specifications

- 12\. UX/UI system expansion

- 13\. AI and evidence architecture

- 14\. MCP and agent ecosystem strategy

- 15\. GitHub, issue tracker, CI and production integrations

- 16\. Data model expansion

- 17\. Security, privacy and trust

- 18\. Analytics and product quality metrics

- 19\. Roadmap and release phases

- 20\. Revised MVP / flagship demo

- 21\. Acceptance criteria and definition of done

- 22\. Risks and trade-offs

- 23\. Open decisions / future research

- 24\. Competitive differentiation matrix

- 25\. Research references

# 1. Document Control and Relationship to PRD v1

Product: RepoPilot

Category: AI Engineering Intelligence Platform

Audience: Founders, product engineers, staff engineers, engineering managers, security, design, and future contributors

Status: Expanded product definition

Supersedes: PRD v1 for product scope and roadmap decisions where the documents differ

Source basis: RepoPilot PRD v1 plus competitive research conducted in August 2026.

PRD v1 established the core product thesis: RepoPilot should construct a continuously updated understanding of a repository from files, symbols, dependencies, revisions, pull requests, history, retrieval, AI explanations, and engineering risk signals. It explicitly requires evidence-backed AI, deterministic analysis before generation, reproducibility, incremental processing, idempotency, tenant isolation, and rebuildable derived data.

This v2 does not discard that foundation. It adds the product surfaces and workflows required to turn the underlying intelligence layer into a category-defining engineering workspace.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Source anchor<br />
</strong>PRD v1 states that RepoPilot is not simply an AI code reviewer, but an engineering intelligence layer for the software development lifecycle. This v2 makes that positioning concrete in the product experience.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 2. Executive Summary

RepoPilot v1 correctly identified a deep problem: software repositories are not collections of independent files. Engineers reason about relationships across symbols, modules, dependencies, revisions, pull requests, tests, historical intent, and risk. RepoPilot therefore builds a structured repository model before asking AI to reason over it.

The competitive landscape shows that leading products are converging on several adjacent capabilities: richer code context, visual code maps, repository-generated documentation, planning from requirements, multi-agent review, team governance, agent/MCP integration, and review workflow optimization. Sourcegraph describes context retrieval across keyword search, native search and code graph; CodeSee provides interactive maps and PR-specific review maps; Qodo emphasizes contextual review, rules and governance; Greptile uses graph indexing plus parallel review agents; GitHub Copilot code review can use MCP servers and repository agent skills; Augment is exposing a context engine to MCP-compatible coding agents; and Graphite is integrating AI review into a unified PR workflow. These are important market signals, not feature checklists to copy.

RepoPilot should win by integrating these ideas around a stronger object: the living software system. The product should make the repository itself the primary workspace, with every file, symbol, service, PR, commit, test, document, rule, decision and risk connected through a Context Graph.

The resulting loop is:

- Understand → Explore → Plan → Change → Review → Verify → Learn → Update the system model

# 3. What Changes in v2

**Context Graph becomes a first-class product subsystem:** The existing graph/retrieval architecture becomes the central integration layer for code, history, tests, docs, PRs, issues, ownership, policies and future production signals.

**Architecture becomes interactive:** The dependency graph evolves into an Architecture Workspace with contextual exploration, impact highlighting, change visualization and evidence-linked nodes.

**Impact analysis becomes a flagship workflow:** Users can ask what will break, what is affected, which tests matter, what history says and how risky a change is.

**Planning is added:** RepoPilot can transform a PRD, issue, requirement or natural-language request into an evidence-backed implementation plan.

**Knowledge becomes persistent:** RepoPilot Wiki, Architecture Time Machine, decision mining, documentation freshness and review memory turn one-off analysis into cumulative product knowledge.

**Review becomes multi-stage:** Specialized review agents produce findings that are then normalized and evidence-validated by a final review orchestrator.

**Agents become first-class consumers:** An MCP/agent gateway makes RepoPilot context callable from Claude Code, Cursor, Codex, Copilot, Gemini CLI and other compatible tools.

**The workflow becomes closed-loop:** Review findings can be fixed, verified, remembered and used to improve repository-specific rules and future reviews.

**The visual system becomes an engineering workspace:** The GitDiagram-inspired neo-brutalist brand layer is retained selectively, while dense engineering screens use calmer, data-first treatments.

# 4. Competitive Research and Product Lessons

The goal of competitive research is not feature imitation. It is to identify where user expectations are moving and where RepoPilot can combine capabilities into a stronger system.

| Competitor       | Notable capability                                             | Market lesson                                                                   | RepoPilot response                                                                           |
|------------------|----------------------------------------------------------------|---------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------|
| Sourcegraph      | Code context, search contexts, code graph, IDE/web assistant   | Context is a product capability in its own right; retrieval quality is a moat.  | Build a multi-dimensional Context Graph with explicit retrieval traces and context packs.    |
| Augment          | Context Engine + MCP for coding agents                         | High-quality context should follow the developer into whichever agent they use. | Make RepoPilot consumable as infrastructure through MCP, not only as a web app.              |
| CodeSee          | Interactive codebase maps, PR review maps, tours               | Visual context reduces the cognitive cost of understanding changes.             | Build Architecture Workspace, Review Map, impact highlighting and guided code tours.         |
| DeepWiki / Devin | Generated repository documentation and Q&A                     | A repository can become a living knowledge base.                                | Build revision-aware, evidence-linked RepoPilot Wiki.                                        |
| Qodo             | Contextual review, rules, risk and governance                  | Teams need durable standards and auditability, not just comments.               | Build Engineering Rules, Review Memory, rule health, risk concentration and audit history.   |
| Greptile         | Graph index + parallel review agents + learning from comments  | Multi-agent review is useful when agents are specialized and grounded.          | Use specialized reviewers and an evidence validator, while preserving high-signal precision. |
| CodeRabbit       | AI review plus planning from issues/requirements               | Planning is increasingly part of the AI engineering workflow.                   | Add repository-aware implementation planning and requirement-to-code traceability.           |
| GitHub Copilot   | Code review with repository instructions, agent skills and MCP | AI review is becoming an extensible system with external context.               | Expose RepoPilot context through MCP and use repository policies as structured inputs.       |
| Graphite         | PR inbox, AI review, chat, merge workflow                      | Review quality depends on workflow ergonomics, not only model quality.          | Build an engineering change inbox and action-oriented review workspace.                      |
| GitDiagram       | Architecture-first diagrams, source linking, streaming, export | Instant architectural visibility is a compelling entry point.                   | Make architecture visual, clickable, stream-aware and deeply connected to code intelligence. |

# 5. Product Thesis and Differentiation

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Category position<br />
</strong>RepoPilot is the living intelligence layer for a software system: it connects what the code is, why it exists, what it depends on, what changed, what will be affected, and what engineering action should happen next.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 5.1 Core differentiator

Most tools optimize a slice of the lifecycle. RepoPilot should unify the lifecycle around one persistent evidence graph. The moat is not one AI prompt. The moat is cumulative context plus validated relationships plus historical feedback.

The desired product loop is:

- Repository snapshot and Git history are ingested into authoritative revision records.

- Deterministic analyzers produce files, symbols, dependencies, tests, owners and other facts.

- Contextual retrieval assembles evidence relevant to a question, change or review.

- AI reasons over the evidence and must preserve references back to it.

- Users explore the resulting architecture, risks and explanations visually.

- Plans, reviews and remediation actions are created from the same context.

- Human feedback, accepted rules and historical outcomes become new structured knowledge.

# 6. Target Users and Jobs-to-be-Done

**Developer:** Understand unfamiliar code, plan changes, find impact, get safe context, and move faster without repeatedly reconstructing architecture.

**Senior / Staff Engineer:** Assess system topology, review high-impact changes, understand intent, detect architectural drift, and validate proposed designs.

**Engineering Manager:** Understand repository health, change risk, review quality and recurring engineering patterns without turning the product into employee surveillance.

**New Engineer:** Learn the architecture, find the right code, understand historical intent, and follow curated code tours.

**Security / Platform Engineer:** Trace security-sensitive paths, establish policies, assess blast radius, and verify controls across repositories.

**AI Coding Agent:** Retrieve high-quality repository context, impact, conventions, historical evidence and testing requirements through a machine-readable interface.

## 6.1 Critical user jobs

- “Where is this implemented?”

- “Why does this exist?”

- “What depends on this?”

- “What breaks if I change it?”

- “Has this problem happened before?”

- “What does this PR change architecturally?”

- “Does this PR satisfy the requirement?”

- “Which tests should I run?”

- “Is this architecture consistent with our conventions?”

- “Give my coding agent enough context to implement this safely.”

# 7. Product Principles

**Evidence over speculation:** Important claims should cite code, symbols, revisions, PRs, tests, docs or graph relationships.

**Deterministic before generative:** Facts and relationships should be collected before AI interpretation.

**Explicit uncertainty:** Insufficient evidence is a valid and expected outcome.

**System over snippet:** The primary unit of reasoning is the software system, not isolated text.

**Change before review:** Understanding intended and actual impact should precede code-review judgment.

**Explainability over score theater:** Every risk score, health signal or recommendation must have a reason trail.

**Actionability:** Answers should naturally lead to explore, plan, fix, test, document, or hand off to an agent.

**Human control:** AI can suggest, but policy and merge decisions remain explicit and auditable.

**Cumulative intelligence:** Feedback and historical outcomes should improve future context and review quality.

**Product identity without visual fatigue:** Use the neo-brutalist brand language selectively; dense engineering UIs remain readable and calm.

# 8. Product Model: The Context Graph

The Context Graph is the central product abstraction added in v2. It is not merely a graph database. It is a normalized view of all evidence that can materially explain or constrain engineering decisions.

Core node classes:

- Organization

- Repository

- Revision

- File

- Directory

- Symbol

- Service / Module

- Dependency

- Test

- Pull Request

- Commit

- Issue / Requirement

- Document

- ADR / Decision

- Rule / Policy

- Owner

- Review

- Finding

- Deployment

- Incident (future)

- Metric / Health signal

Core relationship classes:

- imports / exports

- calls / called-by

- depends-on / depended-on-by

- contains

- defined-in

- tested-by

- changed-in

- introduced-by

- related-to

- implements

- documents

- owned-by

- violates

- resolved-by

- impacts

- deployed-by

- correlated-with

# 9. Core Product Experience

## 9.1 Product shell

RepoPilot should behave more like an engineering workspace than a marketing dashboard. The global shell consists of:

- Global search / Ask bar

- Repository switcher

- Primary navigation: Overview, Architecture, Code, Search, Ask, Changes, Pull Requests, History, Risks, Tests, Docs

- Contextual workspace

- Action tray for Plan / Explain / Impact / Review / Send to Agent

- Account and organization settings

## 9.2 Universal search / Ask

One command surface should accept identifiers, natural-language questions, PRs, commits, file paths, docs, issues and architecture concepts. Example queries include “PaymentService”, “what depends on CheckoutService?”, “why was Redis introduced?”, “PR \#492”, and “show me the authentication flow”.

## 9.3 Object-centric workspace

Selecting any important object should expose a consistent set of contextual tabs: Overview, Relationships, History, Evidence, Risk, AI, and Actions. This reduces page hopping and makes the repository feel like one navigable system.

## 9.4 Ask → Explore → Act

Every AI interaction should offer a progression: Ask for an explanation; Explore the underlying graph and evidence; Act by generating a plan, test list, issue, ADR, documentation update, patch, or agent context pack.

# 10. Capability Portfolio and Prioritization

| Priority | Capability                     | Definition                                 | Reason                             |
|----------|--------------------------------|--------------------------------------------|------------------------------------|
| P0       | Context Graph                  | Central repository intelligence graph      | Core product moat and prerequisite |
| P0       | Architecture Workspace         | Interactive visual repository architecture | Primary comprehension surface      |
| P0       | Impact Intelligence            | What breaks / downstream impact            | Core safe-change workflow          |
| P0       | Evidence-backed Q&A            | Grounded answers with citations            | Existing core, deepen UX           |
| P0       | PR Change Intelligence         | Diff → symbols → impact → tests → risk     | Bridge between code and review     |
| P0       | Multi-agent review             | Specialized reviewers + validator          | High-signal review                 |
| P0       | MCP / Agent Gateway            | Context API for coding agents              | Distribution and strategic moat    |
| P1       | RepoPilot Wiki                 | Living, revision-aware documentation       | Persistent knowledge layer         |
| P1       | Engineering Planning           | Requirement → implementation plan          | Expands lifecycle earlier          |
| P1       | Test Impact Analysis           | Change → relevant tests                    | Actionability and CI efficiency    |
| P1       | Architecture Time Machine      | Historical architecture exploration        | Unique history advantage           |
| P1       | Historical Similarity          | Find analogous past changes / incidents    | Regression prevention              |
| P1       | Review Memory / Rules          | Learn repository conventions from feedback | Governance and personalization     |
| P1       | Architecture Drift             | Detect deviation from intended patterns    | Staff-level value                  |
| P1       | Code Tours / Onboarding        | Guided system learning                     | New engineer and OSS value         |
| P1       | Security Intelligence          | Business-logic paths + blast radius        | High-value vertical                |
| P2       | Requirements traceability      | Issue → implementation → PR → tests        | Enterprise workflow                |
| P2       | Engineering Health             | Explainable repository health              | Management / staff visibility      |
| P2       | Documentation freshness        | Code change → stale docs                   | Knowledge integrity                |
| P2       | Engineering Inbox              | Prioritized cross-repo change workflow     | Workflow consolidation             |
| P2       | Cross-repository graph         | Service/repo relationships                 | Platform expansion                 |
| P2       | Incident / production feedback | Incident → change → code                   | Full SDLC intelligence             |

# 11. Feature Specifications

## 11.1 Context Graph

Goal: unify deterministic facts, historical evidence, semantic context and engineering metadata into a queryable product model.

### Functional requirements

- Build graph entities from parser output, GitHub data, tests, docs and configuration.

- Maintain revision-scoped edges where relationships change over time.

- Expose provenance for derived relationships.

- Allow bounded traversal for impact and retrieval.

- Support graph expansion from AI questions, symbols, PRs and documents.

### Acceptance criteria

- User can inspect any edge and see how it was derived.

- Context retrieval returns ranked evidence plus graph relationships.

- Revision changes do not mutate historical facts.

- Tenant/repository authorization is enforced for every graph read.

## 11.2 Architecture Workspace

Goal: make system topology directly navigable and useful for reasoning.

### Functional requirements

- Generate system/module/service views from deterministic graph data first.

- Allow zoom, pan, focus, collapse/expand, search, filters and pinning.

- Highlight inbound/outbound dependencies when a node is selected.

- Open source, symbol, PR, commit and doc evidence from graph nodes.

- Provide “Ask about this”, “Show impact”, “Show history”, and “Create plan” actions.

- Support architecture snapshots for current and historical revisions.

### Acceptance criteria

- Selecting a symbol highlights direct and transitive relationships within a bounded scope.

- Every visible node can be traced to repository evidence.

- A PR can generate a change-specific architecture view.

- The map remains legible when unchanged nodes are hidden.

## 11.3 Impact Intelligence

Goal: answer “what breaks if I change this?” before the developer opens a PR.

### Functional requirements

- Compute direct callers/callees and bounded transitive dependents.

- Overlay tests, external integrations, ownership and historical risk.

- Distinguish deterministic impact from AI-inferred potential impact.

- Generate a confidence-aware change summary.

- Offer a safe-change checklist.

### Acceptance criteria

- Impact view lists direct and transitive effects separately.

- Test recommendations explain why each test is relevant.

- AI cannot present inferred effects as deterministic facts.

## 11.4 RepoPilot Wiki

Goal: turn a repository into a living, evidence-linked knowledge base.

### Functional requirements

- Generate overview, architecture, subsystem, API, data, testing, deployment and security pages.

- Link claims to files, symbols, revisions, PRs and ADRs.

- Track “last verified at revision”.

- Detect when linked evidence changed materially.

- Permit human edits without losing machine provenance.

### Acceptance criteria

- Every generated page shows source/evidence references.

- Stale pages are marked and explain why they are stale.

- A document can be regenerated from current evidence without destroying human annotations.

## 11.5 Engineering Planning

Goal: move RepoPilot earlier in the lifecycle from review into implementation planning.

### Functional requirements

- Accept issue, ticket, PRD, natural-language request, design notes or architecture brief.

- Retrieve affected areas of the codebase.

- Generate tasks for code, data, APIs, tests, security, docs and deployment.

- Attach evidence and rationale to every material task.

- Export plans to Markdown and agent-specific formats.

### Acceptance criteria

- Plan identifies affected files/modules and explains why.

- Plan explicitly calls out unknowns and unsupported assumptions.

- Plan can be sent as a Context Pack to an external coding agent.

## 11.6 PR Change Intelligence

Goal: transform a raw diff into an architectural and risk narrative.

### Functional requirements

- Map changed lines to symbols and modules.

- Calculate dependency and test impact.

- Find related historical changes.

- Detect architectural changes and new coupling.

- Summarize high-risk paths before AI review.

### Acceptance criteria

- PR overview contains changed components, affected components, tests and risk.

- Visual review map can focus on changed and potentially impacted nodes.

- New commits refresh the change model and invalidate stale states.

## 11.7 Multi-agent Review

Goal: improve precision through specialized analysis while preserving one coherent output.

### Functional requirements

- Run correctness, security, reliability, architecture, API contract, test impact and historical-regression passes as appropriate.

- Normalize findings into one schema.

- Deduplicate overlapping findings.

- Validate evidence and line references.

- Apply repository rules and review policy after evidence validation.

### Acceptance criteria

- A finding cannot reach a blocking status without validated evidence.

- Confidence and severity remain separate.

- Reviewer output includes an explanation of evidence and uncertainty.

## 11.8 Review Memory and Engineering Rules

Goal: capture durable repository-specific conventions and avoid repeating rejected review noise.

### Functional requirements

- Allow human feedback to accept, dismiss, or refine findings.

- Convert stable conventions into versioned rules.

- Track rule source, scope, effectiveness and conflicts.

- Surface rule decay when feedback indicates a rule is no longer useful.

### Acceptance criteria

- Rules are auditable and versioned.

- Human feedback can suppress future low-value findings without disabling unrelated checks.

- Rule evaluation never silently overrides system-level security controls.

## 11.9 Historical Similarity

Goal: use the repository’s past to improve current engineering decisions.

### Functional requirements

- Find similar diffs, symbols, incidents, review findings and architectural changes.

- Rank similarity by structural and semantic signals.

- Show what happened after the historical change where available.

- Offer “similar change” evidence in PR reviews and plans.

### Acceptance criteria

- Historical results cite exact commits/PRs.

- Similarity never implies causal equivalence without supporting evidence.

## 11.10 Architecture Time Machine

Goal: understand how the system evolved.

### Functional requirements

- Compare architecture snapshots across revisions.

- Show introduced/removed nodes and edges.

- Jump from an architectural change to its introducing commit and PR.

- Generate historical explanations from evidence.

### Acceptance criteria

- A user can select two revisions and compare topology.

- All historical views remain immutable and reproducible.

## 11.11 Test Impact Analysis

Goal: connect code change to the smallest useful validation set.

### Functional requirements

- Map changed symbols/modules to relevant unit/integration/e2e tests.

- Use dependency and historical co-change signals.

- Separate directly related tests from heuristic candidates.

- Produce a prioritized test list for local verification and CI.

### Acceptance criteria

- Every test recommendation exposes its evidence.

- Stale or missing test coverage becomes a review signal.

## 11.12 MCP / Agent Gateway

Goal: make RepoPilot’s intelligence available wherever code is written.

### Functional requirements

- Provide tools for code search, symbol lookup, graph traversal, impact, history, tests, docs and repository Q&A.

- Return provenance with every tool result.

- Support scoped repository/revision contexts.

- Enforce tenant authorization and rate limits.

- Provide agent-friendly Context Pack export.

### Acceptance criteria

- MCP calls never bypass authorization.

- Every result is revision-scoped.

- Tool output is structured and machine-readable.

## 11.13 Code Tours and Onboarding

Goal: reduce time for new engineers to become productive in an unfamiliar repository.

### Functional requirements

- Generate role-specific tours for authentication, payments, API requests, data flow, background jobs and deployment.

- Allow humans to edit/curate tour steps.

- Link each step to graph nodes and source evidence.

- Support “start here” learning paths.

### Acceptance criteria

- A tour can be replayed from a current or historical revision.

- Every AI-generated claim in a tour is evidence-linked.

## 11.14 Security Intelligence

Goal: reason about business-logic and architecture-level security risk.

### Functional requirements

- Trace sensitive entry points through authorization, services and data stores.

- Identify missing controls and risky trust boundaries.

- Compute blast radius of security findings.

- Reference related historical fixes and repository rules.

- Keep security analysis separate from generic style review.

### Acceptance criteria

- Security findings include attack path, evidence, severity, confidence and remediation.

- High-severity findings require explicit evidence validation.

# 12. UX/UI System Expansion

The v2 UX should borrow the confidence and tactile character of GitDiagram’s current neo-brutalist visual system while avoiding a page where every element looks like a poster. GitDiagram’s public implementation uses strong borders, hard offset shadows and compact interaction patterns, while its diagram toolbar uses a lighter floating treatment. RepoPilot should formalize the same layered approach.

**Brand layer:** Lavender/purple surfaces, near-black heavy borders, hard offset shadows, restrained corner radii and tactile CTA interactions. Use primarily for the application shell, major cards, hero surfaces and high-value actions.

**Engineering layer:** Neutral/light surfaces, subtle dividers, compact data typography, moderate radii and limited shadows for tables, code, dense lists and review details.

**Canvas layer:** Floating controls, soft shadows, translucent surfaces and strong focus states for architecture graphs and other visual workspaces.

**Evidence layer:** Evidence should have a consistent visual marker across code references, graph edges, history, PRs and documents. The user must learn one way to recognize “this statement is grounded”.

## 12.1 Workspace layout

Recommended desktop structure: global header + left navigation + central workspace + optional right evidence/context rail. The right rail should appear contextually rather than permanently consuming screen space.

## 12.2 Mobile principles

- Prioritize Ask, Search, repository switching and current-task context.

- Convert persistent side navigation into a drawer.

- Allow graph inspection with focused views rather than trying to fit the full map.

- Keep actions sticky and reachable with a thumb.

- Do not rely on hover-only behaviors.

## 12.3 Visual states

- Selected evidence

- Unverified inference

- Stale evidence

- High risk

- Human-confirmed rule

- AI-generated content

- System-derived fact

- Action required

# 13. AI and Evidence Architecture

RepoPilot v2 keeps the original deterministic-before-generative principle, but formalizes an Evidence Pipeline and a Review Orchestrator around it.

Target reasoning flow:

Question / Change → intent classification → context selection → graph expansion → lexical retrieval → semantic retrieval → historical retrieval → evidence ranking → context compression → model reasoning → structured output → evidence validation → policy evaluation → user presentation

## 13.1 Evidence object

- source_type

- repository_id

- revision_id

- path / entity id

- start_line / end_line where applicable

- relationship id where applicable

- retrieval method

- retrieval score

- validation state

- timestamp

- provenance metadata

## 13.2 Claims model

AI responses should be decomposable into claims. A claim may be deterministic, inferential or uncertain. The UI must make that distinction visible without overwhelming the user.

- DETERMINISTIC: directly supported by repository facts.

- INFERRED: reasoned from multiple evidence sources.

- UNCERTAIN: insufficient evidence or conflicting evidence.

- UNSUPPORTED: rejected before presentation.

## 13.3 Context compression

The system should retrieve more than it sends to the model. A ranking and compression stage should retain the most decision-relevant evidence while preserving coverage of affected modules and important historical context.

## 13.4 Prompt injection and untrusted repository data

Repository content remains untrusted input. Files, comments, issues and docs can contain instructions that conflict with system or developer policy. The retrieval layer must preserve source boundaries, and tools must not treat retrieved text as authority merely because it looks like an instruction.

# 14. MCP and Agent Ecosystem Strategy

Competitor movement toward MCP makes agent interoperability strategically important. GitHub Copilot code review can use MCP servers and repository agent skills, while Augment has exposed its context engine through MCP. RepoPilot should offer its own intelligence as a reusable system service.

## 14.1 Initial MCP tools

- search_codebase

- find_symbol

- find_references

- trace_dependencies

- find_impact

- find_related_tests

- search_history

- find_related_prs

- explain_architecture

- get_repository_rules

- get_risk

- get_context_pack

- ask_repository

- get_documentation

- get_revision_metadata

## 14.2 Agent context contract

Every MCP response should include the requested answer plus machine-readable provenance. Agents must be able to distinguish authoritative repository facts, retrieved text, historical evidence and model inference.

## 14.3 Agent handoff

From the web app, a developer should be able to create a Context Pack containing the exact repository revision, relevant files, symbols, graph relationships, requirements, rules, tests, risks and plan. The package can be copied or sent through an agent integration.

# 15. GitHub, Issue Tracker, CI and Production Integrations

| System                      | Purpose                                                             | Priority        |
|-----------------------------|---------------------------------------------------------------------|-----------------|
| GitHub                      | App, repositories, PRs, commits, diffs, checks, reviews, webhooks   | Required in MVP |
| Issue tracker               | Jira / Linear / GitHub Issues, requirements and acceptance criteria | P1              |
| CI                          | Checks, test runs, failure artifacts and validation status          | P0/P1           |
| Documentation               | Markdown, internal docs, ADRs and knowledge bases                   | P1              |
| Service catalog / ownership | Service ownership, team mapping and dependency context              | P1/P2           |
| Incident tooling            | Incidents and production regressions correlated to changes          | P2              |
| IDE / agents                | MCP and context packs                                               | P0              |
| Slack / notifications       | Actionable review and risk notifications                            | P2              |

# 16. Data Model Expansion

PRD v1 already defines Organization, User, Repository, RepositoryRevision, AnalysisRun, File, Symbol, Import, Export, Dependency, CodeChunk, Embedding, PullRequest, PullRequestRevision, Review, ReviewFinding, ReviewEvidence, Commit, CommitFile, CoChange and Hotspot. v2 adds the following product entities:

- ArchitectureSnapshot

- ArchitectureNode

- ArchitectureEdge

- Requirement

- RequirementLink

- TestCoverageRelation

- DocumentationPage

- DocumentationEvidence

- ArchitectureDecision

- EngineeringRule

- RuleVersion

- RuleEvaluation

- HistoricalSimilarity

- ImpactAnalysis

- ChangeImpactNode

- ContextPack

- AgentSession

- SecurityPath

- RiskSignal

- HealthMetric

- OwnerMapping

- Tour

- TourStep

- EvidenceClaim

- EvidenceValidation

- FindingFeedback

## 16.1 Revision scoping

Any entity whose interpretation depends on code state must carry a revision or immutable source reference. Historical similarity, architecture maps and evidence must never silently mix revisions.

## 16.2 Derived data

Graph structures, embeddings, health metrics, summaries, similarity indexes and documentation snapshots remain rebuildable from authoritative repository/revision and external integration records.

# 17. Security, Privacy and Trust

- Strict tenant and repository isolation across web, API, workers, queues, graph, vector index and object storage.

- Least-privilege GitHub App permissions.

- Webhook authentication and idempotent processing.

- Secrets redaction before logging and AI transmission where appropriate.

- Configurable retention and deletion for repository-derived data.

- Prompt-injection and indirect-instruction defenses.

- Tool authorization checked independently of model intent.

- Audit logs for review decisions, policy changes, rule changes and sensitive access.

- Security findings must not expose unrelated private repository content.

## 17.1 Trust UI

Every material AI answer should make trust visible. Use evidence chips, source links, confidence, timestamps, revision, and a clear distinction between fact and inference. A user should be able to challenge an answer by opening its evidence rather than arguing with an opaque score.

# 18. Analytics and Product Quality Metrics

## 18.1 North-star outcome

Primary outcome: reduction in engineering archaeology time while maintaining or improving safety of changes.

## 18.2 Product metrics

| Area          | Metrics                                                                                               |
|---------------|-------------------------------------------------------------------------------------------------------|
| Comprehension | Time to first correct architecture understanding; successful completion of onboarding/code-tour tasks |
| Search        | Retrieval precision@k; context acceptance rate; search latency                                        |
| Q&A           | Grounded answer rate; citation validity; unsupported-claim rate; user acceptance                      |
| Impact        | Impact precision; test recommendation precision; engineer confirmation rate                           |
| Review        | High-severity precision; false-positive rate; evidence validity; finding resolution rate              |
| Planning      | Plan acceptance rate; file prediction precision; task completion rate                                 |
| Knowledge     | Wiki freshness; evidence coverage; stale-doc detection precision                                      |
| Governance    | Rule adoption; rule conflict rate; rule effectiveness; audit completeness                             |
| Agent         | MCP success rate; context acceptance by agents; repeated queries per task                             |
| Operations    | Indexing latency; queue depth; worker failure rate; GitHub API errors; LLM cost                       |

# 19. Roadmap and Release Phases

| Phase    | Name                              | Outcome                                                                                                        |
|----------|-----------------------------------|----------------------------------------------------------------------------------------------------------------|
| Phase 1  | Context Graph Foundation          | Formalize graph entities/edges, evidence provenance, revision scoping, retrieval orchestration and graph APIs. |
| Phase 2  | Architecture Workspace            | Interactive maps, focus, filters, source linking, architecture snapshots, change overlays.                     |
| Phase 3  | Impact Intelligence               | Symbol impact, test impact, risk overlays, change summaries, safe-change checklists.                           |
| Phase 4  | AI Evidence Platform              | Claims model, evidence validation, context compression, stronger Q&A, uncertainty UI.                          |
| Phase 5  | PR Change Intelligence            | Diff-to-architecture mapping, historical similarity, multi-agent review orchestration.                         |
| Phase 6  | RepoPilot Wiki                    | Generated and curated documentation, freshness detection, evidence links, tours.                               |
| Phase 7  | Engineering Planning              | Requirement-to-plan, requirement traceability, Context Pack generation.                                        |
| Phase 8  | MCP / Agent Platform              | External agent integration, context tools, agent session telemetry and controls.                               |
| Phase 9  | Governance                        | Rules, Review Memory, architecture drift, risk concentration and audit trails.                                 |
| Phase 10 | Advanced Engineering Intelligence | Cross-repo graph, production correlation, incidents, deployment impact, organization knowledge graph.          |

# 20. Revised MVP and Flagship Demo

## 20.1 MVP v2

1.  Connect GitHub repository

2.  Index a repository and preserve revision identity

3.  Build the Context Graph

4.  Interactive Architecture Workspace

5.  Hybrid search + grounded Q&A

6.  Symbol/module impact analysis

7.  PR Change Intelligence

8.  Evidence-backed multi-agent review

9.  Test impact recommendations

10. GitHub Check publishing

11. MCP context tools

12. Basic RepoPilot Wiki / architecture overview

13. Context Pack export for coding agents

## 20.2 Flagship demo: PaymentService

The existing PaymentService demo remains the canonical proof point. Expand it so one user story exercises the full product.

**Open symbol:** User opens PaymentService.processPayment().

**Understand:** RepoPilot shows overview, callers, callees, tests, risk and evidence.

**Explore:** Architecture Workspace highlights PaymentService and related paths.

**Why:** “Why does this exist?” surfaces introducing commit, PR and ADR evidence.

**Impact:** “What breaks if I change this?” shows direct/transitive impact and relevant tests.

**Plan:** User supplies a change request; RepoPilot generates an evidence-backed implementation plan.

**Review:** A PR is created; specialized review passes analyze correctness, security, architecture and tests.

**Validate:** Findings are evidence-validated and posted to GitHub as a Check.

**Learn:** Resolved findings and human feedback update review memory / rules.

# 21. Acceptance Criteria and Definition of Done

## 21.1 Product-level acceptance

- A user can enter an unfamiliar repository and obtain a useful architecture view without manually configuring a diagram.

- A user can select a symbol and inspect evidence-backed relationships, history, tests and risk.

- A user can ask an impact question and receive deterministic and inferential results distinctly.

- A PR can be summarized in architectural rather than file-count terms.

- A plan can be generated from a requirement and mapped to repository evidence.

- A review finding cannot become blocking without validated evidence.

- A coding agent can retrieve equivalent context through MCP.

- Historical repository views remain reproducible by revision.

- User feedback can improve future reviews through versioned rules.

## 21.2 Engineering definition of done

- Requirements implemented

- Architecture documented

- Data migrations included

- Unit/integration/evaluation tests exist

- Failure paths tested

- Observability implemented

- Authorization verified

- Performance impacts understood

- Security tests present

- AI output schemas validated

- Evidence validation tested

- Documentation updated

- CI passes

- Rollback/recovery path documented

# 22. Risks and Trade-offs

**Scope explosion:** A unified platform can become too broad. Mitigation: keep Context Graph + Architecture + Impact + Review as the coherent core, and phase adjacent capabilities.

**Visual complexity:** Graphs and dense engineering data can overwhelm users. Mitigation: focus modes, bounded traversal, context-aware panels, progressive disclosure.

**False confidence:** Risk scores and AI answers can appear more certain than the evidence allows. Mitigation: claims model, uncertainty, provenance, no unsupported blocking findings.

**Indexing cost:** Large repositories increase parsing, embedding and graph cost. Mitigation: incremental processing, caching, bounded context, changed-code prioritization.

**Agent dependency:** External agents may change their interfaces. Mitigation: stable MCP contract and provider-neutral context model.

**Governance becoming surveillance:** Health metrics can be misused for employee scoring. Mitigation: aggregate engineering signals, explicit policy, no individual performance scoring.

**Security surface:** RepoPilot will process private source and potentially sensitive incidents. Mitigation: strict isolation, least privilege, retention controls, tool authorization.

**Rule decay:** Repository rules can become outdated. Mitigation: versioning, feedback telemetry, conflict detection and freshness checks.

# 23. Open Decisions and Future Research

- Which graph representation gives the best balance between PostgreSQL relational storage and specialized graph traversal at MVP scale?

- Which languages should receive first-class symbol analysis beyond the initial TypeScript target?

- How should architecture nodes be normalized between repository structure, logical services and deployment services?

- What evidence ranking model gives the best precision for large repositories?

- How should retrieval quality be benchmarked across code Q&A, impact analysis and PR review?

- Which MCP tools create the highest value for coding agents before the full context graph is complete?

- How should human-confirmed architecture rules be promoted without encoding accidental conventions?

- What is the minimum production integration needed to make incident/change correlation useful without expanding the MVP too far?

# 24. Competitive Differentiation Matrix

| Capability                 | Market state                         | RepoPilot stance                       |
|----------------------------|--------------------------------------|----------------------------------------|
| Code understanding         | Strong                               | Primary                                |
| Dependency graph           | Strong                               | Primary                                |
| Interactive architecture   | Partial in market / often separate   | Primary                                |
| Evidence-grounded Q&A      | Common but uneven                    | Primary with revision-aware provenance |
| PR review                  | Crowded market                       | Primary only as part of broader system |
| Impact analysis            | Often shallow or specialized         | Primary                                |
| Historical intent          | Relatively differentiated            | Primary                                |
| Architecture time travel   | Rare                                 | Primary                                |
| Planning from requirements | Emerging                             | Primary                                |
| Repo-native living wiki    | Emerging                             | Primary                                |
| Review memory / rules      | Increasingly common                  | Primary with evidence/history          |
| MCP context infrastructure | Emerging and strategically important | Primary                                |
| Test impact                | Specialized tools exist              | Primary within change intelligence     |
| Production feedback loop   | Usually separate tooling             | Future differentiator                  |
| Neo-brutalist developer UX | Rare                                 | Brand differentiator                   |

# 25. Research References

External references were reviewed in August 2026. They are used as market signals and product inspiration; RepoPilot should not copy proprietary branding or implementation.

**RepoPilot PRD v1:** [<u>User-provided source document; primary basis for all v2 extensions.</u>](User-provided source document; primary basis for all v2 extensions.)

**Sourcegraph Cody Context:** [<u>https://sourcegraph.com/docs/cody/core-concepts/context</u>](https://sourcegraph.com/docs/cody/core-concepts/context)

**Sourcegraph Search Contexts:** [<u>https://sourcegraph.com/docs/code-search/working/search-contexts</u>](https://sourcegraph.com/docs/code-search/working/search-contexts)

**Augment Context Engine MCP:** [<u>https://www.augmentcode.com/blog/context-engine-mcp-now-live</u>](https://www.augmentcode.com/blog/context-engine-mcp-now-live)

**Qodo:** [<u>https://www.qodo.ai/</u>](https://www.qodo.ai/)

**Greptile:** [<u>https://www.greptile.com/</u>](https://www.greptile.com/)

**CodeSee Overview:** [<u>https://docs.codesee.io/docs/getting-started</u>](https://docs.codesee.io/docs/getting-started)

**CodeSee Review Maps:** [<u>https://docs.codesee.io/docs/user-guide</u>](https://docs.codesee.io/docs/user-guide)

**CodeSee Review Map Tours:** [<u>https://docs.codesee.io/docs/review-map-tours</u>](https://docs.codesee.io/docs/review-map-tours)

**GitHub Copilot Code Review:** [<u>https://docs.github.com/en/copilot/concepts/agents/code-review</u>](https://docs.github.com/en/copilot/concepts/agents/code-review)

**Graphite Code Review:** [<u>https://graphite.com/docs/code-review</u>](https://graphite.com/docs/code-review)

**Graphite product overview:** [<u>https://www.graphite.com/</u>](https://www.graphite.com/)

**GitDiagram README:** [<u>https://github.com/ahmedkhaleel2004/gitdiagram/blob/main/README.md</u>](https://github.com/ahmedkhaleel2004/gitdiagram/blob/main/README.md)

**GitDiagram source repository:** [<u>https://github.com/ahmedkhaleel2004/gitdiagram</u>](https://github.com/ahmedkhaleel2004/gitdiagram)

# Appendix A. Suggested initial navigation

- Overview — repository health, recent activity, indexing status, quick actions

- Architecture — current system map, focus mode, snapshots, tours

- Search — lexical, semantic and graph-aware search

- Ask — evidence-backed repository conversation

- Changes — commits, branches, PRs and architectural impact

- Pull Requests — review inbox, change intelligence, findings

- History — revisions, architecture time machine, historical similarity

- Risks — hotspots, dependency risk, security paths, drift

- Tests — test impact, coverage relationships and validation status

- Docs — RepoPilot Wiki, ADRs, freshness and knowledge gaps

- Settings — integrations, permissions, rules, retention and model configuration

# Appendix B. Product language

| Term                  | Definition                                                                                                     |
|-----------------------|----------------------------------------------------------------------------------------------------------------|
| Repository            | The software system RepoPilot understands.                                                                     |
| Context Graph         | The evidence-connected model of the repository and its engineering context.                                    |
| Evidence              | A repository, history or integration fact that supports a claim.                                               |
| Impact                | The set of components, tests or systems potentially affected by a change.                                      |
| Context Pack          | A scoped, machine-readable bundle of evidence for a human or coding agent.                                     |
| Rule                  | A versioned engineering convention used by analysis or review.                                                 |
| Finding               | A validated observation about correctness, security, reliability, architecture or other configured categories. |
| Tour                  | A step-by-step visual path through a system or change.                                                         |
| Architecture Snapshot | An immutable representation of a system topology at a revision.                                                |

# Appendix C. Product North Star Checklist

□ Can RepoPilot explain what this software system is?

□ Can it explain why important parts exist?

□ Can it show what a change will affect?

□ Can it show what happened historically?

□ Can it tell which tests and docs matter?

□ Can it turn a requirement into a grounded implementation plan?

□ Can it review the resulting change with high signal?

□ Can an engineer see the evidence behind every important claim?

□ Can a coding agent consume the same context?

□ Does the system learn from validated engineering feedback without becoming surveillance?

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Final product definition<br />
</strong>RepoPilot should make software systems legible, changes predictable, reviews evidence-backed, and engineering knowledge cumulative.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>
