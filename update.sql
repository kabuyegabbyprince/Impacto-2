-- ============================================================================
-- IMPACTO LIVE MEET & WEBRTC SIGNALING SUPABASE STABILITY SCHEMA (update.sql)
-- ============================================================================

-- 1. Meetings Table
CREATE TABLE IF NOT EXISTS public.meetings (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  meeting_code TEXT,
  channel_name TEXT,
  status TEXT DEFAULT 'active',
  is_public BOOLEAN DEFAULT true,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast meeting code lookups
CREATE INDEX IF NOT EXISTS idx_meetings_code ON public.meetings (meeting_code);
CREATE INDEX IF NOT EXISTS idx_meetings_org_status ON public.meetings (org_id, status);

-- 2. Meeting Participants Table
CREATE TABLE IF NOT EXISTS public.meeting_participants (
  id SERIAL PRIMARY KEY,
  session_id TEXT,
  meeting_id TEXT,
  user_id TEXT,
  user_name TEXT,
  role TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_user ON public.meeting_participants (user_id);

-- 3. Meeting Chat Messages Table
CREATE TABLE IF NOT EXISTS public.meeting_chat_messages (
  id TEXT PRIMARY KEY,
  meeting_id TEXT,
  sender_id TEXT,
  sender_name TEXT,
  text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for stability & public access policies
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to ensure idempotency
DROP POLICY IF EXISTS "Enable all access for meetings" ON public.meetings;
DROP POLICY IF EXISTS "Enable all access for meeting_participants" ON public.meeting_participants;
DROP POLICY IF EXISTS "Enable all access for meeting_chat_messages" ON public.meeting_chat_messages;

-- Create permissive open policies for preview & real-time collaboration
CREATE POLICY "Enable all access for meetings" ON public.meetings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for meeting_participants" ON public.meeting_participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for meeting_chat_messages" ON public.meeting_chat_messages FOR ALL USING (true) WITH CHECK (true);
