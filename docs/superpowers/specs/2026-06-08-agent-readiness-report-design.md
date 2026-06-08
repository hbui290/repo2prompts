# Agent Readiness Report MVP

## Summary

Repo2Prompts should evolve from a repository-to-brief tool into an AI agent
readiness report for GitHub repositories.

The product should answer one clear question:

```text
Is this repository ready to be used by AI coding agents?
```

The next phase adds:

- Agent Readiness Score.
- Score breakdown.
- Confidence level.
- Improvement checklist.
- Best next agent prompt.
- Verification commands.
- Basic rule-based safety warnings.
- Shareable report enhancements.
- README badge SVG endpoint.

This phase does not add extra model calls for scoring. The readiness report must
be deterministic, fast, cheap, and derived from evidence the app already
collects.

## Product Positioning

Primary positioning:

```text
AI readiness reports for GitHub repositories.
```

Supporting copy:

```text
Paste a repo. Get a scored, evidence-backed report your coding agent can
actually use.
```

Repo2Prompts should not compete only as a repository text packer. Gitingest and
Repomix are strong at turning repositories into text/context. Repo2Prompts
should differentiate by turning repositories into scored, explainable,
shareable intelligence reports.

## User Flows

### Generate Report

```text
User pastes GitHub repo
-> selects mode/depth
-> app collects repository evidence
-> app writes the evidence-backed brief through the existing model pipeline
-> app computes Agent Readiness from the evidence
-> app saves report if database is configured
-> user receives brief, score, checklist, prompt, commands, warnings, and share link
```

### View Public Report

```text
User opens /library/[id]
-> sees a Repo Intelligence Report
-> reads readiness score, evidence-backed brief, safety warnings, and metadata
-> copies prompt/export/badge/share link
```

### Render Badge

```text
README badge requests /api/badge/owner/repo
-> endpoint reads latest stored report for that repository
-> endpoint uses stored readiness or computes fallback from stored evidence
-> endpoint returns SVG
```

Badge rendering must not call GitHub, the model provider, or any expensive
scanner.

## Report Content Order

Report pages should show content in this order:

1. Repository header.
2. Agent Readiness Score.
3. Confidence level.
4. Safety risk.
5. Score breakdown.
6. Strengths / why this score.
7. Improvement checklist.
8. Best next agent prompt.
9. Verification commands.
10. Evidence-backed brief.
11. Evidence files.
12. Analysis metadata.
13. Export and share actions.

Legacy reports that do not contain readiness data must still render. When
possible, compute readiness from existing `evidence_json` at render time.

## Agent Readiness Score

### Score Bands

```ts
type ReadinessBand =
  | "excellent"
  | "strong"
  | "usable"
  | "needs_work"
  | "hard_for_agents";
```

Score mapping:

| Score | Label |
| ---: | --- |
| 90-100 | Excellent |
| 75-89 | Strong |
| 60-74 | Usable |
| 40-59 | Needs Work |
| 0-39 | Hard for Agents |

Display example:

```text
Agent Readiness: 82/100 - Strong
```

### Breakdown

The score is out of 100:

| Category | Max |
| --- | ---: |
| Documentation clarity | 20 |
| Setup clarity | 15 |
| Architecture clarity | 20 |
| Test visibility | 15 |
| Agent taskability | 20 |
| Risk / complexity | 10 |

### Documentation Clarity

Signals:

- `README.md` or equivalent documentation.
- `docs/`, `CONTRIBUTING.md`, or architecture docs.
- Brief quality passed.
- Brief has valid citations.

Rules:

```text
README selected/read: +10
docs/architecture/contributing detected: +5
quality passed: +5
```

### Setup Clarity

Signals:

- Manifest files such as `package.json`, `pyproject.toml`, `Cargo.toml`,
  `go.mod`.
- `.env.example`.
- Setup/install docs.
- Verification command found.

Rules:

```text
manifest found: +6
.env.example found: +5
setup/install docs found: +2
verification command found: +2
```

