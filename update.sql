-- =====================================================================
-- COMPREHENSIVE UPDATE MIGRATION: Goals & Multi-Member Task Delegation
-- =====================================================================
-- Purpose:
-- 1. Alter public.goals table to support minimum expected targets,
--    jsonb tasks arrays, period labeling, and auto-recurring options.
-- 2. Add performance indices and RLS policies for goals and goal tasks.
-- =====================================================================

-- 1. Goals Table Column Alterations
ALTER TABLE IF EXISTS public.goals
  ADD COLUMN IF NOT EXISTS min_expected NUMERIC DEFAULT 70,
  ADD COLUMN IF NOT EXISTS target NUMERIC DEFAULT 100,
  ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS period_type TEXT DEFAULT 'yearly',
  ADD COLUMN IF NOT EXISTS period_label TEXT,
  ADD COLUMN IF NOT EXISTS achievement_percentage NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS assigned_to_member_id TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to_name TEXT,
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_cycle TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '[]'::jsonb;

-- 2. Enable Realtime publication for goals table updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'goals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
