# Provider Presets And Cost Routing Spec

## Summary

Repo2Prompts should stay provider-neutral while documenting practical presets for fast/cheap model access:

- 9router remains the verified self-host/default example for the local build.
- Groq is added as a fast/free-tier-friendly preset.
- OpenRouter is added as a multi-model gateway preset.
- Gemini is added as a cheap analysis-model option, with OpenAI-compatible routing only when the chosen gateway supports it.

The app must not lock itself to one vendor. Core runtime continues to use:

```env
MODEL_BASE_URL=
MODEL_API_KEY=
MODEL_CHAT_ID=
MODEL_ANALYSIS_ID=
MODEL_WRITER_ID=
```

## Goals

- Make provider setup understandable for public users.
- Let users route cheap models to analysis tasks and stronger models to final writing.
- Avoid misleading claims that any provider is always free, always fast, or always stable.
- Keep secrets server-side.
- Avoid adding provider SDKs or new dependencies.

## Non-Goals

- No new provider-specific SDK.
- No runtime provider marketplace UI in this phase.
- No automatic live model list fetching.
- No embedding/Jina integration in this phase.
- No Jira integration.
- No client-side model API keys.

## Provider Presets

### 9router

Purpose:

- Best for Boss/local runtime because it is already verified through an OpenAI-compatible `/v1/chat/completions` endpoint.
- Can route multiple models behind one local/VM gateway.

Example:

```env
MODEL_BASE_URL=http://100.84.47.80:20128/v1
MODEL_API_KEY=replace-with-9router-key
MODEL_CHAT_ID=cx/gpt-5.5
MODEL_ANALYSIS_ID=cx/gpt-5.5
MODEL_WRITER_ID=cx/gpt-5.5
```

### Groq

Purpose:

- Fast and commonly used for free-tier-friendly generation.
- Best fit for `MODEL_ANALYSIS_ID` or fast mode.
- May be weaker for final deep implementation briefs than stronger paid models.

Example:

```env
MODEL_BASE_URL=https://api.groq.com/openai/v1
MODEL_API_KEY=replace-with-groq-key
MODEL_CHAT_ID=llama-3.1-8b-instant
MODEL_ANALYSIS_ID=llama-3.1-8b-instant
MODEL_WRITER_ID=llama-3.3-70b-versatile
```

Model IDs are examples and may change. Users must verify available models in their Groq account.

### OpenRouter

Purpose:

- One API key for many providers/models.
- Useful for public users who want provider flexibility.
- Free routes can be convenient for testing but may hit rate limits or quality limits.

Example:

```env
MODEL_BASE_URL=https://openrouter.ai/api/v1
MODEL_API_KEY=replace-with-openrouter-key
MODEL_CHAT_ID=openrouter/free
MODEL_ANALYSIS_ID=openrouter/free
MODEL_WRITER_ID=replace-with-quality-model-id
```

Public docs should warn that `openrouter/free` and `:free` model IDs are not guaranteed to be stable enough for production-quality deep briefs.

### Gemini

Purpose:

- Cheap/fast analysis model option.
- Best fit for repository maps, module summaries, and fast analysis.
- Repo2Prompts currently speaks OpenAI-compatible chat completions, so Gemini should be configured through an OpenAI-compatible gateway unless native Gemini support is explicitly added later.

Example through an OpenAI-compatible gateway:

```env
MODEL_BASE_URL=https://your-gemini-compatible-gateway/v1
MODEL_API_KEY=replace-with-gateway-key
MODEL_CHAT_ID=gemini-compatible-model-id
MODEL_ANALYSIS_ID=gemini-compatible-fast-model-id
MODEL_WRITER_ID=replace-with-quality-writer-model-id
```

Native Gemini API support is deferred because it would add a second request/response contract.

## Routing Policy

Recommended defaults:

- `fast`: use `MODEL_CHAT_ID`.
- `balanced`: use `MODEL_ANALYSIS_ID` for repository map and `MODEL_WRITER_ID` for final brief.
- `focused`: same as balanced, but analysis is question-scoped.
- `deep`: use `MODEL_ANALYSIS_ID` for module maps and `MODEL_WRITER_ID` for final brief/repair.

Fallback:

- If `MODEL_ANALYSIS_ID` is empty, use `MODEL_CHAT_ID`.
- If `MODEL_WRITER_ID` is empty, use `MODEL_CHAT_ID`.

Current code already implements this fallback.

## Status Endpoint Behavior

`/api/status` should remain safe:

- Show `chat: configured | disabled`.
- Show `github: configured | anonymous`.
- Show `database: configured | disabled`.
- Do not expose API keys.
- Optionally expose model IDs only if product decides they are not sensitive.

For this phase, avoid exposing model IDs in `/api/status`.

## Documentation Requirements

README and deployment docs should include:

- The provider-neutral env block.
- Preset examples for 9router, Groq, OpenRouter, and Gemini-through-gateway.
- A note that free model availability and rate limits change.
- A note that `MODEL_API_KEY` is server-only.
- A note that OpenRouter/Groq model IDs must be checked in the provider dashboard.
- A recommendation:
  - Cheap/fast model for `MODEL_ANALYSIS_ID`.
  - Stronger model for `MODEL_WRITER_ID`.

## Test Requirements

No new runtime code is required for the initial spec because task-aware routing already exists.

Verification for this phase:

- `pnpm test`
- `pnpm lint`
- `pnpm build`
- Manual env review confirms no provider secret is in tracked files.

If future code adds provider presets in UI or status:

- Unit-test provider preset serialization.
- Ensure no secret reaches client components.
- Ensure unknown provider names do not change API behavior.