### Architecture Clarity

Signals:

- Entrypoints.
- Source paths such as `src`, `app`, `lib`, `routes`, `pages`, `server`.
- Evidence covers multiple roles.
- No citation quality warning.

Rules:

```text
entrypoint selected: +7
source/lib/api/component files selected: +7
selected evidence covers 3+ roles: +4
no citation warning: +2
```

### Test Visibility

Signals:

- `test` or `spec` files.
- Test script in manifest.
- CI workflow.

Rules:

```text
test/spec files detected: +7
test command found: +5
CI workflow found: +3
```

### Agent Taskability

Signals:

- `AGENTS.md`.
- Verification command.
- Largest files are not excessive.
- Quality passed.
- Enough selected evidence.

Rules:

```text
AGENTS.md found: +6
verification commands found: +5
largest files not excessive: +4
quality passed: +3
selected evidence sufficient: +2
```

### Risk / Complexity

Signals:

- `too_large` skipped files.
- `suspicious_secret` skipped files.
- Dangerous command patterns.
- Package lifecycle scripts such as `postinstall`.
- Secret access patterns.

Rules:

```text
no high-risk warning: +6
few too_large/generated skips relative to selected: +2
no suspicious_secret skip: +2
```

If a critical safety warning exists, cap total score at `59`.

## Confidence Level

```ts
type Confidence = "high" | "medium" | "low";
```

High confidence:

- `filesRead >= 7`.
- README or manifest found.
- Quality passed.
- `selectedFiles >= 5`.

Medium confidence:

- `filesRead >= 3`.
- `selectedFiles >= 3`.
- No severe read failure pattern.

Low confidence:

- Little evidence.
- Many `read_failed` entries.
- No README or manifest.
- Quality warnings exist.

Display example:

```text
Analysis Confidence: High
```

Confidence prevents the product from overstating weak reports.

## Improvement Checklist

The checklist is deterministic and based on missing or weak signals.

Possible items:

- Add `AGENTS.md` with coding-agent instructions.
- Add `.env.example` and document required variables.
- Add or expose a smoke test command.
- Document setup steps in README.
- Add `CONTRIBUTING.md` for repo workflow.
- Split very large files before asking agents to refactor them.
- Review install scripts before running commands.

Rules:

```text
No AGENTS.md -> recommend AGENTS.md
No env example but env usage detected -> recommend env docs
No tests -> recommend smoke test
No verification command -> recommend verification command
Too-large files -> recommend targeted refactor/split
Safety warning -> recommend reviewing risky files/install steps
```

## Best Next Agent Prompt

Each report should include one immediately copyable prompt.

Template:

```text
Inspect {repo} and improve its AI-agent readiness.

Focus on:
- {top_missing_item_1}
- {top_missing_item_2}

Use evidence from:
- {selected_file_1}
- {selected_file_2}
- {selected_file_3}

Do not refactor unrelated files.
Run these checks if available:
- {verification_command}
```

Example when tests are missing:

```text
Add a minimal smoke test for the main API/runtime path. Use README.md,
package.json, and src/app/api as evidence. Do not refactor unrelated files.
Run pnpm test and pnpm lint if available.
```

Example when environment docs are missing:

```text
Create or improve .env.example and setup documentation. Use package.json and
README.md as evidence. Do not expose secrets. Run the available build check
afterward.
```

## Verification Commands

Verification commands should be detected from selected evidence content and
paths.

### Node / JavaScript

From `package.json` and lockfiles:

- `pnpm test`
- `pnpm lint`
- `pnpm build`
- `npm test`
- `npm run lint`
- `npm run build`
- `yarn test`

Package manager preference:

```text
pnpm-lock.yaml -> pnpm
yarn.lock -> yarn
package-lock.json -> npm
default -> npm
```

### Other Ecosystems

