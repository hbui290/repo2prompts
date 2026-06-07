alter table public.repository_briefs
  add column if not exists evidence_fingerprint text not null default 'legacy';

alter table public.repository_briefs
  drop constraint if exists repository_briefs_repository_key_analysis_mode_analysis_depth_question_hash_key;

alter table public.repository_briefs
  add constraint repository_briefs_fingerprint_cache_key
  unique (
    repository_key,
    analysis_mode,
    analysis_depth,
    question_hash,
    evidence_fingerprint
  );

create table public.repository_analysis_cache (
  id uuid primary key default gen_random_uuid(),
  repository_key text not null,
  resolved_ref text not null,
  repository_path text not null default '',
  evidence_fingerprint text not null,
  scope text not null check (scope in ('general', 'focused', 'deep')),
  question_hash text not null default 'none',
  repository_map jsonb not null,
  evidence_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (
    repository_key,
    resolved_ref,
    repository_path,
    evidence_fingerprint,
    scope,
    question_hash
  )
);

create index repository_analysis_cache_repository_idx
  on public.repository_analysis_cache (repository_key, updated_at desc);

alter table public.repository_analysis_cache enable row level security;
