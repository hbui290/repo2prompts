alter table public.repository_briefs
  add column if not exists analysis_mode text not null default 'build';

update public.repository_briefs
set analysis_depth = 'balanced'
where analysis_depth = 'thorough';

alter table public.repository_briefs
  drop constraint if exists repository_briefs_analysis_depth_check;

alter table public.repository_briefs
  add constraint repository_briefs_analysis_depth_check
  check (analysis_depth in ('fast', 'balanced', 'deep', 'focused'));

alter table public.repository_briefs
  drop constraint if exists repository_briefs_analysis_mode_check;

alter table public.repository_briefs
  add constraint repository_briefs_analysis_mode_check
  check (analysis_mode in ('build', 'review', 'debug', 'migration', 'prompt'));

alter table public.repository_briefs
  drop constraint if exists repository_briefs_repository_key_analysis_depth_question_hash_key;

alter table public.repository_briefs
  drop constraint if exists repository_briefs_repository_key_analysis_mode_analysis_depth_question_hash_key;

alter table public.repository_briefs
  add constraint repository_briefs_repository_key_analysis_mode_analysis_depth_question_hash_key
  unique (repository_key, analysis_mode, analysis_depth, question_hash);
