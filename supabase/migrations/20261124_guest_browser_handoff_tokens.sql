-- Anonymous guest progress handoff: separate login-free browser cookies mapped
-- to the same visitor_sessions row; one-time invitation links expire in 10 min.
create table if not exists public.visitor_session_tokens (
  token_hash text primary key,
  session_id uuid not null references public.visitor_sessions(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists visitor_session_tokens_session_idx
  on public.visitor_session_tokens(session_id);

create table if not exists public.visitor_transfer_codes (
  token_hash text primary key,
  session_id uuid not null references public.visitor_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  constraint visitor_transfer_codes_expiry_after_creation check (expires_at > created_at)
);
create index if not exists visitor_transfer_codes_session_created_idx
  on public.visitor_transfer_codes(session_id, created_at desc);

alter table public.visitor_session_tokens enable row level security;
alter table public.visitor_transfer_codes enable row level security;
revoke all on public.visitor_session_tokens from anon, authenticated;
revoke all on public.visitor_transfer_codes from anon, authenticated;
comment on table public.visitor_transfer_codes is
  'One-time browser handoff codes: grants only guest session progress access, never coupon eligibility.';
