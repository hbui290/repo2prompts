# Repo Brief Generator Data Model

The clean implementation must use fresh names and migrations.

## `repository_briefs`

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `repository_key` | text | Normalized lowercase `owner/repository` |
| `analysis_depth` | text | `fast`, `thorough`, or `focused` |
| `question_hash` | text | Stable hash for focused analysis, empty otherwise |
| `title` | text | Human-readable generated title |
| `brief_markdown` | text | Generated implementation brief |
| `evidence_json` | jsonb | Counts and non-secret evidence metadata |
| `embedding` | vector(512) nullable | Search vector |
| `view_count` | bigint | Aggregate views |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last refresh timestamp |

Unique key:

```text
(repository_key, analysis_depth, question_hash)
```

## `brief_view_receipts`

Stores privacy-preserving deduplication receipts for view counting.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `brief_id` | uuid | Referenced brief |
| `visitor_digest` | text | Salted one-way visitor digest |
| `viewed_on` | date | Deduplication day |

Unique key:

```text
(brief_id, visitor_digest, viewed_on)
```

## Database behavior

- Service-role writes are server-only.
- Anonymous reads may be enabled only for the public brief library.
- Search first attempts vector similarity and falls back to text search.
- Generation remains functional when the database is unavailable.

