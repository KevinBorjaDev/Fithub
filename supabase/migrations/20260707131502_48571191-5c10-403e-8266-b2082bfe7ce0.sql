ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS program_start_date date,
  ADD COLUMN IF NOT EXISTS program_end_date date;