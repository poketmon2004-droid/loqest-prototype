create table if not exists public.tours (
  id text primary key,
  name text not null,
  short_name text not null default '',
  region text not null default '',
  description text not null default '',
  status text not null default '비공개',
  badge_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.tours (
  id, name, short_name, region, description, status, badge_name
) values (
  'amsa',
  '암사동 선사유적지 투어',
  '암사',
  '서울 강동구',
  '선사유적지의 주요 퀘스트 장소를 탐험하는 랜드마크 투어입니다.',
  '공개',
  '선사유적지 탐험가'
)
on conflict (id) do nothing;

insert into public.tours (id, name, short_name, status)
select distinct tour_id, tour_id, tour_id, '비공개'
from public.attractions
where tour_id is not null and tour_id <> ''
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'attractions_tour_id_fkey'
  ) then
    alter table public.attractions
      add constraint attractions_tour_id_fkey
      foreign key (tour_id) references public.tours(id)
      on update cascade on delete restrict;
  end if;
end $$;

create index if not exists attractions_tour_id_idx
  on public.attractions(tour_id);