- `Cargo.toml` -> `cargo test`
- `go.mod` -> `go test ./...`
- `pyproject.toml` or pytest config -> `pytest`
- `requirements.txt` with pytest mention -> `pytest`

If no clear command exists:

```text
No clear verification command found.
```

## Basic Safety Scan

The MVP uses internal rule-based checks only. It does not run OSV, Semgrep,
CodeQL, or VirusTotal.

```ts
type SafetyLevel = "low" | "medium" | "high" | "critical";
```

Patterns to detect:

### Dangerous Install Commands

- `curl ... | bash`
- `wget ... | sh`
- `bash <(curl ...)`
- `powershell -enc`
- `Invoke-WebRequest ... | iex`

### Package Lifecycle Scripts

- `preinstall`
- `postinstall`
- `prepare`

### Secret Access

- `.env`
- `~/.ssh`
- `id_rsa`
- `process.env` combined with external `fetch` or HTTP calls.
- `cat ~/.npmrc`

### Prompt Injection

- `ignore previous instructions`
- `system prompt`
- `developer message`
- `exfiltrate`
- `disable safety`
- `bypass policy`

### Destructive Commands

- `rm -rf`
- `chmod +x && ./...`
- `sudo`

Output example:

```text
Agent Safety: Medium Risk

Warnings:
- package.json includes postinstall script.
- README contains remote shell install command.
- Selected evidence skipped a suspicious secret-like file.
```

Required disclaimer:

```text
This report is based on selected repository evidence and configured checks. It
is not a guarantee that the repository is secure or production-ready.
```

Forbidden claims:

- `This repo is safe.`
- `Verified safe.`
- `Virus free.`

## Data Types

```ts
type AgentReadinessReport = {
  score: number;
  band: ReadinessBand;
  label: string;
  confidence: Confidence;
  breakdown: ReadinessBreakdownItem[];
  strengths: string[];
  improvements: string[];
  bestNextPrompt: string;
  verificationCommands: string[];
  safety: AgentSafetyReport;
};

type ReadinessBreakdownItem = {
  key:
    | "documentation"
    | "setup"
    | "architecture"
    | "tests"
    | "taskability"
    | "risk";
  label: string;
  score: number;
  max: number;
  reasons: string[];
};

type AgentSafetyReport = {
  level: SafetyLevel;
  warnings: string[];
  disclaimer: string;
};
```

Extend stored evidence:

```ts
type StoredEvidence = {
  // existing fields
  readiness?: AgentReadinessReport;
};
```

No database migration is required for this MVP because `evidence_json` already
stores structured metadata.

## Architecture

Add pure domain module:

```text
src/domain/agent-readiness.ts
src/domain/agent-readiness.test.ts
```

Responsibilities:

- `computeAgentReadiness(input): AgentReadinessReport`
- `detectVerificationCommands(input): string[]`
- `detectSafetyWarnings(input): AgentSafetyReport`
- `buildBestNextPrompt(input): string`

The module must not depend on React, Next.js, fetch, environment variables, or
database clients.

Input shape:

```ts
type AgentReadinessInput = {
  repository?: string;
  mode?: string;
  depth?: string;
  evidence: StoredEvidence;
  brief?: string;
};
```

## Pipeline Integration

In `src/integrations/analysis-pipeline.ts`, readiness is computed after
`responseEvidence()`.

Target flow:

```text
collect evidence
-> build responseEvidence()
-> computeAgentReadiness()
-> attach evidence.readiness
-> save brief
-> return result
```

For cached reports:

```text
if stored.evidence_json.readiness exists:
  return stored readiness
else:
  compute readiness fallback from stored evidence before response
```

## UI Integration

### Workbench Result

After a generation succeeds, show compact readiness summary:

```text
Agent Readiness
82/100 Strong
Confidence: High
Safety: Low Risk
```

Actions:

- Copy best prompt.
- Open report.
- Copy badge snippet when report URL exists.

### Report Page

Add:

```text
src/components/readiness-panel.tsx
```

Sections:

