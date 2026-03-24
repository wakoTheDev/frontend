-- =============================================================================
-- CropCare Dashboard – Supabase schema (copy & paste into Supabase SQL Editor)
-- Run this once to create the analysis_history table and crop-images storage.
-- If "crop-images" bucket already exists, you may see an error on the INSERT;
-- you can ignore it and run the rest, or create the bucket from Dashboard.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Analysis history table (stores each crop analysis + image URL)
-- -----------------------------------------------------------------------------
create table if not exists public.analysis_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  time_taken numeric,
  accuracy_rate numeric,
  recovery_rate numeric,
  recommendations text,
  insights text,
  image_url text,
  timestamp timestamptz not null default now(),
  crop_type text
);

comment on table public.analysis_history is 'Crop analysis results; image_url points to Supabase Storage (crop-images bucket).';

-- RLS
alter table public.analysis_history enable row level security;

drop policy if exists "Users can manage own analyses" on public.analysis_history;
create policy "Users can manage own analyses" on public.analysis_history
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for fast history listing by user and time
create index if not exists idx_analysis_history_user_timestamp
  on public.analysis_history (user_id, timestamp desc);

-- -----------------------------------------------------------------------------
-- 2. Storage bucket for crop images (public so image URLs work in PDF/export)
-- -----------------------------------------------------------------------------
-- Create bucket (run once; if it already exists, skip or ignore duplicate-key error)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'crop-images',
  'crop-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- -----------------------------------------------------------------------------
-- 3. Storage policies: users can only read/upload/update/delete their own folder
--    Path format: {user_id}/{timestamp}_{filename}
-- -----------------------------------------------------------------------------
drop policy if exists "Users can read own crop images" on storage.objects;
create policy "Users can read own crop images" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'crop-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can upload own crop images" on storage.objects;
create policy "Users can upload own crop images" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'crop-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own crop images" on storage.objects;
create policy "Users can update own crop images" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'crop-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'crop-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own crop images" on storage.objects;
create policy "Users can delete own crop images" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'crop-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- 4. Feedback table + storage (user feedback with screenshots)
-- =============================================================================

-- Optional: ensure profiles has an admin flag for role-based access.
-- (If you already added these columns earlier, this is safe to re-run.)
alter table public.profiles
  add column if not exists is_admin boolean default false;

-- Profile UI + synced settings (snake_case; matches frontend src/lib/supabase.js).
-- If save still fails, check RLS: users must be allowed to insert/update their row (id = auth.uid()).
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists location jsonb,
  add column if not exists account_type text default 'Free',
  add column if not exists farm_size text,
  add column if not exists primary_crops text,
  add column if not exists growing_zone text,
  add column if not exists photo_url text,
  add column if not exists updated_at timestamptz default now(),
  add column if not exists notification_preferences jsonb default '{}'::jsonb,
  add column if not exists app_settings jsonb default '{}'::jsonb,
  add column if not exists email_preferences boolean default false,
  add column if not exists location_permission_granted boolean,
  add column if not exists location_error text,
  add column if not exists get_started_guide_dismissed boolean default false,
  add column if not exists get_started_guide_dismissed_at timestamptz;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  type text not null,
  message text not null,
  rating integer,
  survey text,
  screenshot_paths text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

comment on table public.feedback is 'User feedback submissions; screenshot_paths points to feedback-screenshots bucket objects.';

-- RLS
alter table public.feedback enable row level security;

drop policy if exists "Users can insert own feedback" on public.feedback;
create policy "Users can insert own feedback" on public.feedback
  for insert
  to authenticated
  with check (
    auth.uid()::text = user_id::text
  );

drop policy if exists "Users can read own feedback" on public.feedback;
create policy "Users can read own feedback" on public.feedback
  for select
  to authenticated
  using (
    user_id::text = auth.uid()::text
    or exists (
      select 1
      from public.profiles p
      where p.id::text = auth.uid()::text
        and coalesce(p.is_admin, false) = true
    )
  );

drop policy if exists "Users can update own feedback" on public.feedback;
create policy "Users can update own feedback" on public.feedback
  for update
  to authenticated
  using (
    user_id::text = auth.uid()::text
  )
  with check (
    user_id::text = auth.uid()::text
  );

drop policy if exists "Users can delete own feedback" on public.feedback;
create policy "Users can delete own feedback" on public.feedback
  for delete
  to authenticated
  using (
    user_id::text = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- 4b. Weather alerts (optional history; used by frontend/src/lib/weatherAlertsStore.js)
-- -----------------------------------------------------------------------------
create table if not exists public.weather_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weather_data jsonb not null default '{}'::jsonb,
  alert_type text not null default 'weather',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.weather_alerts is 'Stored weather alert events for optional history/notifications.';

alter table public.weather_alerts enable row level security;

drop policy if exists "Users can manage own weather alerts" on public.weather_alerts;
create policy "Users can manage own weather alerts" on public.weather_alerts
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_weather_alerts_user_created
  on public.weather_alerts (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 5. Storage bucket for feedback screenshots (private + RLS)
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feedback-screenshots',
  'feedback-screenshots',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Storage RLS: paths are stored under {user_id}/feedback/{timestamp}_{idx}_{filename}
drop policy if exists "Users can read own feedback screenshots" on storage.objects;
create policy "Users can read own feedback screenshots" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'feedback-screenshots'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or exists (
        select 1
        from public.profiles p
        where p.id::text = auth.uid()::text
          and coalesce(p.is_admin, false) = true
      )
    )
  );

drop policy if exists "Users can upload own feedback screenshots" on storage.objects;
create policy "Users can upload own feedback screenshots" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'feedback-screenshots'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "Users can delete own feedback screenshots" on storage.objects;
create policy "Users can delete own feedback screenshots" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'feedback-screenshots'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- 6. Account deletion tokens (backend email link → confirm delete)
--     Used by backend/src/routes/account.js with service role (bypasses RLS).
-- -----------------------------------------------------------------------------
create table if not exists public.account_deletions (
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid() unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.account_deletions is 'Time-limited tokens for confirmed account deletion; backend uses service role (bypasses RLS).';

alter table public.account_deletions enable row level security;
-- No policies for authenticated users — only the backend (service role) should access this table.
