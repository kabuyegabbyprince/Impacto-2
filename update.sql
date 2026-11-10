-- =====================================================================
-- SUPABASE REALTIME & MEEING SIGNALING MIGRATION SCRIPT (`update.sql`)
-- =====================================================================
-- Instructions:
-- 1. Run this entire script in your Supabase SQL Editor.
-- 2. Ensure Supabase Realtime is enabled on the `meetings` table.
-- =====================================================================

-- 1. Ensure public.meetings table exists with signaling and WebRTC columns
CREATE TABLE IF NOT EXISTS public.meetings (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  date_time TIMESTAMPTZ NOT NULL,
  duration INT NOT NULL DEFAULT 60,
  location TEXT NOT NULL DEFAULT 'Online',
  link TEXT,
  agenda JSONB DEFAULT '[]'::jsonb,
  minutes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  channel_name TEXT DEFAULT 'General',
  meeting_title TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  duration_formatted TEXT,
  recorded_by TEXT,
  is_public BOOLEAN DEFAULT true,
  participants JSONB DEFAULT '[]'::jsonb,
  documents_used JSONB DEFAULT '[]'::jsonb,
  notes JSONB DEFAULT '[]'::jsonb,
  chat_messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Safely add signaling & WebRTC columns if missing on existing meetings table
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

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- 4. Create permissive access policy for development & multi-device sync
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meetings' AND policyname = 'allow_all_meetings') THEN
    CREATE POLICY allow_all_meetings ON public.meetings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON TABLE public.meetings TO anon, authenticated, service_role;

-- 5. Enable Supabase Realtime Publication on the `meetings` table
-- This allows real-time signaling, presence, and chat synchronization across separate devices/browsers.
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
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
