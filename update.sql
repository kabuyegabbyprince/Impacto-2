-- =====================================================================
-- COMPREHENSIVE UPDATE MIGRATION: Schema Alterations & Persistent Storage
-- =====================================================================
-- Strategy:
-- 1. Alter existing tables (meetings, goals, events, organizations) to
--    natively store live meeting histories, delegated tasks, checklists,
--    and custom metadata without needing fragmented ancillary tables.
-- 2. Real database persistence for meeting records: ensures when records
--    are cleared or deleted, they are removed permanently from PostgreSQL.
-- =====================================================================

-- 1. Alter Existing Table: public.meetings
-- Adds native JSONB columns for live attendees, documents, notes, and chat transcripts
ALTER TABLE IF EXISTS public.meetings
  ADD COLUMN IF NOT EXISTS channel_name TEXT DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS meeting_title TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_formatted TEXT,
  ADD COLUMN IF NOT EXISTS recorded_by TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS documents_used JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS chat_messages JSONB DEFAULT '[]'::jsonb;

-- Indices on public.meetings for speedy history lookups
CREATE INDEX IF NOT EXISTS idx_meetings_org_started ON public.meetings(org_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings(status);

-- 2. Alter Existing Table: public.goals
-- Adds multi-member delegation, checklists, recurring options, and tasks
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

-- 3. Alter Existing Table: public.events
-- Adds tasks and deadline progression
ALTER TABLE IF EXISTS public.events
  ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS overall_progress INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;

-- 4. Alter Existing Table: public.organizations
-- Adds mobile money dues & donation account columns
ALTER TABLE IF EXISTS public.organizations
  ADD COLUMN IF NOT EXISTS dues_mtn_number TEXT,
  ADD COLUMN IF NOT EXISTS dues_airtel_number TEXT,
  ADD COLUMN IF NOT EXISTS dues_account_name TEXT,
  ADD COLUMN IF NOT EXISTS momo_merchant_code TEXT,
  ADD COLUMN IF NOT EXISTS donation_mtn_number TEXT,
  ADD COLUMN IF NOT EXISTS donation_airtel_number TEXT,
  ADD COLUMN IF NOT EXISTS donation_account_name TEXT,
  ADD COLUMN IF NOT EXISTS allow_hosting_events BOOLEAN DEFAULT true;

-- 5. Backward Compatibility Support: meeting_sessions & relational tasks
-- In case specific legacy queries or foreign keys reference these tables:
CREATE TABLE IF NOT EXISTS public.meeting_sessions (
  id TEXT PRIMARY KEY,
  org_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE,
  meeting_title TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  duration_formatted TEXT,
  recorded_by TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  goal_id TEXT REFERENCES public.goals(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT false,
  progress NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'pending', 'in_progress', 'completed')),
  assigned_to_member_id TEXT,
  assigned_to_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_checklists (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS & Permissions
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meetings' AND policyname = 'allow_all_meetings') THEN
    CREATE POLICY allow_all_meetings ON public.meetings FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'allow_all_tasks') THEN
    CREATE POLICY allow_all_tasks ON public.tasks FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_checklists' AND policyname = 'allow_all_task_checklists') THEN
    CREATE POLICY allow_all_task_checklists ON public.task_checklists FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON TABLE public.meetings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.goals TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.events TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.tasks TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.task_checklists TO anon, authenticated, service_role;

-- Realtime Publication for tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'meetings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'task_checklists'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_checklists;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
