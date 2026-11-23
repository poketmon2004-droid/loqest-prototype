-- A quest can have at most one representative reference image.
-- New registrations require exactly one via API validation.
-- Existing quests are left unselected until an administrator chooses their representative.
alter table public.attraction_reference_images
  add column if not exists is_representative boolean not null default false;

create unique index if not exists attraction_reference_images_one_representative
  on public.attraction_reference_images (attraction_id)
  where is_representative = true;
