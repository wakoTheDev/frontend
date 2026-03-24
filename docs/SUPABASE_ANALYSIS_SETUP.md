# Supabase setup for analysis history and crop images

The app stores **crop analysis history** and **uploaded crop images** in Supabase (not Firebase).

## 1. Storage bucket (crop images)

In Supabase Dashboard → **Storage**:

1. Click **New bucket**.
2. Name: `crop-images`.
3. Set **Public bucket** to **Yes** (so image URLs work in PDF export and history).
4. Create the bucket.
5. Under **Policies**, add a policy so authenticated users can upload and read their own files, for example:
   - **Policy name**: `Users can manage own crop images`
   - **Allowed operation**: All (or separate INSERT/SELECT for `user_id` folder).
   - **Target roles**: `authenticated`.
   - **Policy definition**:  
     `(bucket_id = 'crop-images') and (auth.uid()::text = (storage.foldername(name))[1])`  
     so users can only access paths under `{their_user_id}/`.

## 2. Table (analysis history)

In Supabase Dashboard → **SQL Editor**, run:

```sql
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

alter table public.analysis_history enable row level security;

-- Allow users to manage only their own rows
drop policy if exists "Users can manage own analyses" on public.analysis_history;
create policy "Users can manage own analyses" on public.analysis_history
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Optional: index for faster history listing
create index if not exists idx_analysis_history_user_timestamp
  on public.analysis_history (user_id, timestamp desc);
```

After this, the frontend will upload images to the `crop-images` bucket and save/load analysis records from `analysis_history`.
