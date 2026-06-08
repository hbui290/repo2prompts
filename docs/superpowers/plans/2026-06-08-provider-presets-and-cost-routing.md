# Provider Presets And Cost Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Document and ship practical model-provider presets for 9router, Groq, OpenRouter, and Gemini-compatible gateways without changing the provider-neutral runtime.

**Architecture:** Keep the existing OpenAI-compatible model client and task-aware model routing. Add provider guidance in docs and env comments only, because runtime already supports `MODEL_BASE_URL`, `MODEL_API_KEY`, `MODEL_CHAT_ID`, `MODEL_ANALYSIS_ID`, and `MODEL_WRITER_ID`.

**Tech Stack:** Next.js, TypeScript, OpenAI-compatible chat completions, Markdown docs, environment variables.

---

## File Structure

- Modify: `README.md`
  - Add provider presets and routing recommendations.
- Modify: `.env.example`
  - Add concise comments describing supported provider examples.
- Modify: `docs/DEPLOYMENT.md`
  - Add production provider notes and warnings about free model stability.
- Verify: `src/integrations/model-client.ts`
  - Confirm existing fallback behavior is sufficient.
- Verify: `src/app/api/status/route.ts`
  - Confirm no model API secrets are exposed.

## Task 1: Document Provider Presets In README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add provider preset section after the required env block**

Add provider-neutral examples for 9router, Groq, OpenRouter, and Gemini-compatible gateways.

- [ ] **Step 2: Verify README formatting**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
text = Path("README.md").read_text()
for word in ["## Provider presets", "9router", "Groq", "OpenRouter", "Gemini-compatible gateway"]:
    assert word in text, word
PY
```

Expected: command exits `0`.

- [ ] **Step 3: Commit README docs**

```bash
git add README.md
git commit -m "docs: add model provider presets"
```

## Task 2: Add Env Example Comments

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Expand model env comments**

Document example `MODEL_BASE_URL` values for 9router, Groq, OpenRouter, and Gemini-compatible gateways.

- [ ] **Step 2: Verify no secrets were added**

Run:

```bash
rg -n "sk-|sb_secret|sbp_|AIza|ghp_|github_pat_" .env.example README.md docs/DEPLOYMENT.md
```

Expected: no output.

- [ ] **Step 3: Commit env docs**

```bash
git add .env.example
git commit -m "docs: clarify provider env examples"
```

## Task 3: Add Deployment Provider Notes

**Files:**
- Modify: `docs/DEPLOYMENT.md`

- [ ] **Step 1: Add production model-provider notes**

Document provider choices, server-only secret handling, and recommended model split:

```env
MODEL_ANALYSIS_ID=cheap-or-fast-model
MODEL_WRITER_ID=quality-writer-model
```

- [ ] **Step 2: Verify deployment doc mentions all providers**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
text = Path("docs/DEPLOYMENT.md").read_text()
for word in ["9router", "Groq", "OpenRouter", "Gemini", "MODEL_ANALYSIS_ID", "MODEL_WRITER_ID"]:
    assert word in text, word
PY
```

Expected: command exits `0`.

- [ ] **Step 3: Commit deployment docs**

```bash
git add docs/DEPLOYMENT.md
git commit -m "docs: document production model routing"
```

## Task 4: Final Verification

**Files:**
- Verify only.

- [ ] **Step 1: Run test suite**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: lint passes.

- [ ] **Step 3: Run production build**

```bash
pnpm build
```

Expected: build succeeds.

- [ ] **Step 4: Check git diff whitespace**

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 5: Commit plan/spec if not already committed**

```bash
git add docs/superpowers/specs/2026-06-08-provider-presets-and-cost-routing.md docs/superpowers/plans/2026-06-08-provider-presets-and-cost-routing.md
git commit -m "docs: add provider preset implementation plan"
```

## Self-Review

- Spec coverage: 9router, Groq, OpenRouter, Gemini-compatible gateways, task model routing, secret safety, and no native Gemini/Jina/Jira scope are covered.
- Placeholder scan: no incomplete implementation placeholders remain.
- Type consistency: env names match existing `.env.example` and `src/integrations/model-client.ts`.
