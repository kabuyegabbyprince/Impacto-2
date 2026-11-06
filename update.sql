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

-- 2. Organizations Table MoMo & Event Hosting Columns
ALTER TABLE IF EXISTS public.organizations
  ADD COLUMN IF NOT EXISTS dues_mtn_number TEXT,
  ADD COLUMN IF NOT EXISTS dues_airtel_number TEXT,
  ADD COLUMN IF NOT EXISTS dues_account_name TEXT,
  ADD COLUMN IF NOT EXISTS momo_merchant_code TEXT,
  ADD COLUMN IF NOT EXISTS donation_mtn_number TEXT,
  ADD COLUMN IF NOT EXISTS donation_airtel_number TEXT,
  ADD COLUMN IF NOT EXISTS donation_account_name TEXT,
  ADD COLUMN IF NOT EXISTS allow_hosting_events BOOLEAN DEFAULT true;

-- 3. Live Video Meeting Sessions & History DDL
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
  requires_admin_confirmation BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.meeting_participants (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id TEXT REFERENCES public.meeting_sessions(id) ON DELETE CASCADE,
  peer_id TEXT NOT NULL,
  user_id TEXT,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'Member',
  is_me BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.meeting_documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id TEXT REFERENCES public.meeting_sessions(id) ON DELETE CASCADE,
  doc_id TEXT REFERENCES public.documents(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT,
  presented_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.meeting_notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id TEXT REFERENCES public.meeting_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assignee TEXT,
  status TEXT DEFAULT 'open',
  author TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.meeting_chat_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id TEXT REFERENCES public.meeting_sessions(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  is_doc_comment BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indices & Performance Optimization
CREATE INDEX IF NOT EXISTS idx_meeting_sessions_org ON public.meeting_sessions(org_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_session ON public.meeting_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_meeting_documents_session ON public.meeting_documents(session_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_session ON public.meeting_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_meeting_chat_messages_session ON public.meeting_chat_messages(session_id);

-- 5. Row Level Security (RLS) & Permissions
ALTER TABLE public.meeting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_chat_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meeting_sessions' AND policyname = 'allow_all_meeting_sessions') THEN
    CREATE POLICY allow_all_meeting_sessions ON public.meeting_sessions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meeting_participants' AND policyname = 'allow_all_meeting_participants') THEN
    CREATE POLICY allow_all_meeting_participants ON public.meeting_participants FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meeting_documents' AND policyname = 'allow_all_meeting_documents') THEN
    CREATE POLICY allow_all_meeting_documents ON public.meeting_documents FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meeting_notes' AND policyname = 'allow_all_meeting_notes') THEN
    CREATE POLICY allow_all_meeting_notes ON public.meeting_notes FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meeting_chat_messages' AND policyname = 'allow_all_meeting_chat_messages') THEN
    CREATE POLICY allow_all_meeting_chat_messages ON public.meeting_chat_messages FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON TABLE public.meeting_sessions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.meeting_participants TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.meeting_documents TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.meeting_notes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.meeting_chat_messages TO anon, authenticated, service_role;

-- 6. Enable Realtime publication for tables
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

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'meeting_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'meeting_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_participants;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'meeting_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_chat_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'meeting_notes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_notes;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
