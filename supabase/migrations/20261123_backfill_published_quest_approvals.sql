-- One-time backfill for quests published before server-side test records existed.
-- A published quest with reference images is treated as historically approved.
-- Do not fabricate test counts, dates, or test outcomes.
-- Never approve quests explicitly marked as requiring retesting.
insert into public.recognition_test_records (attraction_id, approved, quality)
select a.id, true, a.quality
from public.attractions a
where a.status = '공개'
  and a.quality <> '재테스트 필요'
  and exists (
    select 1 from public.attraction_reference_images i
    where i.attraction_id = a.id
  )
on conflict (attraction_id) do nothing;
