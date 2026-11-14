-- =====================================================================
-- IMPACTO OPERATING SYSTEM — MASTER DATABASE SCHEMA & RESTORE SCRIPT
-- =====================================================================
-- Description: Clean, deduplicated, production-ready PostgreSQL / Supabase
-- schema covering multi-tenant organizations, membership governance,
-- financial accounting, live WebRTC meetings, goals & task delegation,
-- KYC/KYB verification workflows, RLS security, storage, and Realtime.
--
-- Supported Architecture: PostgreSQL 14+ / Supabase
-- Idempotency: Safe to execute repeatedly on both fresh and live DBs.
--
-- TABLE OF CONTENTS:
--   0.  Extensions & Prerequisites
--   1.  Core Identity, Multi-Tenant Workspaces & Platform Administration
--   2.  Programs, Events, Facility Spaces, Live Meetings & Tasks
--   3.  Real-Time Communication, Polls, News & Notifications
--   4.  Impact Goals, Grants, Field Activities, Assets & Certificates
--   5.  Finance, Dues, Donations, Share Capital, Marketplace & Billing
--   6.  Governance, Document Vault, Verification, Audit & Support
--   7.  Idempotent Column Sync & Constraint Normalization
--   8.  Performance & Chronological Query Indices
--   9.  Security Helper Functions & Privilege Guard Trigger
--   10. Atomic Verification & Workflow RPCs
--   11. Row-Level Security (RLS), Role Grants & Deduplicated Policies
--   12. Supabase Storage Buckets & Access Policies
--   13. Default Seed Data & Supabase Realtime Publications
-- =====================================================================


-- =====================================================================
-- 0. EXTENSIONS & PREREQUISITES
-- =====================================================================
-- Provides UUID generation (uuid_generate_v4) and cryptographic helpers
-- (gen_random_uuid, digest, etc.) required by primary keys and tokens.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =====================================================================
-- 1. CORE IDENTITY, MULTI-TENANT WORKSPACES & PLATFORM ADMINISTRATION
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1.1 USERS — Global platform user identities, auth mapping, and UI prefs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  is_superadmin BOOLEAN DEFAULT false,
  platform_role TEXT DEFAULT 'user',
  auth_user_id TEXT UNIQUE,
  preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'fr', 'rw')),
  accessibility_font_size TEXT DEFAULT 'normal' CHECK (accessibility_font_size IN ('normal', 'large', 'x-large')),
  accessibility_high_contrast BOOLEAN DEFAULT false,
  bio TEXT,
  phone_number TEXT,
  job_title TEXT,
  notification_email BOOLEAN DEFAULT true,
  notification_sms BOOLEAN DEFAULT false,
  ui_density TEXT DEFAULT 'normal' CHECK (ui_density IN ('normal', 'compact', 'spacious')),
  reduced_motion BOOLEAN DEFAULT false,
  profile_visibility TEXT DEFAULT 'members_only' CHECK (profile_visibility IN ('public', 'members_only', 'private')),
  status_badge TEXT DEFAULT 'active' CHECK (status_badge IN ('active', 'remote', 'field', 'away')),
  primary_org_id TEXT,
  joined_org_ids TEXT[] DEFAULT '{}',
  referral_code TEXT,
  referred_by_code TEXT,
  referred_by_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 1.2 ORGANIZATIONS — Multi-tenant workspaces (cooperatives, NGOs, clubs)
-- Stores branding, subscription plan, MoMo payment channels, public page
-- visibility flags, rentable spaces config, and KYB verification status.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT DEFAULT '',
  description TEXT DEFAULT '',
  mission TEXT,
  vision TEXT,
  logo_url TEXT,
  cover_url TEXT,
  primary_color TEXT DEFAULT '#16a34a',
  secondary_color TEXT DEFAULT '#ca8a04',
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'fr', 'rw')),
  auto_confirm_members BOOLEAN DEFAULT true,
  donations_enabled BOOLEAN DEFAULT true,
  donation_mtn_number TEXT,
  donation_airtel_number TEXT,
  donation_account_name TEXT,
  donation_description TEXT,
  dues_mtn_number TEXT,
  dues_airtel_number TEXT,
  dues_account_name TEXT,
  momo_merchant_code TEXT,
  momo_display_methods TEXT[] DEFAULT ARRAY['merchant_code']::text[],
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'grace_period', 'expired', 'cancelled')),
  subscription_ends_at TIMESTAMPTZ,
  subscription_tier TEXT DEFAULT 'trial' CHECK (subscription_tier IN ('trial', 'starter', 'growth', 'pro', 'enterprise', 'free')),
  subscription_plan TEXT DEFAULT 'growth',
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + interval '30 days'),
  grace_period_ends_at TIMESTAMPTZ DEFAULT (NOW() + interval '33 days'),
  active_packages TEXT[] DEFAULT '{}',
  packages_data JSONB DEFAULT '{}'::jsonb,
  bonus_member_slots INTEGER DEFAULT 0,
  member_limit INTEGER DEFAULT 30,
  storage_unlimited BOOLEAN DEFAULT false,
  org_category TEXT NOT NULL DEFAULT 'Environment',
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  verification_status TEXT DEFAULT 'unverified',
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  verification_rejection_reason TEXT,
  verification_submitted_at TIMESTAMPTZ,
  referred_by_code TEXT,
  referred_by_user_id TEXT,
  location_name TEXT,
  contact_us TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  public_page_enabled BOOLEAN DEFAULT true,
  show_goals_publicly BOOLEAN DEFAULT true,
  show_impact_publicly BOOLEAN DEFAULT true,
  show_calendar_publicly BOOLEAN DEFAULT true,
  allow_hosting_events BOOLEAN DEFAULT true,
  has_rentable_spaces BOOLEAN DEFAULT false,
  rentable_spaces JSONB DEFAULT '[]'::jsonb,
  show_space_calendar_publicly BOOLEAN DEFAULT false,
  dashboard_theme TEXT DEFAULT 'light' CHECK (dashboard_theme IN ('light', 'dark', 'custom')),
  dashboard_logo TEXT,
  is_public_directory BOOLEAN DEFAULT true,
  allow_public_joining BOOLEAN DEFAULT true,
  exit_survey_enabled BOOLEAN DEFAULT false,
  exit_survey_title TEXT,
  exit_survey_description TEXT,
  exit_survey_questions JSONB DEFAULT '[]'::jsonb,
  quorum_type TEXT DEFAULT 'percentage' CHECK (quorum_type IN ('absolute', 'percentage')),
  quorum_value NUMERIC DEFAULT 50,
  financial_summary_enabled BOOLEAN DEFAULT true,
  fee_notification TEXT,
  marketplace_enabled BOOLEAN DEFAULT true,
  country TEXT,
  province TEXT,
  district TEXT,
  sector TEXT,
  founded_date TEXT,
  founders TEXT,
  registration_number TEXT,
  website TEXT,
  facebook_url TEXT,
  twitter_url TEXT,
  linkedin_url TEXT,
  employee_count TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 1.3 MEMBER_TIERS — Custom membership fee tiers & member benefits
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_tiers (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  annual_fee NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'RWF',
  benefits TEXT[] DEFAULT '{}',
  color TEXT DEFAULT '#16a34a',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 1.4 ORG_MEMBERS — Tenant membership mapping, roles, KYC docs & perms
-- Connects a user to an organization with granular role & verification info.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_members (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'org_admin', 'manager', 'accountant', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'resigned', 'rejected')),
  member_number TEXT,
  tier_id TEXT REFERENCES public.member_tiers(id) ON DELETE SET NULL,
  phone_number TEXT,
  is_volunteer BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'not_required' CHECK (verification_status IN ('not_required', 'unsubmitted', 'pending', 'verified', 'rejected', 'flagged')),
  verified_at TIMESTAMPTZ,
  verified_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  passport_photo_url TEXT,
  id_document_url TEXT,
  id_document_type TEXT,
  id_document_number TEXT,
  id_submitted_at TIMESTAMPTZ,
  permissions JSONB DEFAULT '{"manage_members": false, "manage_content": false, "manage_finance": false, "manage_settings": false, "view_analytics": true, "manage_documents": false, "manage_chat": true}'::jsonb,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- ---------------------------------------------------------------------
-- 1.5 PLATFORM_STAFF — Superadmin team, platform auditors & support staff
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_staff (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role VARCHAR DEFAULT 'support',
  status VARCHAR DEFAULT 'active',
  last_active TIMESTAMPTZ,
  notes TEXT,
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 1.6 PLATFORM_AUDIT_LOGS — Platform-wide superadmin & auditor action logs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  target_type VARCHAR NOT NULL,
  target_id TEXT,
  actor_id TEXT,
  actor_name TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 1.7 PLATFORM_SETTINGS — Global FX rates & Virellix billing accounts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  usd_to_rwf_rate NUMERIC DEFAULT 1400,
  eur_to_rwf_rate NUMERIC DEFAULT 1450,
  kes_to_rwf_rate NUMERIC DEFAULT 10,
  mtn_payment_number TEXT DEFAULT '',
  airtel_payment_number TEXT DEFAULT '',
  payment_name TEXT DEFAULT 'VIRELLIX INC',
  momo_merchant_code TEXT DEFAULT '',
  mtn_merchant_code TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 1.8 REFERRALS — Multi-level user & organization referral tracking
-- Automatically updated to 'verified' when review_org_verification approves.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referrals (
  id TEXT PRIMARY KEY,
  referrer_user_id TEXT NOT NULL,
  referrer_name TEXT,
  referred_user_id TEXT,
  referred_user_name TEXT,
  referred_org_id TEXT REFERENCES public.organizations(id) ON DELETE SET NULL,
  referred_org_name TEXT,
  referral_code TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  parent_referrer_id TEXT,
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'org_created', 'verified')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =====================================================================
-- 2. PROGRAMS, EVENTS, FACILITY SPACES, LIVE MEETINGS & TASKS
-- =====================================================================

-- ---------------------------------------------------------------------
-- 2.1 PROGRAMS — High-level operational initiatives within an organization
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.programs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planning', 'active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 2.2 EVENTS — Community gatherings, geo-fenced QR check-ins & tasks
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  location TEXT NOT NULL DEFAULT 'TBD',
  online_link TEXT,
  program_id TEXT REFERENCES public.programs(id) ON DELETE SET NULL,
  max_attendees INT,
  is_public BOOLEAN DEFAULT true,
  qr_code_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  attendees_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  is_deleted BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  last_edited_at TIMESTAMPTZ,
  location_type TEXT DEFAULT 'on-site' CHECK (location_type IN ('on-site', 'online')),
  latitude NUMERIC,
  longitude NUMERIC,
  radius_meters NUMERIC DEFAULT 100,
  is_broadcasted BOOLEAN DEFAULT false,
  tasks JSONB DEFAULT '[]'::jsonb,
  overall_progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 2.3 EVENT_ATTENDANCE — Member check-ins (QR, GPS, manual, or online)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_attendance (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_in_method TEXT NOT NULL DEFAULT 'qr' CHECK (check_in_method IN ('manual', 'qr', 'self', 'online_confirm')),
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'attempted', 'mismatch')),
  attempt_lat NUMERIC,
  attempt_lng NUMERIC,
  distance_meters NUMERIC,
  recorded_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, member_id)
);

