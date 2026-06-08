# Repo Brief Generator API Contracts

## `POST /api/briefs`

Creates or retrieves a repository implementation brief.

Request:

```json
{
  "repository": "owner/repository",
  "depth": "fast",
  "question": null
}
```

Rules:

- `repository` accepts `owner/repository` or a public GitHub repository URL.
- `depth` is one of `fast`, `thorough`, or `focused`.
- `question` is required only for `focused`.

Success:

```json
{
  "brief": "Markdown content",
  "source": "generated",
  "evidence": {
    "filesRead": 12,
    "treeEntries": 420
  }
}
```

Cached success uses `"source": "cache"`.

Errors:

```json
{
  "error": {
    "code": "INVALID_REPOSITORY",
    "message": "Enter a public GitHub repository as owner/repository or URL."
  }
}
```

Expected codes:

- `INVALID_REPOSITORY`
- `QUESTION_REQUIRED`
- `REPOSITORY_NOT_FOUND`
- `GITHUB_UNAVAILABLE`
- `MODEL_UNAVAILABLE`
- `INTERNAL_ERROR`

## `GET /api/briefs`

Lists cached briefs.

Query:

- `q`: optional search text.
- `limit`: integer from 1 to 50.
- `cursor`: opaque pagination cursor.

Success:

```json
{
  "items": [
    {
      "id": "uuid",
      "repository": "owner/repository",
      "title": "Readable title",
      "summary": "Short summary",
      "createdAt": "2026-06-07T00:00:00.000Z",
      "views": 0
    }
  ],
  "nextCursor": null,
  "searchMode": "semantic"
}
```

`searchMode` may be `semantic`, `text`, or `none`.

## `GET /api/status`

Reports configured service reachability without returning secrets.

```json
{
  "app": "ok",
  "github": "ok",
  "chat": "ok",
  "embeddings": "ok",
  "database": "disabled"
}
```

