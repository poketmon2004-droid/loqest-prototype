-- Run once in the Supabase SQL Editor before enabling server-backed tests.
-- Stores one server-wide aggregate per quest; never exposes this table directly to browsers.
create table if not exists public.recognition_test_records (
  attraction_id bigint primary key references public.attractions(id) on delete cascade,
  total_tests integer not null default 0 check (total_tests >= 0),
  successful_tests integer not null default 0 check (successful_tests >= 0),
  failed_tests integer not null default 0 check (failed_tests >= 0),
  recent_results jsonb not null default '[]'::jsonb,
  last_result text check (last_result in ('통과','실패')),
  last_tested_at timestamptz,
  quality text not null default '정상',
  approved boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.recognition_test_records enable row level security;
-- Service-role API accesses the table; no anon/authenticated table grants added.
revoke all on public.recognition_test_records from anon, authenticated;
grant select, insert, update, delete on public.recognition_test_records to service_role;
comment on table public.recognition_test_records is
  'Aggregated landmark recognition test results per attraction; accessed by server routes only.';