- Score hero.
- Breakdown bars.
- Strengths.
- Improvement checklist.
- Best next agent prompt.
- Verification commands.
- Safety warnings.
- Disclaimer.

### Library Cards

Library rows should show small badges when readiness is available:

```text
AI Ready 82
Safety Low
```

Fallback:

```text
AI Ready unknown
```

## Badge API

Route:

```text
src/app/api/badge/[...repository]/route.ts
```

Examples:

```text
/api/badge/vercel/next.js
/api/badge/facebook/react
```

Behavior:

1. Parse owner/repo from catch-all params.
2. Read latest stored brief for repository.
3. If found, use `evidence.readiness` or compute fallback.
4. Return SVG.
5. If not found, return SVG with `AI Ready unknown`.
6. Never call the model.
7. Never call GitHub.

SVG text:

```text
Repo2Prompts | AI Ready 82 Strong
```

Headers:

```text
Content-Type: image/svg+xml
Cache-Control: public, max-age=300
```

Needed store helper:

```ts
readLatestStoredBriefByRepository(repositoryKey: string)
```

## Export Integration

Update `brief-export.ts` so Codex, Cursor, Claude, and Markdown exports include:

- Agent Readiness Score.
- Improvement checklist.
- Best next agent prompt.
- Verification commands.
- Safety warnings.

Exports must not include:

- Full source contents.
- Internal prompts.
- API keys.
- Service keys.

## README Update

Add a section:

```text
## Agent Readiness Score
```

Document:

- What the score measures.
- How the score is computed from evidence.
- How the badge works.
- Safety disclaimer.

Badge snippet:

```md
[![AI Ready](https://repo2prompts.com/api/badge/owner/repo)](https://repo2prompts.com/library/report-id)
```

## Test Plan

### Unit Tests

Add `src/domain/agent-readiness.test.ts`:

- Well-documented repo gets strong/excellent score.
- Missing README/tests/setup gets lower score.
- Quality warnings reduce confidence.
- Suspicious skipped files create safety warning.
- `postinstall` and `curl | bash` content create safety warnings.
- `package.json` scripts produce pnpm/npm commands.
- Best next prompt includes selected evidence.
- Best next prompt says not to refactor unrelated files.
- Critical safety caps score.

### Pipeline Tests

Update `src/integrations/analysis-pipeline.test.ts`:

- `response.evidence.readiness` exists for generated reports.
- Cached old evidence can compute readiness fallback.

### API Tests

Badge route should be checked for:

- Unknown repo returns SVG with unknown score.
- Known repo returns SVG with score.
- Badge route does not call model or GitHub.

### Verification Commands

Run:

```bash
pnpm test
pnpm lint
pnpm build
git diff --check
```

## Acceptance Criteria

The feature is complete when:

1. New generated reports include Agent Readiness Score.
2. Report page shows score, breakdown, checklist, best prompt, verification
   commands, and safety warnings.
3. Workbench result shows compact readiness summary.
4. Library rows show score and safety.
5. Badge route returns SVG.
6. Badge route never calls model or GitHub.
7. Legacy reports still render.
8. Exports include readiness context.
9. README explains score and badge.
10. `pnpm test`, `pnpm lint`, `pnpm build`, and `git diff --check` pass.

## Out Of Scope

This phase does not include:

- OSV dependency scan.
- Semgrep.
- CodeQL.
- VirusTotal.
- Alternative repo discovery.
- Blue ocean report.
- Owner claim.
- Rescan history.
- Team workspace.
- Paid features.
- Ads.

These are valid later phases, but adding them now would make the MVP too large
and delay public validation.

## Implementation Order

1. Add `agent-readiness` tests.
2. Implement pure `agent-readiness` domain module.
3. Attach readiness to pipeline evidence.
4. Add readiness panel to report page.
5. Add compact readiness card to workbench result.
6. Add readiness badges to library.
7. Add badge API.
8. Update export templates.
9. Update README.
10. Run full verification.
