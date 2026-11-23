-- Per-quest camera framing guideline (only three supported shapes).
-- Existing quests retain the current rectangular guide by default.
alter table public.attractions
  add column if not exists guide_shape text not null default 'rectangle';
alter table public.attractions
  drop constraint if exists attractions_guide_shape_check;
alter table public.attractions
  add constraint attractions_guide_shape_check
  check (guide_shape in ('rectangle', 'triangle', 'circle'));
