create extension if not exists vector;

create table public.repository_briefs (
  id uuid primary key default gen_random_uuid(),
  repository_key text not null,
  analysis_depth text not null check (analysis_depth in ('fast', 'thorough', 'focused')),
  question_hash text not null default 'none',
  title text not null,
  brief_markdown text not null,
  evidence_json jsonb not null default '{}'::jsonb,
  embedding vector(512),
  view_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_document tsvector generated always as (
    to_tsvector('english', coalesce(repository_key, '') || ' ' || coalesce(title, '') || ' ' || coalesce(brief_markdown, ''))
  ) stored,
  unique (repository_key, analysis_depth, question_hash)
);

create index repository_briefs_created_at_idx
  on public.repository_briefs (created_at desc);

create index repository_briefs_search_document_idx
  on public.repository_briefs using gin (search_document);

alter table public.repository_briefs enable row level security;

