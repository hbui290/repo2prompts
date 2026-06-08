# Repo Brief Generator Product Requirements

## Product goal

Turn a public source repository into a practical implementation brief that a
coding agent can use to reproduce the product's observable behavior and major
technical decisions.

## Intended user

A developer who wants a concise orientation to an unfamiliar public repository
or a structured starting brief for building a comparable product.

## Primary flow

1. The user enters either `owner/repository` or a full public GitHub URL.
2. The user selects an analysis depth:
   - Fast: repository metadata, documentation, and manifest-oriented analysis.
   - Thorough: selected source files and architecture-oriented analysis.
   - Focused: analysis constrained by a user-provided question.
3. The system validates the identifier and collects allowed public repository
   information.
4. The system sends a bounded, structured context to an OpenAI-compatible
   language model.
5. The system returns a readable implementation brief.
6. Successful briefs may be cached and listed in a searchable internal library.

## Brief requirements

A generated brief should contain:

- Product purpose and target user.
- User-visible capabilities.
- Major modules and responsibilities.
- Important data and control flows.
- External services and integration boundaries.
- Suggested implementation sequence.
- Verification and test strategy.
- Explicit unknowns where repository evidence is insufficient.

The brief must distinguish observed evidence from model inference.

## Operational requirements

- Run as a self-hosted web application.
- Support configurable OpenAI-compatible chat and embedding endpoints.
- Support GitHub API access with an optional token.
- Treat the database as optional for generation and required only for durable
  cache/library features.
- Avoid authentication and payment requirements in the personal deployment.
- Never expose provider, GitHub, or database secrets to the browser.

## Non-goals

- Reconstruct private source code.
- Claim exact behavioral equivalence without evidence.
- Copy repository licenses, branding, or proprietary assets into generated
  output.
- Provide payment, subscription, social login, or public multi-tenant features.