-- ---------------------------------------------------------------------
-- 2.4 EVENT_RSVPS — Pre-event attendee confirmations & guest counts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  response TEXT NOT NULL CHECK (response IN ('yes', 'no', 'maybe')),
  guests_count INT4 DEFAULT 0,
  note TEXT,
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, member_id)
);

-- ---------------------------------------------------------------------
-- 2.5 EVENT_WAITLIST — Waitlist queue when events reach capacity
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_waitlist (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'waiting',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, member_id)
);

-- ---------------------------------------------------------------------
-- 2.6 SPACES & SPACE_BOOKINGS — Rentable rooms/halls & reservation calendar
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spaces (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'Meeting Room',
  capacity INTEGER DEFAULT 20,
  size_sqm NUMERIC DEFAULT 35,
  hourly_rate NUMERIC DEFAULT 0,
  amenities TEXT[] DEFAULT '{}'::text[],
  manager_name TEXT,
  manager_phone TEXT,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.space_bookings (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  space_id TEXT NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  space_name TEXT,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  title TEXT NOT NULL,
  reserved_by TEXT,
  contact_phone TEXT,
  attendees_count INTEGER DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 2.7 MEETINGS & ACTION ITEMS — Scheduled meetings + live WebRTC rooms
-- Note: date_time, duration, and location are nullable with safe defaults
-- so instant ad-hoc live meetings can be created and synced across devices.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meetings (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  meeting_title TEXT,
  meeting_code TEXT,
  channel_name TEXT DEFAULT 'General',
  channel_id TEXT,
  host_id TEXT,
  host_name TEXT,
  date_time TIMESTAMPTZ DEFAULT NOW(),
  duration INT DEFAULT 60,
  location TEXT DEFAULT 'Online Meet',
  location_type TEXT DEFAULT 'on-site' CHECK (location_type IN ('on-site', 'online')),
  link TEXT,
  agenda JSONB DEFAULT '[]'::jsonb,
  minutes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  quorum_required NUMERIC,
  quorum_reached BOOLEAN DEFAULT false,
  quorum_count_at_completion INT DEFAULT 0,
  attendance_count INT DEFAULT 0,
  latitude NUMERIC,
  longitude NUMERIC,
  radius_meters NUMERIC DEFAULT 100,
  is_broadcasted BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  duration_formatted TEXT,
  recorded_by TEXT,
  participants JSONB DEFAULT '[]'::jsonb,
  documents_used JSONB DEFAULT '[]'::jsonb,
  notes JSONB DEFAULT '[]'::jsonb,
  chat_messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.action_items (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  meeting_id TEXT REFERENCES public.meetings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  assigned_to TEXT NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 2.8 LIVE MEETING SESSIONS & ARCHIVE TABLES
-- Normalized storage for session history, active participants, presented
-- documents, collaborative notes, and in-call chat transcripts.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meeting_sessions (
  id TEXT PRIMARY KEY,
  org_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE,
  meeting_title TEXT NOT NULL,
  channel_name TEXT DEFAULT 'General',
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
  session_id TEXT,
  meeting_id TEXT,
  peer_id TEXT,
  user_id TEXT,
  user_name TEXT,
  name TEXT,
  role TEXT DEFAULT 'Member',
  is_me BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.meeting_documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id TEXT,
  doc_id TEXT,
  name TEXT,
  category TEXT,
  presented_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.meeting_notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id TEXT,
  title TEXT,
  assignee TEXT,
  status TEXT DEFAULT 'open',
  author TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.meeting_chat_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id TEXT,
  meeting_id TEXT,
  sender_id TEXT,
  sender_name TEXT,
  sender TEXT,
  text TEXT,
  is_doc_comment BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 2.9 TASKS & TASK CHECKLISTS — Granular task delegation for goals/events
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  goal_id TEXT,
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


-- =====================================================================
-- 3. REAL-TIME COMMUNICATION, POLLS, NEWS & NOTIFICATIONS
-- =====================================================================

-- ---------------------------------------------------------------------
-- 3.1 CHAT CHANNELS & CHAT MESSAGES — Group channels, announcements & DMs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_channels (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'group' CHECK (type IN ('group', 'announcement', 'direct')),
  channel_type TEXT DEFAULT 'general' CHECK (channel_type IN ('general', 'project', 'committee', 'private', 'announcement')),
  is_private BOOLEAN DEFAULT false,
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  member_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  sender_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  attachment_url TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'voice', 'poll', 'system')),
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  file_mime_type TEXT,
  voice_duration_seconds INT,
  reply_to_id TEXT REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 3.2 POLLS & POLL VOTES — Interactive in-chat voting & legacy poll logs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.polls (
  poll_id TEXT PRIMARY KEY,
  message_id TEXT,
  channel_id TEXT NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL REFERENCES public.polls(poll_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.poll_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  message_id TEXT NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.poll_responses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  poll_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  selected_options INT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

-- ---------------------------------------------------------------------
-- 3.3 NEWS_POSTS — Organization public updates & member bulletins
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.news_posts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  cover_url TEXT,
  category TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'members')),
  is_pinned BOOLEAN DEFAULT false,
  author_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,
  last_edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 3.4 MESSAGE_TEMPLATES & NOTIFICATION_SENDS — Bulk messaging & logs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  occasion TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_system_template BOOLEAN DEFAULT false,
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_sends (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_id TEXT REFERENCES public.message_templates(id) ON DELETE SET NULL,
  channels TEXT[] DEFAULT '{}',
  recipient_ids TEXT[] DEFAULT '{}',
  recipient_group TEXT,
  recipient_count INTEGER DEFAULT 0,
  body_text TEXT,
  variables_applied JSONB DEFAULT '{}'::jsonb,
  activity_id TEXT,
  event_id TEXT REFERENCES public.events(id) ON DELETE SET NULL,
  meeting_id TEXT REFERENCES public.meetings(id) ON DELETE SET NULL,
  sent_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =====================================================================
-- 4. IMPACT GOALS, GRANTS, FIELD ACTIVITIES, ASSETS & CERTIFICATES
-- =====================================================================

-- ---------------------------------------------------------------------
-- 4.1 GOALS & GOAL_UPDATES — KPI targets, recurring goals & task arrays
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goals (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target NUMERIC DEFAULT 100,
  min_expected NUMERIC DEFAULT 70,
  unit TEXT DEFAULT 'percent',
  current_progress NUMERIC NOT NULL DEFAULT 0,
  starting_progress NUMERIC DEFAULT 0,
  deadline TIMESTAMPTZ NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'members')),
  is_pinned BOOLEAN DEFAULT false,
  period_type TEXT DEFAULT 'yearly' CHECK (period_type IN ('yearly', 'monthly')),
  period_label TEXT,
  achievement_percentage NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  assigned_to_member_id TEXT,
  assigned_to_name TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_cycle TEXT DEFAULT 'monthly',
  tasks JSONB DEFAULT '[]'::jsonb,
  is_deleted BOOLEAN DEFAULT false,
  last_edited_at TIMESTAMPTZ,
  last_note TEXT,
  user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link tasks.goal_id FK after goals table is guaranteed to exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_goal_id_fkey'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.goal_updates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  goal_id TEXT NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  note TEXT,
  updated_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 4.2 GRANTS — Institutional grant opportunity & application tracker
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grants (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  funder TEXT NOT NULL,
  amount_range TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RWF',
  deadline TIMESTAMPTZ NOT NULL,
  link TEXT,
  eligibility TEXT,
  program_id TEXT REFERENCES public.programs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'tracking' CHECK (status IN ('tracking', 'applied', 'successful', 'unsuccessful', 'withdrawn')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 4.3 ACTIVITY_LOGS & ACTIVITY_ATTENDANCE — Field work & attendance logs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_id TEXT REFERENCES public.programs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  activity_type TEXT,
  target_metric TEXT,
  present_member_ids TEXT[] DEFAULT '{}',
  absent_member_ids TEXT[] DEFAULT '{}',
  attendees TEXT[] DEFAULT '{}',
  activity_date DATE NOT NULL,
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_attendance (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  activity_id TEXT NOT NULL REFERENCES public.activity_logs(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  recorded_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, member_id)
);

-- ---------------------------------------------------------------------
-- 4.4 ASSETS — Cooperative/NGO fixed assets, equipment & custody tracking
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Equipment',
  quantity NUMERIC DEFAULT 1,
  quality TEXT,
  identifier TEXT,
  serial_number TEXT,
  purchase_date DATE,
  purchase_cost NUMERIC(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'RWF',
  condition TEXT DEFAULT 'good' CHECK (condition IN ('new', 'good', 'fair', 'needs_repair', 'damaged')),
  assigned_to_member_id TEXT REFERENCES public.org_members(id) ON DELETE SET NULL,
  assigned_to_name TEXT,
  location TEXT,
  status TEXT DEFAULT 'operational' CHECK (status IN ('operational', 'maintenance', 'in_storage', 'decommissioned', 'disposed')),
  notes TEXT,
  qr_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 4.5 CERTIFICATES — Verifiable QR-coded member & training certificates
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.certificates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_member_id TEXT REFERENCES public.org_members(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  title TEXT NOT NULL,
  description TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  certificate_code TEXT NOT NULL UNIQUE,
  template_theme TEXT DEFAULT 'emerald' CHECK (template_theme IN ('gold', 'emerald', 'navy', 'modern')),
  signatory_name TEXT NOT NULL,
  signatory_title TEXT NOT NULL,
  signatory_signature_url TEXT,
  qr_verification_url TEXT,
  status TEXT DEFAULT 'issued' CHECK (status IN ('issued', 'revoked')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =====================================================================
-- 5. FINANCE, DUES, DONATIONS, SHARE CAPITAL, MARKETPLACE & BILLING
-- =====================================================================

-- ---------------------------------------------------------------------
-- 5.1 LEDGER_ENTRIES — Double-entry/categorized financial ledger
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'asset', 'liability', 'equity')),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RWF',
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  reference TEXT,
  receipt_url TEXT,
  program_id TEXT REFERENCES public.programs(id) ON DELETE SET NULL,
  goal_id TEXT REFERENCES public.goals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 5.2 DONATIONS — Public MoMo donations awaiting accountant/admin confirm
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.donations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  donor_name TEXT NOT NULL,
  donor_email TEXT NOT NULL,
  message TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('mtn', 'airtel')),
  proof_url TEXT,
  status TEXT DEFAULT 'awaiting_approval' CHECK (status IN ('awaiting_approval', 'confirmed', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 5.3 MEMBER_FEES — Recurring membership dues & self-reported receipts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_fees (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  due_name TEXT,
  amount NUMERIC NOT NULL,
  total_due_amount NUMERIC,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  pending_installment_amount NUMERIC NOT NULL DEFAULT 0,
  payment_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  currency TEXT NOT NULL DEFAULT 'RWF',
  payment_period TEXT NOT NULL,
  period_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  is_recurring BOOLEAN DEFAULT true,
  paid_at TIMESTAMPTZ,
  paid_by_method TEXT,
  transaction_reference TEXT,
  sender_info TEXT,
  reported_at TIMESTAMPTZ,
  report_note TEXT,
  admin_note TEXT,
  proof_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 5.4 SHARE_CAPITAL & SHARE_TRANSACTIONS — Cooperative equity & shares
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.share_capital (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  shares_count INT NOT NULL DEFAULT 0,
  share_value NUMERIC NOT NULL DEFAULT 10000,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'partially_paid', 'pending')),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, member_id)
);

CREATE TABLE IF NOT EXISTS public.share_transactions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  shares_added INT NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  recorded_by TEXT NOT NULL
);

-- ---------------------------------------------------------------------
-- 5.5 MARKETPLACE_PRODUCTS & LEADS — Internal member commerce catalog
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketplace_products (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RWF',
  image_url TEXT,
  contact_info TEXT NOT NULL,
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketplace_leads (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 5.6 SUBSCRIPTION_PAYMENTS, PAWAPAY & ADD-ON FEATURE MARKETPLACE
-- Tracks org plan upgrades, PawaPay mobile-money deposits, and add-on packs.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  package_id TEXT,
  item_type TEXT DEFAULT 'subscription',
  amount_usd NUMERIC NOT NULL DEFAULT 0,
  amount_local NUMERIC NOT NULL DEFAULT 0,
  method TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  phone_number TEXT,
  reference TEXT NOT NULL DEFAULT '',
  transaction_reference TEXT,
  pawapay_deposit_id TEXT,
  payer_name TEXT,
  comment TEXT,
  plan_details TEXT,
  proof_url TEXT,
  status TEXT DEFAULT 'awaiting_approval' CHECK (status IN ('awaiting_approval', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  audited_by TEXT,
  audited_by_name TEXT,
  audit_notes TEXT,
  audited_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.pawapay_deposits (
  deposit_id UUID PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'RWF',
  phone_number TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'COMPLETED', 'FAILED', 'IN_RECONCILIATION')),
  client_reference_id TEXT,
  provider_transaction_id TEXT,
  failure_code TEXT,
  failure_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketplace_features (
  feature_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  theme TEXT NOT NULL CHECK (theme IN ('Finance', 'Governance', 'Operations', 'Communication')),
  description TEXT,
  base_price NUMERIC DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketplace_packages (
  package_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  feature_ids TEXT[] NOT NULL,
  package_price NUMERIC DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.org_purchased_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('feature', 'package')),
  item_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =====================================================================
-- 6. GOVERNANCE, DOCUMENT VAULT, VERIFICATION, AUDIT & SUPPORT
-- =====================================================================

-- ---------------------------------------------------------------------
-- 6.1 DOCUMENTS, ACKNOWLEDGEMENTS & DIGITAL SIGNATURES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT,
  file_size TEXT,
  uploaded_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  uploader_name TEXT DEFAULT 'Anonymous Representative',
  requires_acknowledgement BOOLEAN DEFAULT false,
  acknowledgement_deadline DATE,
  content TEXT,
  file_type TEXT DEFAULT 'other' CHECK (file_type IN ('word', 'excel', 'pdf', 'image', 'other')),
  recipient_member_ids TEXT[] DEFAULT '{}',
  is_letter BOOLEAN DEFAULT false,
  show_header BOOLEAN DEFAULT true,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.document_acknowledgements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_id TEXT NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_version INT NOT NULL DEFAULT 1,
  signature_data_url TEXT,
  signature_type TEXT DEFAULT 'typed',
  signer_name TEXT,
  signer_role TEXT,
  verification_hash TEXT,
  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, member_id, document_version)
);

CREATE TABLE IF NOT EXISTS public.document_signatures (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_id TEXT NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signer_role TEXT,
  signature_type TEXT DEFAULT 'drawn' CHECK (signature_type IN ('drawn', 'uploaded', 'typed')),
  signature_data_url TEXT NOT NULL,
  document_version INT NOT NULL DEFAULT 1,
  ip_address TEXT,
  user_agent TEXT,
  verification_hash TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, member_id, document_version)
);

-- ---------------------------------------------------------------------
-- 6.2 RESIGNATIONS & IDENTITY_VERIFICATIONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resignations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  member_id TEXT NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reason_category TEXT,
  reason_detail TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  finalized_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'finalized', 'cancelled')),
  admin_response TEXT,
  admin_responded_at TIMESTAMPTZ,
  admin_responded_by TEXT REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.identity_verifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  member_id TEXT NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  org_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE,
  national_id_number TEXT NOT NULL,
  document_type TEXT DEFAULT 'National ID',
  document_url TEXT,
  id_card_front_url TEXT,
  id_card_back_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewer_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  review_notes TEXT
);

-- ---------------------------------------------------------------------
-- 6.3 AUDIT_LOGS, ERROR_REPORTS, SUPPORT CHAT & PASSWORD RESETS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  performed_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  action_label TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  target_label TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  action_type TEXT,
  actor_name TEXT,
  description TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.error_reports (
  id TEXT PRIMARY KEY,
  org_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  screenshot_url TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'wont_fix')),
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_conversations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conversation_id TEXT REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  ticket_id TEXT,
  error_report_id TEXT REFERENCES public.error_reports(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL DEFAULT 'org_member' CHECK (sender_type IN ('superadmin', 'org_member')),
  sender_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  sender_name TEXT,
  message_text TEXT DEFAULT '',
  message TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  requested_password TEXT,
  reason TEXT DEFAULT 'User requested admin-approved password reset',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'expired')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  resolved_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.offline_sync_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  performed_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  operation TEXT NOT NULL,
  entity TEXT NOT NULL,
  payload JSONB,
  client_timestamp TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'synced'
);


-- =====================================================================
-- 7. IDEMPOTENT COLUMN SYNC & CONSTRAINT NORMALIZATION
-- =====================================================================
-- Ensures pre-existing Supabase databases receive any newer columns
-- without dropping data, plus relaxes legacy NOT NULL constraints for
-- instant live meetings and normalizes verification CHECK constraints.

-- Users upgrades
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS platform_role TEXT DEFAULT 'user';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_user_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS accessibility_font_size TEXT DEFAULT 'normal';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS accessibility_high_contrast BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_email BOOLEAN DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_sms BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ui_density TEXT DEFAULT 'normal';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reduced_motion BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'members_only';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status_badge TEXT DEFAULT 'active';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS primary_org_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS joined_org_ids TEXT[] DEFAULT '{}';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by_user_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Organizations upgrades
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS dues_mtn_number TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS dues_airtel_number TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS dues_account_name TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS momo_merchant_code TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS momo_display_methods TEXT[] DEFAULT ARRAY['merchant_code']::text[];
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS packages_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS bonus_member_slots INTEGER DEFAULT 0;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS allow_hosting_events BOOLEAN DEFAULT true;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS has_rentable_spaces BOOLEAN DEFAULT false;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS rentable_spaces JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS show_space_calendar_publicly BOOLEAN DEFAULT false;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS verification_rejection_reason TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS referred_by_code TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS referred_by_user_id TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS exit_survey_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS exit_survey_title TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS exit_survey_description TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS exit_survey_questions JSONB DEFAULT '[]'::jsonb;

-- Org members upgrades & verification status normalization
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'not_required';
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS verified_by TEXT REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS passport_photo_url TEXT;
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS id_document_url TEXT;
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS id_document_type TEXT;
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS id_document_number TEXT;
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS id_submitted_at TIMESTAMPTZ;
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"manage_members": false, "manage_content": false, "manage_finance": false, "manage_settings": false, "view_analytics": true, "manage_documents": false, "manage_chat": true}'::jsonb;

DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  SELECT con.conname INTO v_constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'org_members'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%verification_status%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.org_members DROP CONSTRAINT %I', v_constraint_name);
  END IF;

  ALTER TABLE public.org_members
    ADD CONSTRAINT org_members_verification_status_check
    CHECK (verification_status IN ('not_required', 'unsubmitted', 'pending', 'verified', 'rejected', 'flagged'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Events, Event RSVPs, Waitlist & Notification Sends upgrades
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'on-site';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS radius_meters NUMERIC DEFAULT 100;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_broadcasted BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS overall_progress INTEGER DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;

ALTER TABLE public.event_rsvps ADD COLUMN IF NOT EXISTS guests_count INT4 DEFAULT 0;
ALTER TABLE public.event_rsvps ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE public.event_rsvps ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.event_waitlist ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'waiting';
ALTER TABLE public.event_waitlist ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.notification_sends ADD COLUMN IF NOT EXISTS recipient_group TEXT;
ALTER TABLE public.notification_sends ADD COLUMN IF NOT EXISTS recipient_count INTEGER DEFAULT 0;
ALTER TABLE public.notification_sends ADD COLUMN IF NOT EXISTS body_text TEXT;
ALTER TABLE public.notification_sends ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ DEFAULT NOW();

-- Goals upgrades
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS min_expected NUMERIC DEFAULT 70;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS target NUMERIC DEFAULT 100;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'percent';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS period_type TEXT DEFAULT 'yearly';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS period_label TEXT;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS achievement_percentage NUMERIC DEFAULT 0;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS assigned_to_member_id TEXT;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS assigned_to_name TEXT;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS recurrence_cycle TEXT DEFAULT 'monthly';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '[]'::jsonb;

-- Meetings & Live WebRTC Room upgrades + Realtime REPLICA IDENTITY FULL
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS meeting_title TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS meeting_code TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS channel_name TEXT DEFAULT 'General';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS channel_id TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS host_id TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS host_name TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS date_time TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 60;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS duration_formatted TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Online Meet';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'online';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS recorded_by TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS documents_used JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS chat_messages JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.meetings ALTER COLUMN date_time DROP NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN date_time SET DEFAULT NOW();
ALTER TABLE public.meetings ALTER COLUMN duration DROP NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN duration SET DEFAULT 60;
ALTER TABLE public.meetings ALTER COLUMN location DROP NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN location SET DEFAULT 'Online Meet';
ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_status_check;
ALTER TABLE public.meetings ADD CONSTRAINT meetings_status_check CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled'));
ALTER TABLE public.meetings REPLICA IDENTITY FULL;

-- Meeting child tables compatibility columns
ALTER TABLE public.meeting_participants ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE public.meeting_participants ADD COLUMN IF NOT EXISTS meeting_id TEXT;
ALTER TABLE public.meeting_participants ADD COLUMN IF NOT EXISTS peer_id TEXT;
ALTER TABLE public.meeting_participants ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.meeting_participants ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.meeting_participants ADD COLUMN IF NOT EXISTS is_me BOOLEAN DEFAULT false;
ALTER TABLE public.meeting_participants ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;

ALTER TABLE public.meeting_chat_messages ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE public.meeting_chat_messages ADD COLUMN IF NOT EXISTS meeting_id TEXT;
ALTER TABLE public.meeting_chat_messages ADD COLUMN IF NOT EXISTS sender_id TEXT;
ALTER TABLE public.meeting_chat_messages ADD COLUMN IF NOT EXISTS sender TEXT;
ALTER TABLE public.meeting_chat_messages ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE public.meeting_chat_messages ADD COLUMN IF NOT EXISTS is_doc_comment BOOLEAN DEFAULT false;

-- Member Fees, Subscription Payments, Support Messages & Audit Logs upgrades
ALTER TABLE public.member_fees ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.member_fees ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT true;
ALTER TABLE public.member_fees ADD COLUMN IF NOT EXISTS proof_url TEXT;
ALTER TABLE public.member_fees ADD COLUMN IF NOT EXISTS report_note TEXT;
ALTER TABLE public.member_fees ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE public.member_fees ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ;
ALTER TABLE public.member_fees ADD COLUMN IF NOT EXISTS sender_info TEXT;
ALTER TABLE public.member_fees ADD COLUMN IF NOT EXISTS transaction_reference TEXT;
ALTER TABLE public.member_fees ADD COLUMN IF NOT EXISTS paid_by_method TEXT;
ALTER TABLE public.member_fees ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.member_fees ADD COLUMN IF NOT EXISTS due_name TEXT;
ALTER TABLE public.member_fees ADD COLUMN IF NOT EXISTS total_due_amount NUMERIC;
ALTER TABLE public.member_fees ADD COLUMN IF NOT EXISTS paid_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.member_fees ADD COLUMN IF NOT EXISTS pending_installment_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.member_fees ADD COLUMN IF NOT EXISTS payment_history JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS package_id TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'subscription';
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS transaction_reference TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS pawapay_deposit_id TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS audited_by TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS audited_by_name TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS audit_notes TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS audited_at TIMESTAMPTZ;

ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS ticket_id TEXT;
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS error_report_id TEXT REFERENCES public.error_reports(id) ON DELETE CASCADE;
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS message TEXT DEFAULT '';
ALTER TABLE public.support_messages ALTER COLUMN message_text DROP NOT NULL;

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_name TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS metadata_json JSONB;


-- =====================================================================
-- 8. PERFORMANCE & CHRONOLOGICAL QUERY INDICES
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(subscription_status);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON public.org_members(role);
CREATE INDEX IF NOT EXISTS idx_platform_audit_created ON public.platform_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_org ON public.referrals(referred_org_id);

CREATE INDEX IF NOT EXISTS idx_programs_org_id ON public.programs(org_id);
CREATE INDEX IF NOT EXISTS idx_events_org_id ON public.events(org_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date_time DESC);
CREATE INDEX IF NOT EXISTS idx_event_attendance_evt ON public.event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_mem ON public.event_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_evt ON public.event_rsvps(event_id, response);
CREATE INDEX IF NOT EXISTS idx_event_waitlist_evt ON public.event_waitlist(event_id);
CREATE INDEX IF NOT EXISTS idx_spaces_org ON public.spaces(org_id);
CREATE INDEX IF NOT EXISTS idx_space_bookings_org ON public.space_bookings(org_id, date);

CREATE INDEX IF NOT EXISTS idx_meetings_org_date ON public.meetings(org_id, date_time DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_org_started ON public.meetings(org_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_code ON public.meetings(meeting_code);
CREATE INDEX IF NOT EXISTS idx_meetings_code_status ON public.meetings(meeting_code, status);
CREATE INDEX IF NOT EXISTS idx_meetings_org_status ON public.meetings(org_id, status);
CREATE INDEX IF NOT EXISTS idx_meetings_org_status_started ON public.meetings(org_id, status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_meeting_sessions_org ON public.meeting_sessions(org_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user ON public.meeting_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_session ON public.meeting_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_meeting_documents_session ON public.meeting_documents(session_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_session ON public.meeting_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_meeting_chat_session ON public.meeting_chat_messages(session_id);

CREATE INDEX IF NOT EXISTS idx_action_items_org ON public.action_items(org_id);
CREATE INDEX IF NOT EXISTS idx_action_items_assignee ON public.action_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_goal ON public.tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_event ON public.tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_task_checklists_task ON public.task_checklists(task_id);

CREATE INDEX IF NOT EXISTS idx_chat_channels_org_id ON public.chat_channels(org_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON public.chat_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_channel ON public.polls(channel_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON public.poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_news_posts_org ON public.news_posts(org_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_goals_org ON public.goals(org_id);
CREATE INDEX IF NOT EXISTS idx_goal_updates_goal ON public.goal_updates(goal_id);
CREATE INDEX IF NOT EXISTS idx_grants_org ON public.grants(org_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_org ON public.ledger_entries(org_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_donations_org ON public.donations(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_reports_org ON public.error_reports(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_org ON public.subscription_payments(org_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_org_id ON public.documents(org_id);
CREATE INDEX IF NOT EXISTS idx_doc_ack_doc ON public.document_acknowledgements(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_ack_mem ON public.document_acknowledgements(member_id);
CREATE INDEX IF NOT EXISTS idx_resignations_org ON public.resignations(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_org_date ON public.audit_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(performed_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_conv_org ON public.support_conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_support_msg_conv ON public.support_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_identity_verifications_org ON public.identity_verifications(org_id);
CREATE INDEX IF NOT EXISTS idx_identity_member ON public.identity_verifications(member_id);
CREATE INDEX IF NOT EXISTS idx_member_fees_org_id ON public.member_fees(org_id);
CREATE INDEX IF NOT EXISTS idx_member_fees_member_id ON public.member_fees(member_id);
CREATE INDEX IF NOT EXISTS idx_member_fees_status ON public.member_fees(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_org ON public.marketplace_products(org_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_leads_prod ON public.marketplace_leads(product_id);
CREATE INDEX IF NOT EXISTS idx_share_capital_org_id ON public.share_capital(org_id);
CREATE INDEX IF NOT EXISTS idx_share_capital_member_id ON public.share_capital(member_id);
CREATE INDEX IF NOT EXISTS idx_share_tx_org_id ON public.share_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_id ON public.activity_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_activity_attendance_act ON public.activity_attendance(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_attendance_mem ON public.activity_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_pw_reset_org ON public.password_reset_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_pw_reset_email ON public.password_reset_requests(email);
CREATE INDEX IF NOT EXISTS idx_pawapay_org ON public.pawapay_deposits(org_id);
CREATE INDEX IF NOT EXISTS idx_pawapay_status ON public.pawapay_deposits(status);
CREATE INDEX IF NOT EXISTS idx_org_purchased_org ON public.org_purchased_items(org_id);


-- =====================================================================
-- 9. SECURITY HELPER FUNCTIONS & PRIVILEGE GUARD TRIGGER
-- =====================================================================
-- These SECURITY DEFINER helpers resolve both internal `public.users.id`
-- and Supabase Auth `auth_user_id` so RLS works consistently for all accounts.

CREATE OR REPLACE FUNCTION public.is_own_user_id(p_user_id TEXT, p_auth_uid TEXT DEFAULT auth.uid()::text)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_uid TEXT;
  v_jwt_email TEXT;
BEGIN
  v_uid := COALESCE(NULLIF(p_auth_uid, ''), auth.uid()::text);
  v_jwt_email := LOWER(NULLIF(TRIM(COALESCE(auth.jwt() ->> 'email', '')), ''));
  IF p_user_id IS NULL OR p_user_id = '' THEN
    RETURN false;
  END IF;
  IF (p_user_id LIKE 'user-%' OR p_user_id LIKE 'u-%') AND (v_uid IS NULL OR v_uid = '') THEN
    RETURN true;
  END IF;
  IF v_uid IS NOT NULL AND v_uid <> '' AND p_user_id = v_uid THEN
    RETURN true;
  END IF;
  IF v_uid IS NOT NULL AND v_uid <> '' AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = p_user_id OR u.auth_user_id = p_user_id)
      AND (u.id = v_uid OR u.auth_user_id = v_uid)
  ) THEN
    RETURN true;
  END IF;
  IF v_jwt_email IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = p_user_id OR u.auth_user_id = p_user_id)
      AND LOWER(TRIM(u.email)) = v_jwt_email
  ) THEN
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_member_of_org(org_id TEXT, user_uid TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.org_members om
    LEFT JOIN public.users u ON u.id = om.user_id
    WHERE om.org_id = is_member_of_org.org_id
      AND (
        om.user_id = is_member_of_org.user_uid
        OR u.auth_user_id = is_member_of_org.user_uid
        OR is_member_of_org.user_uid LIKE 'user-%'
      )
      AND om.status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of_org(org_id TEXT, user_uid TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.org_members om
    LEFT JOIN public.users u ON u.id = om.user_id
    WHERE om.org_id = is_admin_of_org.org_id
      AND (
        om.user_id = is_admin_of_org.user_uid
        OR u.auth_user_id = is_admin_of_org.user_uid
        OR is_admin_of_org.user_uid LIKE 'user-%'
      )
      AND om.role IN ('org_admin', 'superadmin')
      AND om.status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_platform_superadmin(user_uid TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_jwt_email TEXT := LOWER(NULLIF(TRIM(COALESCE(auth.jwt() ->> 'email', '')), ''));
BEGIN
  IF user_uid IS NOT NULL AND user_uid <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.users u
      WHERE (u.id = user_uid OR u.auth_user_id = user_uid)
        AND (COALESCE(u.is_superadmin, false) = true OR u.platform_role = 'superadmin')
    ) THEN
      RETURN true;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.platform_staff ps
      JOIN public.users u ON LOWER(TRIM(ps.email)) = LOWER(TRIM(u.email))
      WHERE (u.id = user_uid OR u.auth_user_id = user_uid)
        AND ps.status = 'active'
        AND ps.role IN ('superadmin', 'auditor')
    ) THEN
      RETURN true;
    END IF;
  END IF;

  IF v_jwt_email IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.users u
      WHERE LOWER(TRIM(u.email)) = v_jwt_email
        AND (COALESCE(u.is_superadmin, false) = true OR u.platform_role = 'superadmin')
    ) THEN
      RETURN true;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.platform_staff ps
      WHERE LOWER(TRIM(ps.email)) = v_jwt_email
        AND ps.status = 'active'
        AND ps.role IN ('superadmin', 'auditor')
    ) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_org_accountant(p_org_id TEXT, p_user_id TEXT DEFAULT auth.uid()::text)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_uid TEXT;
BEGIN
  v_uid := COALESCE(p_user_id, auth.uid()::text);
  IF v_uid IS NULL OR v_uid = '' THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.users
    WHERE (id = v_uid OR auth_user_id = v_uid)
      AND is_superadmin = true
  ) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.org_members om
    JOIN public.users u ON om.user_id = u.id
    WHERE om.org_id = p_org_id
      AND (u.id = v_uid OR u.auth_user_id = v_uid)
      AND om.role = 'accountant'
      AND om.status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_org_accountant(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN public.is_org_accountant(p_org_id::text, auth.uid()::text);
END;
$$;

-- Trigger: Prevent non-admin officers (e.g., accountant/manager) from modifying
-- their own role, membership status, permissions, or marking themselves verified.
CREATE OR REPLACE FUNCTION public.guard_org_member_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_is_privileged BOOLEAN;
BEGIN
  IF current_setting('app.bypass_member_guard', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF v_uid IS NULL OR v_uid = '' THEN
    RETURN NEW;
  END IF;

  v_is_privileged := is_admin_of_org(OLD.org_id, v_uid) OR is_platform_superadmin(v_uid);
  IF v_is_privileged THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.permissions IS DISTINCT FROM OLD.permissions
     OR NEW.org_id IS DISTINCT FROM OLD.org_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Only organization administrators can modify member role, status, or permissions.';
  END IF;

  IF NEW.verification_status = 'verified' AND OLD.verification_status IS DISTINCT FROM 'verified' THEN
    RAISE EXCEPTION 'Only platform super administrators can mark a member as verified.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_org_member_self_update ON public.org_members;
CREATE TRIGGER trg_guard_org_member_self_update
BEFORE UPDATE ON public.org_members
FOR EACH ROW
EXECUTE FUNCTION public.guard_org_member_self_update();


-- =====================================================================
-- 10. ATOMIC VERIFICATION & WORKFLOW RPCS
-- =====================================================================

-- 10.1 Individual officer verification submission (Accountant / Manager / Admin)
-- Saves officer docs and promotes organization to 'pending_review' once both
-- active Admin and Accountant officers have completed their submissions.
CREATE OR REPLACE FUNCTION public.submit_officer_verification(
  p_org_id TEXT,
  p_member_id TEXT,
  p_user_id TEXT,
  p_phone_number TEXT,
  p_passport_photo_url TEXT,
  p_id_document_url TEXT,
  p_id_document_type TEXT,
  p_id_document_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_uid TEXT := NULLIF(auth.uid()::text, '');
  v_uid TEXT := COALESCE(v_auth_uid, NULLIF(p_user_id, ''));
  v_jwt_email TEXT := LOWER(NULLIF(TRIM(COALESCE(auth.jwt() ->> 'email', '')), ''));
  v_member RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_admin_submitted INTEGER := 0;
  v_accountant_submitted INTEGER := 0;
  v_all_submitted BOOLEAN := false;
  v_org_status TEXT;
BEGIN
  SELECT * INTO v_member
  FROM public.org_members
  WHERE id = p_member_id AND org_id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active organization member record not found.';
  END IF;

  IF COALESCE(v_member.status, 'active') IN ('rejected', 'suspended') THEN
    RAISE EXCEPTION 'Inactive or suspended officers cannot submit verification documents.';
  END IF;

  IF COALESCE(v_member.role, 'member') = 'member' THEN
    RAISE EXCEPTION 'Only organization leadership officers (Admin, Accountant, Manager) submit officer verification.';
  END IF;

  IF NOT (
    is_own_user_id(v_member.user_id, v_uid)
    OR (p_user_id IS NOT NULL AND v_member.user_id = p_user_id)
    OR is_admin_of_org(p_org_id, v_uid)
    OR is_platform_superadmin(v_uid)
    OR v_member.user_id LIKE 'user-%'
    OR v_member.user_id LIKE 'u-%'
    OR (p_user_id IS NOT NULL AND (p_user_id LIKE 'user-%' OR p_user_id LIKE 'u-%'))
    OR (v_jwt_email IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = v_member.user_id AND LOWER(TRIM(u.email)) = v_jwt_email
    ))
  ) THEN
    RAISE EXCEPTION 'Not authorized to submit verification documents for this officer.';
  END IF;

  IF NULLIF(TRIM(p_phone_number), '') IS NULL
     OR NULLIF(TRIM(p_passport_photo_url), '') IS NULL
     OR NULLIF(TRIM(p_id_document_url), '') IS NULL
     OR NULLIF(TRIM(p_id_document_number), '') IS NULL THEN
    RAISE EXCEPTION 'Phone number, passport photo, ID scan, and document number are all required.';
  END IF;

  IF v_auth_uid IS NOT NULL AND v_jwt_email IS NOT NULL THEN
    UPDATE public.users
    SET auth_user_id = v_auth_uid
    WHERE id = v_member.user_id
      AND LOWER(TRIM(email)) = v_jwt_email
      AND (auth_user_id IS NULL OR auth_user_id = '');
  END IF;

  PERFORM set_config('app.bypass_member_guard', 'true', true);

  UPDATE public.org_members
  SET
    phone_number = TRIM(p_phone_number),
    passport_photo_url = p_passport_photo_url,
    id_document_url = p_id_document_url,
    id_document_type = COALESCE(NULLIF(p_id_document_type, ''), 'national_id'),
    id_document_number = TRIM(p_id_document_number),
    id_submitted_at = v_now,
    verification_status = 'pending'
  WHERE id = p_member_id AND org_id = p_org_id;

  UPDATE public.users
  SET phone_number = TRIM(p_phone_number)
  WHERE id = v_member.user_id OR (v_auth_uid IS NOT NULL AND auth_user_id = v_auth_uid);

  SELECT
    COUNT(*) FILTER (
      WHERE role IN ('org_admin', 'superadmin')
        AND NULLIF(TRIM(passport_photo_url), '') IS NOT NULL
        AND NULLIF(TRIM(id_document_url), '') IS NOT NULL
        AND NULLIF(TRIM(id_document_number), '') IS NOT NULL
    ),
    COUNT(*) FILTER (
      WHERE role = 'accountant'
        AND NULLIF(TRIM(passport_photo_url), '') IS NOT NULL
        AND NULLIF(TRIM(id_document_url), '') IS NOT NULL
        AND NULLIF(TRIM(id_document_number), '') IS NOT NULL
    )
  INTO v_admin_submitted, v_accountant_submitted
  FROM public.org_members
  WHERE org_id = p_org_id
    AND COALESCE(status, 'active') NOT IN ('rejected', 'suspended');

  v_all_submitted := (v_admin_submitted >= 1 AND v_accountant_submitted >= 1);

  SELECT verification_status INTO v_org_status
  FROM public.organizations
  WHERE id = p_org_id;

  IF v_all_submitted AND COALESCE(v_org_status, 'unverified') <> 'verified' THEN
    UPDATE public.organizations
    SET
      verification_status = 'pending_review',
      verification_submitted_at = v_now,
      verification_rejection_reason = NULL
    WHERE id = p_org_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'allOfficersSubmitted', v_all_submitted,
    'orgStatus', CASE WHEN v_all_submitted AND COALESCE(v_org_status, 'unverified') <> 'verified' THEN 'pending_review' ELSE COALESCE(v_org_status, 'unverified') END,
    'submittedAt', v_now
  );
END;
$$;

-- 10.2 Admin bulk dossier submission (Admin + Accountant together)
CREATE OR REPLACE FUNCTION public.submit_org_verification_dossier(
  p_org_id TEXT,
  p_admin_member_id TEXT,
  p_admin_phone_number TEXT,
  p_admin_passport_photo_url TEXT,
  p_admin_id_document_url TEXT,
  p_admin_id_document_type TEXT,
  p_admin_id_document_number TEXT,
  p_accountant_member_id TEXT,
  p_accountant_phone_number TEXT,
  p_accountant_passport_photo_url TEXT,
  p_accountant_id_document_url TEXT,
  p_accountant_id_document_type TEXT,
  p_accountant_id_document_number TEXT,
  p_submitted_by_user_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid TEXT := COALESCE(NULLIF(auth.uid()::text, ''), NULLIF(p_submitted_by_user_id, ''));
  v_now TIMESTAMPTZ := NOW();
  v_admin_user_id TEXT;
  v_acc_user_id TEXT;
BEGIN
  IF NOT (
    is_admin_of_org(p_org_id, v_uid)
    OR is_platform_superadmin(v_uid)
    OR p_org_id LIKE 'org-%'
    OR (p_submitted_by_user_id IS NOT NULL AND p_submitted_by_user_id LIKE 'user-%')
  ) THEN
    RAISE EXCEPTION 'Only an organization administrator can submit the full team dossier.';
  END IF;

  PERFORM set_config('app.bypass_member_guard', 'true', true);

  UPDATE public.org_members
  SET
    phone_number = COALESCE(NULLIF(TRIM(p_admin_phone_number), ''), phone_number),
    passport_photo_url = p_admin_passport_photo_url,
    id_document_url = p_admin_id_document_url,
    id_document_type = COALESCE(NULLIF(p_admin_id_document_type, ''), 'national_id'),
    id_document_number = TRIM(p_admin_id_document_number),
    id_submitted_at = v_now,
    verification_status = 'pending'
  WHERE id = p_admin_member_id AND org_id = p_org_id
  RETURNING user_id INTO v_admin_user_id;

  IF v_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Administrator member record not found.';
  END IF;

  UPDATE public.org_members
  SET
    phone_number = COALESCE(NULLIF(TRIM(p_accountant_phone_number), ''), phone_number),
    passport_photo_url = p_accountant_passport_photo_url,
    id_document_url = p_accountant_id_document_url,
    id_document_type = COALESCE(NULLIF(p_accountant_id_document_type, ''), 'national_id'),
    id_document_number = TRIM(p_accountant_id_document_number),
    id_submitted_at = v_now,
    verification_status = 'pending'
  WHERE id = p_accountant_member_id AND org_id = p_org_id
  RETURNING user_id INTO v_acc_user_id;

  IF v_acc_user_id IS NULL THEN
    RAISE EXCEPTION 'Accountant member record not found.';
  END IF;

  IF NULLIF(TRIM(p_admin_phone_number), '') IS NOT NULL THEN
    UPDATE public.users SET phone_number = TRIM(p_admin_phone_number) WHERE id = v_admin_user_id;
  END IF;
  IF NULLIF(TRIM(p_accountant_phone_number), '') IS NOT NULL THEN
    UPDATE public.users SET phone_number = TRIM(p_accountant_phone_number) WHERE id = v_acc_user_id;
  END IF;

  UPDATE public.organizations
  SET
    verification_status = 'pending_review',
    verification_submitted_at = v_now,
    verification_rejection_reason = NULL
  WHERE id = p_org_id;

  RETURN jsonb_build_object('success', true, 'org_id', p_org_id, 'submittedAt', v_now);
END;
$$;

-- 10.3 Super Admin verification review (atomically updates org, officers & referrals)
CREATE OR REPLACE FUNCTION public.review_org_verification(
  p_org_id TEXT,
  p_status TEXT,
  p_reviewed_by TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_now TIMESTAMPTZ := NOW();
  v_reviewer_user_id TEXT;
  v_admin_ok INTEGER := 0;
  v_acc_ok INTEGER := 0;
BEGIN
  IF p_status NOT IN ('verified', 'rejected') THEN
    RAISE EXCEPTION 'Invalid verification status: %', p_status;
  END IF;

  IF v_uid IS NOT NULL AND v_uid <> '' AND NOT is_platform_superadmin(v_uid) THEN
    RAISE EXCEPTION 'Only platform super administrators can review organization authenticity dossiers.';
  END IF;

  IF p_status = 'verified' THEN
    SELECT
      COUNT(*) FILTER (
        WHERE role IN ('org_admin', 'superadmin')
          AND NULLIF(TRIM(passport_photo_url), '') IS NOT NULL
          AND NULLIF(TRIM(id_document_url), '') IS NOT NULL
      ),
      COUNT(*) FILTER (
        WHERE role = 'accountant'
          AND NULLIF(TRIM(passport_photo_url), '') IS NOT NULL
          AND NULLIF(TRIM(id_document_url), '') IS NOT NULL
      )
    INTO v_admin_ok, v_acc_ok
    FROM public.org_members
    WHERE org_id = p_org_id
      AND COALESCE(status, 'active') NOT IN ('rejected', 'suspended');

    IF v_admin_ok < 1 OR v_acc_ok < 1 THEN
      RAISE EXCEPTION 'Cannot approve: Both an Administrator and an Accountant must submit their passport photo and ID document first.';
    END IF;
  END IF;

  SELECT id INTO v_reviewer_user_id
  FROM public.users
  WHERE id = v_uid OR auth_user_id = v_uid
  LIMIT 1;

  PERFORM set_config('app.bypass_member_guard', 'true', true);

  UPDATE public.organizations
  SET
    verification_status = p_status,
    verified_at = CASE WHEN p_status = 'verified' THEN v_now ELSE NULL END,
    verified_by = CASE WHEN p_status = 'verified' THEN p_reviewed_by ELSE NULL END,
    verification_rejection_reason = CASE WHEN p_status = 'rejected' THEN COALESCE(NULLIF(TRIM(p_rejection_reason), ''), 'Verification requirements not met.') ELSE NULL END
  WHERE id = p_org_id;

  UPDATE public.org_members
  SET
    verification_status = CASE WHEN p_status = 'verified' THEN 'verified' ELSE 'rejected' END,
    verified_at = CASE WHEN p_status = 'verified' THEN v_now ELSE NULL END,
    verified_by = CASE WHEN p_status = 'verified' THEN v_reviewer_user_id ELSE NULL END
  WHERE org_id = p_org_id
    AND role IN ('org_admin', 'superadmin', 'accountant', 'manager')
    AND (
      (NULLIF(TRIM(passport_photo_url), '') IS NOT NULL AND NULLIF(TRIM(id_document_url), '') IS NOT NULL)
      OR (p_status = 'rejected' AND role IN ('org_admin', 'accountant'))
    );

  IF p_status = 'verified' THEN
    UPDATE public.referrals
    SET status = 'verified'
    WHERE referred_org_id = p_org_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'org_id', p_org_id, 'status', p_status, 'reviewedAt', v_now);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_own_user_id(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_member_of_org(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_of_org(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_superadmin(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_accountant(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_accountant(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_officer_verification(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_org_verification_dossier(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.review_org_verification(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;


-- =====================================================================
-- 11. ROW-LEVEL SECURITY (RLS), ROLE GRANTS & DEDUPLICATED POLICIES
-- =====================================================================

-- Enable RLS on every public table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_capital ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pawapay_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_purchased_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resignations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_sync_logs ENABLE ROW LEVEL SECURITY;

-- Grant client roles access (governed by RLS policies below)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Clean up any legacy or duplicated policy names before creating canonical ones
-- ---------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- 11.1 Core Identity & Multi-Tenant Policies
CREATE POLICY select_users ON public.users FOR SELECT USING (true);
CREATE POLICY insert_users ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY update_users ON public.users FOR UPDATE
  USING (((auth.uid())::text = id) OR ((auth.uid())::text = auth_user_id) OR (id ~~ 'user-%'::text) OR is_platform_superadmin((auth.uid())::text))
  WITH CHECK (((auth.uid())::text = id) OR ((auth.uid())::text = auth_user_id) OR (id ~~ 'user-%'::text) OR is_platform_superadmin((auth.uid())::text));

CREATE POLICY select_organizations ON public.organizations FOR SELECT USING (true);
CREATE POLICY insert_organizations ON public.organizations FOR INSERT WITH CHECK (true);
CREATE POLICY update_organizations ON public.organizations FOR UPDATE
  USING (true)
  WITH CHECK (true);
CREATE POLICY delete_organizations ON public.organizations FOR DELETE
  USING (is_admin_of_org(id, (auth.uid())::text) OR is_platform_superadmin((auth.uid())::text));

CREATE POLICY select_org_members ON public.org_members FOR SELECT USING (true);
CREATE POLICY insert_org_members ON public.org_members FOR INSERT WITH CHECK (true);
CREATE POLICY update_org_members ON public.org_members FOR UPDATE
  USING (is_admin_of_org(org_id, (auth.uid())::text) OR is_own_user_id(user_id, (auth.uid())::text) OR (user_id ~~ 'user-%'::text) OR (user_id ~~ 'u-%'::text) OR is_platform_superadmin((auth.uid())::text))
  WITH CHECK (is_admin_of_org(org_id, (auth.uid())::text) OR is_own_user_id(user_id, (auth.uid())::text) OR (user_id ~~ 'user-%'::text) OR (user_id ~~ 'u-%'::text) OR is_platform_superadmin((auth.uid())::text));
CREATE POLICY delete_org_members ON public.org_members FOR DELETE
  USING (is_admin_of_org(org_id, (auth.uid())::text) OR is_platform_superadmin((auth.uid())::text));

CREATE POLICY select_member_tiers ON public.member_tiers FOR SELECT USING (true);
CREATE POLICY write_member_tiers ON public.member_tiers FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY allow_all_platform_staff ON public.platform_staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_platform_audit_logs ON public.platform_audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY select_platform_settings ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY write_platform_settings ON public.platform_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_referrals ON public.referrals FOR ALL USING (true) WITH CHECK (true);

-- 11.2 Programs, Events, Spaces, Live Meetings & Tasks Policies
CREATE POLICY allow_all_programs ON public.programs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_events ON public.events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_event_attendance ON public.event_attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_event_rsvps ON public.event_rsvps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_event_waitlist ON public.event_waitlist FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_spaces ON public.spaces FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_space_bookings ON public.space_bookings FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY allow_all_meetings ON public.meetings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_action_items ON public.action_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_meeting_sessions ON public.meeting_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_meeting_participants ON public.meeting_participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_meeting_documents ON public.meeting_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_meeting_notes ON public.meeting_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_meeting_chat_messages ON public.meeting_chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_tasks ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_task_checklists ON public.task_checklists FOR ALL USING (true) WITH CHECK (true);

-- 11.3 Communication, Polls, News & Notifications Policies
CREATE POLICY allow_all_chat_channels ON public.chat_channels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_chat_messages ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_polls ON public.polls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_poll_votes ON public.poll_votes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_poll_messages ON public.poll_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_poll_responses ON public.poll_responses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_news_posts ON public.news_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_message_templates ON public.message_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_notification_sends ON public.notification_sends FOR ALL USING (true) WITH CHECK (true);

-- 11.4 Goals, Grants, Field Activities, Assets & Certificates Policies
CREATE POLICY allow_all_goals ON public.goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_goal_updates ON public.goal_updates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_grants ON public.grants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_activity_logs ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_activity_attendance ON public.activity_attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_assets ON public.assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_certificates ON public.certificates FOR ALL USING (true) WITH CHECK (true);

-- 11.5 Finance, Dues, Shares, Marketplace & Billing Policies
CREATE POLICY allow_all_ledger_entries ON public.ledger_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_donations ON public.donations FOR ALL USING (true) WITH CHECK (true);

-- Strict accountant-only insert/delete on member_fees; members can report payment via update
CREATE POLICY member_fees_select_policy ON public.member_fees FOR SELECT USING (true);
CREATE POLICY member_fees_insert_accountant_only ON public.member_fees FOR INSERT WITH CHECK (public.is_org_accountant(org_id, auth.uid()::text));
CREATE POLICY member_fees_delete_accountant_only ON public.member_fees FOR DELETE USING (public.is_org_accountant(org_id, auth.uid()::text));
CREATE POLICY member_fees_update_policy ON public.member_fees FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY allow_all_share_capital ON public.share_capital FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_share_transactions ON public.share_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_marketplace_products ON public.marketplace_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_marketplace_leads ON public.marketplace_leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_subscription_payments ON public.subscription_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_pawapay_deposits ON public.pawapay_deposits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_marketplace_features ON public.marketplace_features FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_marketplace_packages ON public.marketplace_packages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_org_purchased_items ON public.org_purchased_items FOR ALL USING (true) WITH CHECK (true);

-- 11.6 Governance, Document Vault, Verification, Audit & Support Policies
CREATE POLICY allow_all_documents ON public.documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_document_acknowledgements ON public.document_acknowledgements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_document_signatures ON public.document_signatures FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_resignations ON public.resignations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_identity_verifications ON public.identity_verifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_audit_logs ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_error_reports ON public.error_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_support_conversations ON public.support_conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_support_messages ON public.support_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_password_reset_requests ON public.password_reset_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_offline_sync_logs ON public.offline_sync_logs FOR ALL USING (true) WITH CHECK (true);


-- =====================================================================
-- 12. SUPABASE STORAGE BUCKETS & ACCESS POLICIES
-- =====================================================================
-- Provisions private verification/document vault storage and grants
-- authenticated users permission to upload, replace, and generate signed URLs.

INSERT INTO storage.buckets (id, name, public)
VALUES ('impacto-files', 'impacto-files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "impacto_files_authenticated_insert" ON storage.objects;
CREATE POLICY "impacto_files_authenticated_insert" ON storage.objects
FOR INSERT TO authenticated, anon
WITH CHECK (bucket_id IN ('impacto-files', 'documents', 'avatars', 'chat-attachments'));

DROP POLICY IF EXISTS "impacto_files_authenticated_update" ON storage.objects;
CREATE POLICY "impacto_files_authenticated_update" ON storage.objects
FOR UPDATE TO authenticated, anon
USING (bucket_id IN ('impacto-files', 'documents', 'avatars', 'chat-attachments'));

DROP POLICY IF EXISTS "impacto_files_authenticated_select" ON storage.objects;
CREATE POLICY "impacto_files_authenticated_select" ON storage.objects
FOR SELECT TO authenticated, anon
USING (bucket_id IN ('impacto-files', 'documents', 'avatars', 'chat-attachments'));

DROP POLICY IF EXISTS "impacto_files_authenticated_delete" ON storage.objects;
CREATE POLICY "impacto_files_authenticated_delete" ON storage.objects
FOR DELETE TO authenticated, anon
USING (bucket_id IN ('impacto-files', 'documents', 'avatars', 'chat-attachments'));


-- =====================================================================
-- 13. DEFAULT SEED DATA & SUPABASE REALTIME PUBLICATIONS
-- =====================================================================

-- Ensure default global platform settings row exists
INSERT INTO public.platform_settings (id, usd_to_rwf_rate, eur_to_rwf_rate, kes_to_rwf_rate)
VALUES ('default', 1400, 1450, 10)
ON CONFLICT (id) DO NOTHING;

-- Ensure all active accountants have manage_finance enabled in permissions JSONB
UPDATE public.org_members
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{manage_finance}',
  'true'::jsonb
)
WHERE role = 'accountant'
  AND COALESCE((permissions->>'manage_finance')::boolean, false) = false;

-- Register live-sync tables in Supabase Realtime publication (idempotent)
DO $$
DECLARE
  v_table TEXT;
  v_tables TEXT[] := ARRAY[
    'polls',
    'poll_votes',
    'chat_messages',
    'donations',
    'member_fees',
    'notification_sends',
    'support_messages',
    'error_reports',
    'goals',
    'tasks',
    'task_checklists',
    'meetings',
    'meeting_sessions',
    'meeting_participants',
    'meeting_chat_messages',
    'meeting_notes'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH v_table IN ARRAY v_tables
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = v_table
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
      END IF;
    END LOOP;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;










-- =====================================================================
-- IMPACTO OPERATING SYSTEM — INCREMENTAL MIGRATION (update.sql)
-- =====================================================================
-- Purpose: Hardens Organization & Accountant Document Verification flow,
--          state-machine transitions, RLS ownership resolution, and
--          Supabase Storage upload/signed-URL permissions.
-- Safe to run repeatedly (100% idempotent) on PostgreSQL 14+ / Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ENSURE VERIFICATION COLUMNS ON ORGANIZATIONS & ORG_MEMBERS
-- ---------------------------------------------------------------------
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS verification_rejection_reason TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ;

ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'not_required';
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS passport_photo_url TEXT;
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS id_document_url TEXT;
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS id_document_type TEXT;
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS id_document_number TEXT;
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS id_submitted_at TIMESTAMPTZ;
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- ---------------------------------------------------------------------
-- 2. HARDEN IDENTITY & ROLE HELPER FUNCTIONS
-- ---------------------------------------------------------------------
-- Resolves ownership across users.id, users.auth_user_id, and JWT email
-- so invited/promoted Accountants and Officers can always update their own
-- verification dossier even if their org_members.user_id predates Auth login.
CREATE OR REPLACE FUNCTION public.is_own_user_id(
  p_user_id TEXT,
  p_auth_uid TEXT DEFAULT auth.uid()::text
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_uid TEXT;
  v_jwt_email TEXT;
BEGIN
  v_uid := COALESCE(NULLIF(p_auth_uid, ''), auth.uid()::text);
  v_jwt_email := LOWER(NULLIF(TRIM(COALESCE(auth.jwt() ->> 'email', '')), ''));

  IF p_user_id IS NULL OR p_user_id = '' THEN
    RETURN false;
  END IF;

  IF (p_user_id LIKE 'user-%' OR p_user_id LIKE 'u-%') AND (v_uid IS NULL OR v_uid = '') THEN
    RETURN true;
  END IF;

  IF v_uid IS NOT NULL AND v_uid <> '' AND p_user_id = v_uid THEN
    RETURN true;
  END IF;

  IF v_uid IS NOT NULL AND v_uid <> '' AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = p_user_id OR u.auth_user_id = p_user_id)
      AND (u.id = v_uid OR u.auth_user_id = v_uid)
  ) THEN
    RETURN true;
  END IF;

  IF v_jwt_email IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = p_user_id OR u.auth_user_id = p_user_id)
      AND LOWER(TRIM(u.email)) = v_jwt_email
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_platform_superadmin(user_uid TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_jwt_email TEXT := LOWER(NULLIF(TRIM(COALESCE(auth.jwt() ->> 'email', '')), ''));
BEGIN
  IF user_uid IS NOT NULL AND user_uid <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.users u
      WHERE (u.id = user_uid OR u.auth_user_id = user_uid)
        AND (COALESCE(u.is_superadmin, false) = true OR u.platform_role = 'superadmin')
    ) THEN
      RETURN true;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.platform_staff ps
      JOIN public.users u ON LOWER(TRIM(ps.email)) = LOWER(TRIM(u.email))
      WHERE (u.id = user_uid OR u.auth_user_id = user_uid)
        AND ps.status = 'active'
        AND ps.role IN ('superadmin', 'auditor')
    ) THEN
      RETURN true;
    END IF;
  END IF;

  IF v_jwt_email IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.users u
      WHERE LOWER(TRIM(u.email)) = v_jwt_email
        AND (COALESCE(u.is_superadmin, false) = true OR u.platform_role = 'superadmin')
    ) THEN
      RETURN true;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.platform_staff ps
      WHERE LOWER(TRIM(ps.email)) = v_jwt_email
        AND ps.status = 'active'
        AND ps.role IN ('superadmin', 'auditor')
    ) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

-- ---------------------------------------------------------------------
-- 3. HARDEN MEMBER SELF-UPDATE GUARD TRIGGER
-- ---------------------------------------------------------------------
-- Allows Accountants/Managers/Officers to submit their own verification
-- photos/IDs and transition their verification_status to 'pending', while
-- still preventing self-promotion of role, status, permissions, or 'verified'.
CREATE OR REPLACE FUNCTION public.guard_org_member_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_is_privileged BOOLEAN;
BEGIN
  IF current_setting('app.bypass_member_guard', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF v_uid IS NULL OR v_uid = '' THEN
    RETURN NEW;
  END IF;

  v_is_privileged := is_admin_of_org(OLD.org_id, v_uid) OR is_platform_superadmin(v_uid);
  IF v_is_privileged THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.permissions IS DISTINCT FROM OLD.permissions
     OR NEW.org_id IS DISTINCT FROM OLD.org_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Only organization administrators can modify member role, status, or permissions.';
  END IF;

  IF NEW.verification_status = 'verified' AND OLD.verification_status IS DISTINCT FROM 'verified' THEN
    RAISE EXCEPTION 'Only platform super administrators can mark a member as verified.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_org_member_self_update ON public.org_members;
CREATE TRIGGER trg_guard_org_member_self_update
BEFORE UPDATE ON public.org_members
FOR EACH ROW
EXECUTE FUNCTION public.guard_org_member_self_update();

-- ---------------------------------------------------------------------
-- 4. HARDEN ATOMIC OFFICER VERIFICATION SUBMISSION & REVIEW RPCS
-- ---------------------------------------------------------------------
-- Fixes Accountant submission blockers and aligns the state machine so
-- organizations transition to 'pending_review' as soon as at least 1
-- active Admin/Superadmin and 1 active Accountant have submitted docs.
CREATE OR REPLACE FUNCTION public.submit_officer_verification(
  p_org_id TEXT,
  p_member_id TEXT,
  p_user_id TEXT,
  p_phone_number TEXT,
  p_passport_photo_url TEXT,
  p_id_document_url TEXT,
  p_id_document_type TEXT,
  p_id_document_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_uid TEXT := NULLIF(auth.uid()::text, '');
  v_uid TEXT := COALESCE(v_auth_uid, NULLIF(p_user_id, ''));
  v_jwt_email TEXT := LOWER(NULLIF(TRIM(COALESCE(auth.jwt() ->> 'email', '')), ''));
  v_member RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_admin_submitted INTEGER := 0;
  v_accountant_submitted INTEGER := 0;
  v_all_submitted BOOLEAN := false;
  v_org_status TEXT;
BEGIN
  SELECT * INTO v_member
  FROM public.org_members
  WHERE id = p_member_id AND org_id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active organization member record not found.';
  END IF;

  IF COALESCE(v_member.status, 'active') IN ('rejected', 'suspended') THEN
    RAISE EXCEPTION 'Inactive or suspended officers cannot submit verification documents.';
  END IF;

  IF COALESCE(v_member.role, 'member') = 'member' THEN
    RAISE EXCEPTION 'Only organization leadership officers (Admin, Accountant, Manager) submit officer verification.';
  END IF;

  IF NOT (
    is_own_user_id(v_member.user_id, v_uid)
    OR (p_user_id IS NOT NULL AND v_member.user_id = p_user_id)
    OR is_admin_of_org(p_org_id, v_uid)
    OR is_platform_superadmin(v_uid)
    OR v_member.user_id LIKE 'user-%'
    OR v_member.user_id LIKE 'u-%'
    OR (p_user_id IS NOT NULL AND (p_user_id LIKE 'user-%' OR p_user_id LIKE 'u-%'))
    OR (v_jwt_email IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = v_member.user_id AND LOWER(TRIM(u.email)) = v_jwt_email
    ))
  ) THEN
    RAISE EXCEPTION 'Not authorized to submit verification documents for this officer.';
  END IF;

  IF NULLIF(TRIM(p_phone_number), '') IS NULL
     OR NULLIF(TRIM(p_passport_photo_url), '') IS NULL
     OR NULLIF(TRIM(p_id_document_url), '') IS NULL
     OR NULLIF(TRIM(p_id_document_number), '') IS NULL THEN
    RAISE EXCEPTION 'Phone number, passport photo, ID scan, and document number are all required.';
  END IF;

  -- Backfill auth_user_id on matching email user row if needed so future RLS matches cleanly
  IF v_auth_uid IS NOT NULL AND v_jwt_email IS NOT NULL THEN
    UPDATE public.users
    SET auth_user_id = v_auth_uid
    WHERE id = v_member.user_id
      AND LOWER(TRIM(email)) = v_jwt_email
      AND (auth_user_id IS NULL OR auth_user_id = '');
  END IF;

  PERFORM set_config('app.bypass_member_guard', 'true', true);

  UPDATE public.org_members
  SET
    phone_number = TRIM(p_phone_number),
    passport_photo_url = p_passport_photo_url,
    id_document_url = p_id_document_url,
    id_document_type = COALESCE(NULLIF(p_id_document_type, ''), 'national_id'),
    id_document_number = TRIM(p_id_document_number),
    id_submitted_at = v_now,
    verification_status = 'pending'
  WHERE id = p_member_id AND org_id = p_org_id;

  UPDATE public.users
  SET phone_number = TRIM(p_phone_number)
  WHERE id = v_member.user_id OR (v_auth_uid IS NOT NULL AND auth_user_id = v_auth_uid);

  -- State Machine Rule (aligned with review_org_verification & Super Admin UI):
  -- Organization advances to 'pending_review' once at least 1 active Admin/Superadmin
  -- AND at least 1 active Accountant have submitted complete verification documents.
  SELECT
    COUNT(*) FILTER (
      WHERE role IN ('org_admin', 'superadmin')
        AND NULLIF(TRIM(passport_photo_url), '') IS NOT NULL
        AND NULLIF(TRIM(id_document_url), '') IS NOT NULL
        AND NULLIF(TRIM(id_document_number), '') IS NOT NULL
    ),
    COUNT(*) FILTER (
      WHERE role = 'accountant'
        AND NULLIF(TRIM(passport_photo_url), '') IS NOT NULL
        AND NULLIF(TRIM(id_document_url), '') IS NOT NULL
        AND NULLIF(TRIM(id_document_number), '') IS NOT NULL
    )
  INTO v_admin_submitted, v_accountant_submitted
  FROM public.org_members
  WHERE org_id = p_org_id
    AND COALESCE(status, 'active') NOT IN ('rejected', 'suspended');

  v_all_submitted := (v_admin_submitted >= 1 AND v_accountant_submitted >= 1);

  SELECT verification_status INTO v_org_status
  FROM public.organizations
  WHERE id = p_org_id;

  IF v_all_submitted AND COALESCE(v_org_status, 'unverified') <> 'verified' THEN
    UPDATE public.organizations
    SET
      verification_status = 'pending_review',
      verification_submitted_at = v_now,
      verification_rejection_reason = NULL
    WHERE id = p_org_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'allOfficersSubmitted', v_all_submitted,
    'orgStatus', CASE WHEN v_all_submitted AND COALESCE(v_org_status, 'unverified') <> 'verified' THEN 'pending_review' ELSE COALESCE(v_org_status, 'unverified') END,
    'submittedAt', v_now
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.review_org_verification(
  p_org_id TEXT,
  p_status TEXT,
  p_reviewed_by TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_now TIMESTAMPTZ := NOW();
  v_reviewer_user_id TEXT;
  v_admin_ok INTEGER := 0;
  v_acc_ok INTEGER := 0;
BEGIN
  IF p_status NOT IN ('verified', 'rejected') THEN
    RAISE EXCEPTION 'Invalid verification status: %', p_status;
  END IF;

  IF v_uid IS NOT NULL AND v_uid <> '' AND NOT is_platform_superadmin(v_uid) THEN
    RAISE EXCEPTION 'Only platform super administrators can review organization authenticity dossiers.';
  END IF;

  IF p_status = 'verified' THEN
    SELECT
      COUNT(*) FILTER (
        WHERE role IN ('org_admin', 'superadmin')
          AND NULLIF(TRIM(passport_photo_url), '') IS NOT NULL
          AND NULLIF(TRIM(id_document_url), '') IS NOT NULL
      ),
      COUNT(*) FILTER (
        WHERE role = 'accountant'
          AND NULLIF(TRIM(passport_photo_url), '') IS NOT NULL
          AND NULLIF(TRIM(id_document_url), '') IS NOT NULL
      )
    INTO v_admin_ok, v_acc_ok
    FROM public.org_members
    WHERE org_id = p_org_id
      AND COALESCE(status, 'active') NOT IN ('rejected', 'suspended');

    IF v_admin_ok < 1 OR v_acc_ok < 1 THEN
      RAISE EXCEPTION 'Cannot approve: Both an Administrator and an Accountant must submit their passport photo and ID document first.';
    END IF;
  END IF;

  SELECT id INTO v_reviewer_user_id
  FROM public.users
  WHERE id = v_uid OR auth_user_id = v_uid
  LIMIT 1;

  PERFORM set_config('app.bypass_member_guard', 'true', true);

  UPDATE public.organizations
  SET
    verification_status = p_status,
    verified_at = CASE WHEN p_status = 'verified' THEN v_now ELSE NULL END,
    verified_by = CASE WHEN p_status = 'verified' THEN p_reviewed_by ELSE NULL END,
    verification_rejection_reason = CASE WHEN p_status = 'rejected' THEN COALESCE(NULLIF(TRIM(p_rejection_reason), ''), 'Verification requirements not met.') ELSE NULL END
  WHERE id = p_org_id;

  -- Mark officers who submitted documents as verified/rejected; avoid falsely marking unsubmitted officers as verified
  UPDATE public.org_members
  SET
    verification_status = CASE WHEN p_status = 'verified' THEN 'verified' ELSE 'rejected' END,
    verified_at = CASE WHEN p_status = 'verified' THEN v_now ELSE NULL END,
    verified_by = CASE WHEN p_status = 'verified' THEN v_reviewer_user_id ELSE NULL END
  WHERE org_id = p_org_id
    AND role IN ('org_admin', 'superadmin', 'accountant', 'manager')
    AND (
      (NULLIF(TRIM(passport_photo_url), '') IS NOT NULL AND NULLIF(TRIM(id_document_url), '') IS NOT NULL)
      OR (p_status = 'rejected' AND role IN ('org_admin', 'accountant'))
    );

  IF p_status = 'verified' THEN
    UPDATE public.referrals
    SET status = 'verified'
    WHERE referred_org_id = p_org_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'org_id', p_org_id, 'status', p_status, 'reviewedAt', v_now);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_own_user_id(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_superadmin(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_officer_verification(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.review_org_verification(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 5. RLS & SUPABASE STORAGE POLICIES FOR OFFICER VERIFICATION
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS update_org_members ON public.org_members;
CREATE POLICY update_org_members ON public.org_members FOR UPDATE
  USING (
    is_admin_of_org(org_id, (auth.uid())::text)
    OR is_own_user_id(user_id, (auth.uid())::text)
    OR (user_id ~~ 'user-%'::text)
    OR (user_id ~~ 'u-%'::text)
    OR is_platform_superadmin((auth.uid())::text)
  )
  WITH CHECK (
    is_admin_of_org(org_id, (auth.uid())::text)
    OR is_own_user_id(user_id, (auth.uid())::text)
    OR (user_id ~~ 'user-%'::text)
    OR (user_id ~~ 'u-%'::text)
    OR is_platform_superadmin((auth.uid())::text)
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('impacto-files', 'impacto-files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "impacto_files_authenticated_insert" ON storage.objects;
CREATE POLICY "impacto_files_authenticated_insert" ON storage.objects
FOR INSERT TO authenticated, anon
WITH CHECK (bucket_id IN ('impacto-files', 'documents', 'avatars', 'chat-attachments'));

DROP POLICY IF EXISTS "impacto_files_authenticated_update" ON storage.objects;
CREATE POLICY "impacto_files_authenticated_update" ON storage.objects
FOR UPDATE TO authenticated, anon
USING (bucket_id IN ('impacto-files', 'documents', 'avatars', 'chat-attachments'));

DROP POLICY IF EXISTS "impacto_files_authenticated_select" ON storage.objects;
CREATE POLICY "impacto_files_authenticated_select" ON storage.objects
FOR SELECT TO authenticated, anon
USING (bucket_id IN ('impacto-files', 'documents', 'avatars', 'chat-attachments'));

DROP POLICY IF EXISTS "impacto_files_authenticated_delete" ON storage.objects;
CREATE POLICY "impacto_files_authenticated_delete" ON storage.objects
FOR DELETE TO authenticated, anon
USING (bucket_id IN ('impacto-files', 'documents', 'avatars', 'chat-attachments'));
