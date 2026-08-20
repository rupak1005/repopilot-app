# Product Implementation Status

**Master prompt:** RepoPilot World-Class Product + UI/UX Implementation  
**Started:** 2026-08-20

## Phase status

| Phase | Name | Status |
|------:|------|--------|
| 0–3 | Audits, design system, shell, context graph | **Done** |
| 4 | Real dependency graph | **In progress** (clustering / neighborhood / path / deep links) |
| 5 | Impact analysis | **In progress** — file + PR modes, risk factors, blast map |
| 6 | Codebase topography | **Started** — 2D directory landscape on Topography page |
| 7–35 | Remaining | Not started / partial |

## Phase 5 (continued)

- [x] File impact risk factors + confidence
- [x] Blast radius map
- [x] PR impact mode (`GET …/impact?pullNumber=`) aggregating changed files
- [x] Impact page File / PR tabs; PR detail uses live pull impact
- [ ] Symbol impact mode
- [ ] Canvas ArchitectureGraph blast overlay

## Phase 6 (started)

- [x] Rename Hotspots → Topography in nav (Phase 2)
- [x] Raise hotspot fetch to `topK=40` on topography page
- [x] 2D topography map: directory clusters sized/colored by hotspot score
- [ ] Time slider / metric toggles / complexity metrics
- [ ] Optional 3D mode (explicitly deferred)

## Next action

Continue Phase 6 (metrics/time) or Phase 5 symbol impact — **ask before committing**.
