# Session Handoff — byb-platform

This file is the shared temporary checkpoint between Codex and Claude Code
sessions. It is not project history and must be verified against repository
reality before use.

## Source of truth hierarchy

1. Repository source code and configuration
2. Git state and history
3. Automated tests and CI results
4. ADRs and engineering documentation
5. SESSION_HANDOFF.md
6. Previous conversation context

If this file conflicts with the repository, repository reality wins.

## Session metadata

- Bootstrap date: 2026-09-12
- Repository: byb-platform
- Branch at discovery: main
- HEAD at discovery: 14c9aeb11d3b7c1f50b0db312df298d8912a4229
- Session type: cross-repository governance bootstrap

## Current objective and scope

Extend the repository-wide "État actuel" continuity protocol to this existing
repository and make it available to future repositories through the inherited
and global Codex/Claude Code instructions. No application behavior is in scope.

## Completed work

- Repository inventory and Git state were inspected read-only.
- Shared governance instructions were installed at ~/projects/AGENTS.md and
  ~/projects/CLAUDE.md.
- Global Codex and Claude Code preferences were updated to define the
  "État actuel" report and session handoff lifecycle.
- This repository-level checkpoint was created.

## Git state at bootstrap

- Branch: main
- HEAD: 14c9aeb11d3b7c1f50b0db312df298d8912a4229
- Working tree before this handoff: No pre-existing working-tree changes were observed during discovery.
- Do not infer cleanliness from this file; re-run git status --short --branch.

## Important files and decisions

- Repository-local AGENTS.md, CLAUDE.md, AGENT_PREFERENCES.md, README,
  contributing documentation, ADRs, CI configuration, and task/build files
  remain authoritative where present.
- Shared instructions are additive and must not override stricter local rules.
- The handoff is temporary operational state; permanent rules belong in
  repository instructions or engineering documentation.

## Validation

### GATE-00 — Discovery

PASS — this repository was identified as a Git repository and its branch, HEAD,
and initial working-tree state were inspected.

### GATE-01 — Governance inheritance

PASS — the shared parent and global instructions define the "État actuel"
protocol, source-of-truth hierarchy, and handoff lifecycle.

### GATE-02 — Repository-specific validation

BLOCKED — application checks were not run because this bootstrap change is
governance-only and no repository-specific implementation task was requested.

## Known issues and blockers

- The exact current state must be re-verified after this file is added.
- Existing user-owned changes, if any, must remain untouched and must not be
  included accidentally in a future commit.
- No application defect has been investigated by this bootstrap.

## Remaining work — prioritized map

- P0 — None identified for governance bootstrap.
- P1 — On the next session, answer "État actuel" by verifying this handoff,
  Git state, local instructions, and the repository's applicable validation
  commands.
- P2 — Add or update repository-specific engineering documentation only when
  an actual project task requires it.

## Exact next recommended action

At the next session, ask "État actuel"; verify this checkpoint against Git and
then choose the next implementation task from the reported P0/P1/P2 map.

## Invariants

- Application source and runtime behavior were not modified by this bootstrap.
- Existing local instructions and user-owned working-tree changes are preserved.
- No secrets, credentials, or environment files belong in this handoff.
- Never claim a validation PASS without command or repository evidence.
- Never force-push, rewrite history, or perform destructive operations without
  explicit authorization.

## Recovery protocol

Read the applicable local instructions and this handoff, inspect Git state, and
verify every material claim. If a claim is stale or inconsistent, mark it
BLOCKED, document the discrepancy, reconstruct facts from the repository, and
update this file before resuming implementation.

## Session completion criteria

The session is complete when the repository state is verified, relevant checks
are recorded as PASS, FAIL, or BLOCKED, remaining work and one next action are
documented, and git status --short is re-checked.

## Final handoff statement

Cross-repository "État actuel" governance is installed for this repository via
global and ~/projects-inherited instructions. Future sessions must verify this
checkpoint against repository reality before continuing.
