-- =====================================================================
-- IMPACTO OPERATING SYSTEM — MASTER DATABASE BACKUP & RESTORE SCRIPT
-- =====================================================================
-- Description: Complete, reproducible, and idempotent full-database backup
-- schema definition, relational foreign keys, performance indices,
-- Row-Level Security (RLS) policies, Realtime publications, Storage buckets,
-- and seed data for the Impacto Platform.
--
-- Supported Architecture: PostgreSQL 14+ / Supabase
-- Can be executed repeatedly without errors on fresh or existing databases.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS & PREREQUISITES
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 1. CORE RELATIONAL SCHEMAS & TABLES
-- =====================================================================

-- ---------------------------------------------------------------------
-- Table 1: USERS (Global Platform Identity & Profile Accounts)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  is_superadmin BOOLEAN DEFAULT false,
  auth_user_id TEXT,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure extended profile columns exist if migrated from earlier baseline
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
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_user_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS primary_org_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS joined_org_ids TEXT[] DEFAULT '{}';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ---------------------------------------------------------------------
-- Table 2: ORGANIZATIONS (Multi-Tenant Workspaces, Cooperatives & NGOs)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT,
  description TEXT,
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
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'grace_period', 'expired', 'cancelled')),
  subscription_ends_at TIMESTAMPTZ,
  subscription_tier TEXT DEFAULT 'trial' CHECK (subscription_tier IN ('trial', 'starter', 'growth', 'pro', 'enterprise')),
  subscription_plan TEXT DEFAULT 'growth' CHECK (subscription_plan IN ('free', 'growth', 'pro', 'enterprise')),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + interval '30 days'),
  grace_period_ends_at TIMESTAMPTZ DEFAULT (NOW() + interval '33 days'),
  member_limit INTEGER DEFAULT 30,
  storage_unlimited BOOLEAN DEFAULT false,
  org_category TEXT NOT NULL DEFAULT 'Environment',
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  location_name TEXT,
  contact_us TEXT,
  gallery_urls TEXT[],
  public_page_enabled BOOLEAN DEFAULT true,
  show_goals_publicly BOOLEAN DEFAULT true,
  show_impact_publicly BOOLEAN DEFAULT true,
  dashboard_theme TEXT DEFAULT 'light' CHECK (dashboard_theme IN ('light', 'dark', 'custom')),
  dashboard_logo TEXT,
  is_public_directory BOOLEAN DEFAULT true,
  allow_public_joining BOOLEAN DEFAULT true,
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

-- Ensure all extended profile & subscription columns exist
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'growth';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + interval '30 days');
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ DEFAULT (NOW() + interval '33 days');
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS member_limit INTEGER DEFAULT 30;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS storage_unlimited BOOLEAN DEFAULT false;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS founded_date TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS founders TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS employee_count TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS quorum_type TEXT DEFAULT 'percentage';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS quorum_value NUMERIC DEFAULT 50;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS financial_summary_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS fee_notification TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS marketplace_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS is_public_directory BOOLEAN DEFAULT true;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS allow_public_joining BOOLEAN DEFAULT true;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ---------------------------------------------------------------------
-- Table 3: MEMBER_TIERS (Custom Membership Levels & Annual Dues)
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
-- Table 4: ORG_MEMBERS (Tenant Membership Mapping & Permissions)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_members (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'org_admin', 'manager', 'accountant', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'resigned', 'rejected')),
  member_number TEXT,
  tier_id TEXT REFERENCES public.member_tiers(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_volunteer BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'not_required' CHECK (verification_status IN ('not_required', 'pending', 'verified', 'rejected', 'flagged')),
  verified_at TIMESTAMPTZ,
  verified_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  permissions JSONB DEFAULT '{"manage_members": false, "manage_content": false, "manage_finance": false, "manage_settings": false, "view_analytics": true, "manage_documents": false, "manage_chat": true}'::jsonb,
  UNIQUE(org_id, user_id)
);

ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'not_required';
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS verified_by TEXT REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"manage_members": false, "manage_content": false, "manage_finance": false, "manage_settings": false, "view_analytics": true, "manage_documents": false, "manage_chat": true}'::jsonb;

-- ---------------------------------------------------------------------
-- Table 5: PROGRAMS (Community & Operational Programs)
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
-- Table 6: EVENTS (Gatherings, Planting Sessions & QR Attendance)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location TEXT NOT NULL,
  online_link TEXT,
  program_id TEXT REFERENCES public.programs(id) ON DELETE SET NULL,
  max_attendees INT,
  is_public BOOLEAN DEFAULT true,
  qr_code_token TEXT NOT NULL,
  attendees_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  is_deleted BOOLEAN DEFAULT false,
  last_edited_at TIMESTAMPTZ,
  location_type TEXT DEFAULT 'on-site' CHECK (location_type IN ('on-site', 'online')),
  latitude NUMERIC,
  longitude NUMERIC,
  radius_meters NUMERIC DEFAULT 100,
  is_broadcasted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'on-site';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS radius_meters NUMERIC DEFAULT 100;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_broadcasted BOOLEAN DEFAULT false;

-- ---------------------------------------------------------------------
-- Table 7: EVENT_ATTENDANCE (Member Check-ins & QR Code Scans)
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

ALTER TABLE public.event_attendance ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'present';
ALTER TABLE public.event_attendance ADD COLUMN IF NOT EXISTS attempt_lat NUMERIC;
ALTER TABLE public.event_attendance ADD COLUMN IF NOT EXISTS attempt_lng NUMERIC;
ALTER TABLE public.event_attendance ADD COLUMN IF NOT EXISTS distance_meters NUMERIC;
ALTER TABLE public.event_attendance ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES public.users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- Table 8: EVENT_RSVPS (Pre-Event RSVPs & Intentions)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  response TEXT NOT NULL CHECK (response IN ('yes', 'no', 'maybe')),
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, member_id)
);

-- ---------------------------------------------------------------------
-- Table 9: EVENT_WAITLIST (Waitlist Queue When Events Reach Capacity)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_waitlist (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  UNIQUE(event_id, member_id)
);

-- ---------------------------------------------------------------------
-- Table 10: MEETINGS (Board & General Assembly Governance Assemblies)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meetings (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date_time TIMESTAMPTZ NOT NULL,
  duration INT NOT NULL, -- minutes
  location TEXT NOT NULL,
  link TEXT,
  agenda JSONB DEFAULT '[]'::jsonb,
  minutes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  quorum_required NUMERIC,
  quorum_reached BOOLEAN DEFAULT false,
  quorum_count_at_completion INT DEFAULT 0,
  attendance_count INT DEFAULT 0,
  location_type TEXT DEFAULT 'on-site' CHECK (location_type IN ('on-site', 'online')),
  latitude NUMERIC,
  longitude NUMERIC,
  radius_meters NUMERIC DEFAULT 100,
  is_broadcasted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS quorum_required NUMERIC;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS quorum_reached BOOLEAN DEFAULT false;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS quorum_count_at_completion INT DEFAULT 0;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS attendance_count INT DEFAULT 0;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'on-site';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS radius_meters NUMERIC DEFAULT 100;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS is_broadcasted BOOLEAN DEFAULT false;

-- ---------------------------------------------------------------------
-- Table 11: ACTION_ITEMS (Action Points & Meeting Tasks)
-- ---------------------------------------------------------------------
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
-- Table 12: CHAT_CHANNELS (Real-time Messaging Channels)
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

ALTER TABLE public.chat_channels ADD COLUMN IF NOT EXISTS channel_type TEXT DEFAULT 'general';
ALTER TABLE public.chat_channels ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE public.chat_channels ADD COLUMN IF NOT EXISTS member_ids TEXT[] DEFAULT '{}';

-- ---------------------------------------------------------------------
-- Table 13: CHAT_MESSAGES (Channel Communication Messages & Media)
-- ---------------------------------------------------------------------
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

ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS file_mime_type TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS voice_duration_seconds INT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS reply_to_id TEXT REFERENCES public.chat_messages(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- Table 14: POLLS (Standalone Realtime Voting Engine)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.polls (
  poll_id TEXT PRIMARY KEY,
  message_id TEXT,
  channel_id TEXT NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Table 15: POLL_VOTES (Live Cast Votes for Standalone Polls)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL REFERENCES public.polls(poll_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

-- ---------------------------------------------------------------------
-- Table 16: POLL_MESSAGES (Legacy Inline Polls)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.poll_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  message_id TEXT NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Table 17: POLL_RESPONSES (Legacy Inline Poll Responses)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.poll_responses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  poll_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  selected_options INT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

-- ---------------------------------------------------------------------
-- Table 18: NEWS_POSTS (Announcements & News Feed)
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

ALTER TABLE public.news_posts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.news_posts ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------
-- Table 19: GOALS (Impact Milestones & Strategic Key Performance Metrics)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goals (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target NUMERIC,
  unit TEXT,
  current_progress NUMERIC NOT NULL DEFAULT 0,
  starting_progress NUMERIC DEFAULT 0,
  deadline DATE NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'members')),
  is_pinned BOOLEAN DEFAULT false,
  period_type TEXT DEFAULT 'yearly' CHECK (period_type IN ('yearly', 'monthly')),
  period_label TEXT, -- e.g., '2026' or '2026-05'
  achievement_percentage NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  is_deleted BOOLEAN DEFAULT false,
  last_edited_at TIMESTAMPTZ,
  last_note TEXT,
  user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS period_type TEXT DEFAULT 'yearly';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS period_label TEXT;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS achievement_percentage NUMERIC DEFAULT 0;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS last_note TEXT;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ---------------------------------------------------------------------
-- Table 20: GOAL_UPDATES (Historic Progress Increments Log)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goal_updates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  goal_id TEXT NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  note TEXT,
  updated_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Table 21: GRANTS (Grant Pipeline & Funder Tracking)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grants (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  funder TEXT NOT NULL,
  amount_range TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RWF',
  deadline DATE NOT NULL,
  link TEXT,
  eligibility TEXT,
  program_id TEXT REFERENCES public.programs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'tracking' CHECK (status IN ('tracking', 'applied', 'successful', 'unsuccessful', 'withdrawn')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Table 22: LEDGER_ENTRIES (Double-Entry Bookkeeping Ledger)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'asset', 'liability', 'equity')),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RWF',
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  reference TEXT,
  receipt_url TEXT,
  program_id TEXT REFERENCES public.programs(id) ON DELETE SET NULL,
  goal_id TEXT REFERENCES public.goals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_type_check;
ALTER TABLE public.ledger_entries ADD CONSTRAINT ledger_entries_type_check CHECK (type IN ('income', 'expense', 'asset', 'liability', 'equity'));

-- ---------------------------------------------------------------------
-- Table 23: DONATIONS (Public Mobile Money Donations & Verification)
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
-- Table 24: ERROR_REPORTS (System Glitches & Operator Incident Reports)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.error_reports (
  id TEXT PRIMARY KEY,
  org_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  screenshot_url TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'wont_fix')),
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.error_reports ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.error_reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE public.error_reports ADD COLUMN IF NOT EXISTS resolved_by TEXT REFERENCES public.users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- Table 25: SUBSCRIPTION_PAYMENTS (Tenant Plan License Invoices & Proofs)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  amount_usd NUMERIC NOT NULL,
  amount_local NUMERIC NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('mtn', 'airtel')),
  phone TEXT NOT NULL,
  reference TEXT NOT NULL,
  proof_url TEXT,
  status TEXT DEFAULT 'awaiting_approval' CHECK (status IN ('awaiting_approval', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ
);

ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS package_id TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'plan';
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS audited_by TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS audited_by_name TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS audit_notes TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS audited_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------
-- Table 26: PLATFORM_SETTINGS (Global Billing, Rates & Gateway Info)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id TEXT PRIMARY KEY,
  usd_to_rwf_rate NUMERIC DEFAULT 1300,
  eur_to_rwf_rate NUMERIC DEFAULT 1400,
  kes_to_rwf_rate NUMERIC DEFAULT 10,
  mtn_payment_number TEXT DEFAULT '0788100100',
  airtel_payment_number TEXT DEFAULT '0733100100',
  payment_name TEXT DEFAULT 'VIRELLIX INC',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Table 27: DOCUMENTS (Document Office, Letters, Bylaws & Vault)
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

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS show_header BOOLEAN DEFAULT true;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- ---------------------------------------------------------------------
-- Table 28: DOCUMENT_ACKNOWLEDGEMENTS (Compliance Sign-offs Matrix)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_acknowledgements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_id TEXT NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_version INT NOT NULL DEFAULT 1,
  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, member_id, document_version)
);

-- ---------------------------------------------------------------------
-- Table 29: RESIGNATIONS (Exit Offboarding Surveys & Resignations)
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

-- ---------------------------------------------------------------------
-- Table 30: AUDIT_LOGS (Complete Administrative Action Audit Trail)
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Table 31: SUPPORT_CONVERSATIONS (Helpdesk Live Chat Threads)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_conversations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Table 32: SUPPORT_MESSAGES (Helpdesk Live Chat Messages)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conversation_id TEXT NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('superadmin', 'org_member')),
  sender_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Table 33: IDENTITY_VERIFICATIONS (National ID KYC Submissions)
-- ---------------------------------------------------------------------
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

ALTER TABLE public.identity_verifications ADD COLUMN IF NOT EXISTS org_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.identity_verifications ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'National ID';
ALTER TABLE public.identity_verifications ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE public.identity_verifications ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- ---------------------------------------------------------------------
-- Table 34: MEMBER_FEES (Cooperative Dues & Contribution Invoices)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_fees (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RWF',
  payment_period TEXT NOT NULL, -- 'weekly' | 'monthly' | 'flexible'
  period_date TEXT NOT NULL,     -- e.g. '2026-W22' or 'May 2026'
  status TEXT NOT NULL DEFAULT 'pending', -- 'paid' | 'pending' | 'pending_confirmation'
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

ALTER TABLE public.member_fees ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.member_fees ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT true;

-- ---------------------------------------------------------------------
-- Table 35: MARKETPLACE_PRODUCTS (Cooperative Produce & Goods)
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

-- ---------------------------------------------------------------------
-- Table 36: MARKETPLACE_LEADS (Purchase Interest Submissions)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketplace_leads (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Table 37: SHARE_CAPITAL (Member Equity Investment Ledgers)
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

-- ---------------------------------------------------------------------
-- Table 38: SHARE_TRANSACTIONS (Share Purchase Addition Transactions)
-- ---------------------------------------------------------------------
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
-- Table 39: ACTIVITY_LOGS (Extended Field Operations & Activities)
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

ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS activity_type TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS target_metric TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS present_member_ids TEXT[] DEFAULT '{}';
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS absent_member_ids TEXT[] DEFAULT '{}';
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS attendees TEXT[] DEFAULT '{}';

-- ---------------------------------------------------------------------
-- Table 40: ACTIVITY_ATTENDANCE (Activity Participant Mapping)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_attendance (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  activity_id TEXT NOT NULL REFERENCES public.activity_logs(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  recorded_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, member_id)
);

-- ---------------------------------------------------------------------
-- Table 41: MESSAGE_TEMPLATES (Dynamic Email & SMS Notification Templates)
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

-- ---------------------------------------------------------------------
-- Table 42: NOTIFICATION_SENDS (Broadcast History & Alerts Ledger)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_sends (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_id TEXT REFERENCES public.message_templates(id) ON DELETE SET NULL,
  channels TEXT[] DEFAULT '{}',
  recipient_ids TEXT[] DEFAULT '{}',
  variables_applied JSONB DEFAULT '{}'::jsonb,
  sent_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  recipient_group TEXT,
  recipient_count INTEGER DEFAULT 1,
  body_text TEXT,
  activity_id TEXT REFERENCES public.activity_logs(id) ON DELETE SET NULL,
  event_id TEXT REFERENCES public.events(id) ON DELETE SET NULL,
  meeting_id TEXT REFERENCES public.meetings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notification_sends ADD COLUMN IF NOT EXISTS recipient_group TEXT;
ALTER TABLE public.notification_sends ADD COLUMN IF NOT EXISTS recipient_count INTEGER DEFAULT 1;
ALTER TABLE public.notification_sends ADD COLUMN IF NOT EXISTS body_text TEXT;
ALTER TABLE public.notification_sends ADD COLUMN IF NOT EXISTS activity_id TEXT REFERENCES public.activity_logs(id) ON DELETE SET NULL;
ALTER TABLE public.notification_sends ADD COLUMN IF NOT EXISTS event_id TEXT REFERENCES public.events(id) ON DELETE SET NULL;
ALTER TABLE public.notification_sends ADD COLUMN IF NOT EXISTS meeting_id TEXT REFERENCES public.meetings(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- Table 43: PASSWORD_RESET_REQUESTS (Supervisor-Approved Password Resets)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Table 44: PAWAPAY_DEPOSITS (pawaPay MoMo Live Push-to-Pay Transactions)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Table 45: MARKETPLACE_FEATURES (À La Carte System Capabilities Catalog)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketplace_features (
  feature_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  theme TEXT NOT NULL CHECK (theme IN ('Finance', 'Governance', 'Operations', 'Communication')),
  description TEXT,
  base_price NUMERIC DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Table 46: MARKETPLACE_PACKAGES (Curated Bundled Feature Packs)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketplace_packages (
  package_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  feature_ids TEXT[] NOT NULL,
  package_price NUMERIC DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Table 47: ORG_PURCHASED_ITEMS (Active Tenant Add-ons & Pack Subscriptions)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_purchased_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('feature', 'package')),
  item_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ, -- 30-day auto-expiry on Free Plan
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Table 48: ASSETS (Physical Equipment, IT Hardware & Inventory Tracking)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Equipment',
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
-- Table 49: CERTIFICATES (Official Workshop & Recognition Certificates)
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

-- ---------------------------------------------------------------------
-- Table 50: DOCUMENT_SIGNATURES (Touch/Cursor/Image Digital E-Signatures)
-- ---------------------------------------------------------------------
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

ALTER TABLE public.document_acknowledgements ADD COLUMN IF NOT EXISTS signature_data_url TEXT;
ALTER TABLE public.document_acknowledgements ADD COLUMN IF NOT EXISTS signature_type TEXT DEFAULT 'typed';
ALTER TABLE public.document_acknowledgements ADD COLUMN IF NOT EXISTS signer_name TEXT;
ALTER TABLE public.document_acknowledgements ADD COLUMN IF NOT EXISTS signer_role TEXT;
ALTER TABLE public.document_acknowledgements ADD COLUMN IF NOT EXISTS verification_hash TEXT;

-- ---------------------------------------------------------------------
-- Table 51: OFFLINE_SYNC_LOGS (PWA Field Operations Sync Audit)
-- ---------------------------------------------------------------------
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
-- 2. PERFORMANCE & CHRONOLOGICAL QUERY INDICES
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(subscription_status);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON public.org_members(role);
CREATE INDEX IF NOT EXISTS idx_programs_org_id ON public.programs(org_id);
CREATE INDEX IF NOT EXISTS idx_events_org_id ON public.events(org_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date_time DESC);
CREATE INDEX IF NOT EXISTS idx_event_attendance_evt ON public.event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_mem ON public.event_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_evt ON public.event_rsvps(event_id, response);
CREATE INDEX IF NOT EXISTS idx_event_waitlist_evt ON public.event_waitlist(event_id);
CREATE INDEX IF NOT EXISTS idx_meetings_org_date ON public.meetings(org_id, date_time DESC);
CREATE INDEX IF NOT EXISTS idx_action_items_org ON public.action_items(org_id);
CREATE INDEX IF NOT EXISTS idx_action_items_assignee ON public.action_items(assigned_to);
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
-- 3. SECURITY DEFINER FUNCTIONS & MULTI-TENANT HELPERS
-- =====================================================================

CREATE OR REPLACE FUNCTION public.is_member_of_org(org_id TEXT, user_uid TEXT)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.org_members 
    WHERE public.org_members.org_id = is_member_of_org.org_id 
      AND (public.org_members.user_id = is_member_of_org.user_uid OR is_member_of_org.user_uid LIKE 'user-%')
      AND public.org_members.status = 'active'
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.is_admin_of_org(org_id TEXT, user_uid TEXT)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.org_members 
    WHERE public.org_members.org_id = is_admin_of_org.org_id 
      AND (public.org_members.user_id = is_admin_of_org.user_uid OR is_admin_of_org.user_uid LIKE 'user-%')
      AND public.org_members.role IN ('org_admin', 'superadmin')
      AND public.org_members.status = 'active'
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.is_platform_superadmin(user_uid TEXT)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE (public.users.id = is_platform_superadmin.user_uid OR public.users.auth_user_id = is_platform_superadmin.user_uid)
      AND public.users.is_superadmin = true
  );
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
-- 4. ROW LEVEL SECURITY (RLS) & ACCESS CONTROL POLICIES
-- =====================================================================

-- Enable RLS across all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resignations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_capital ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pawapay_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_purchased_items ENABLE ROW LEVEL SECURITY;

-- Grant broad operational permissions to all client roles
GRANT ALL ON TABLE public.users TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.organizations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.org_members TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.member_tiers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.programs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.events TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.event_attendance TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.event_rsvps TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.event_waitlist TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.meetings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.action_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.chat_channels TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.chat_messages TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.polls TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.poll_votes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.poll_messages TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.poll_responses TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.news_posts TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.goals TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.goal_updates TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.grants TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ledger_entries TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.donations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.error_reports TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.subscription_payments TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.platform_settings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.documents TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.document_acknowledgements TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.resignations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.audit_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.support_conversations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.support_messages TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.identity_verifications TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.member_fees TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.marketplace_products TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.marketplace_leads TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.share_capital TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.share_transactions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.activity_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.activity_attendance TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.message_templates TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.notification_sends TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.password_reset_requests TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.pawapay_deposits TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.marketplace_features TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.marketplace_packages TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.org_purchased_items TO anon, authenticated, service_role;

-- POLICIES: USERS
DROP POLICY IF EXISTS select_users ON public.users;
DROP POLICY IF EXISTS insert_users ON public.users;
DROP POLICY IF EXISTS update_users ON public.users;
CREATE POLICY select_users ON public.users FOR SELECT USING (true);
CREATE POLICY insert_users ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY update_users ON public.users FOR UPDATE USING (true) WITH CHECK (true);

-- POLICIES: ORGANIZATIONS
DROP POLICY IF EXISTS select_organizations ON public.organizations;
DROP POLICY IF EXISTS insert_organizations ON public.organizations;
DROP POLICY IF EXISTS update_organizations ON public.organizations;
DROP POLICY IF EXISTS delete_organizations ON public.organizations;
CREATE POLICY select_organizations ON public.organizations FOR SELECT USING (true);
CREATE POLICY insert_organizations ON public.organizations FOR INSERT WITH CHECK (true);
CREATE POLICY update_organizations ON public.organizations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY delete_organizations ON public.organizations FOR DELETE USING (true);

-- POLICIES: ORG_MEMBERS
DROP POLICY IF EXISTS select_org_members ON public.org_members;
DROP POLICY IF EXISTS insert_org_members ON public.org_members;
DROP POLICY IF EXISTS update_org_members ON public.org_members;
DROP POLICY IF EXISTS delete_org_members ON public.org_members;
CREATE POLICY select_org_members ON public.org_members FOR SELECT USING (true);
CREATE POLICY insert_org_members ON public.org_members FOR INSERT WITH CHECK (true);
CREATE POLICY update_org_members ON public.org_members FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY delete_org_members ON public.org_members FOR DELETE USING (true);

-- POLICIES: MEMBER_TIERS
DROP POLICY IF EXISTS select_member_tiers ON public.member_tiers;
DROP POLICY IF EXISTS write_member_tiers ON public.member_tiers;
CREATE POLICY select_member_tiers ON public.member_tiers FOR SELECT USING (true);
CREATE POLICY write_member_tiers ON public.member_tiers FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: PROGRAMS
DROP POLICY IF EXISTS select_programs ON public.programs;
DROP POLICY IF EXISTS write_programs ON public.programs;
CREATE POLICY select_programs ON public.programs FOR SELECT USING (true);
CREATE POLICY write_programs ON public.programs FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: EVENTS
DROP POLICY IF EXISTS select_events ON public.events;
DROP POLICY IF EXISTS write_events ON public.events;
CREATE POLICY select_events ON public.events FOR SELECT USING (true);
CREATE POLICY write_events ON public.events FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: EVENT_ATTENDANCE
DROP POLICY IF EXISTS select_event_attendance ON public.event_attendance;
DROP POLICY IF EXISTS write_event_attendance ON public.event_attendance;
CREATE POLICY select_event_attendance ON public.event_attendance FOR SELECT USING (true);
CREATE POLICY write_event_attendance ON public.event_attendance FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: EVENT_RSVPS & WAITLIST
DROP POLICY IF EXISTS select_event_rsvps ON public.event_rsvps;
DROP POLICY IF EXISTS write_event_rsvps ON public.event_rsvps;
CREATE POLICY select_event_rsvps ON public.event_rsvps FOR SELECT USING (true);
CREATE POLICY write_event_rsvps ON public.event_rsvps FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS select_event_waitlist ON public.event_waitlist;
DROP POLICY IF EXISTS write_event_waitlist ON public.event_waitlist;
CREATE POLICY select_event_waitlist ON public.event_waitlist FOR SELECT USING (true);
CREATE POLICY write_event_waitlist ON public.event_waitlist FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: MEETINGS & ACTION ITEMS
DROP POLICY IF EXISTS select_meetings ON public.meetings;
DROP POLICY IF EXISTS write_meetings ON public.meetings;
CREATE POLICY select_meetings ON public.meetings FOR SELECT USING (true);
CREATE POLICY write_meetings ON public.meetings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS select_action_items ON public.action_items;
DROP POLICY IF EXISTS write_action_items ON public.action_items;
CREATE POLICY select_action_items ON public.action_items FOR SELECT USING (true);
CREATE POLICY write_action_items ON public.action_items FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: CHAT CHANNELS & MESSAGES
DROP POLICY IF EXISTS select_chat_channels ON public.chat_channels;
DROP POLICY IF EXISTS write_chat_channels ON public.chat_channels;
CREATE POLICY select_chat_channels ON public.chat_channels FOR SELECT USING (true);
CREATE POLICY write_chat_channels ON public.chat_channels FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS select_chat_messages ON public.chat_messages;
DROP POLICY IF EXISTS insert_chat_messages ON public.chat_messages;
DROP POLICY IF EXISTS update_chat_messages ON public.chat_messages;
DROP POLICY IF EXISTS delete_chat_messages ON public.chat_messages;
CREATE POLICY select_chat_messages ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY insert_chat_messages ON public.chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY update_chat_messages ON public.chat_messages FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY delete_chat_messages ON public.chat_messages FOR DELETE USING (true);

-- POLICIES: POLLS & VOTES
DROP POLICY IF EXISTS select_polls ON public.polls;
DROP POLICY IF EXISTS insert_polls ON public.polls;
DROP POLICY IF EXISTS update_polls ON public.polls;
DROP POLICY IF EXISTS delete_polls ON public.polls;
CREATE POLICY select_polls ON public.polls FOR SELECT USING (true);
CREATE POLICY insert_polls ON public.polls FOR INSERT WITH CHECK (true);
CREATE POLICY update_polls ON public.polls FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY delete_polls ON public.polls FOR DELETE USING (true);

DROP POLICY IF EXISTS select_poll_votes ON public.poll_votes;
DROP POLICY IF EXISTS insert_poll_votes ON public.poll_votes;
DROP POLICY IF EXISTS update_poll_votes ON public.poll_votes;
DROP POLICY IF EXISTS delete_poll_votes ON public.poll_votes;
CREATE POLICY select_poll_votes ON public.poll_votes FOR SELECT USING (true);
CREATE POLICY insert_poll_votes ON public.poll_votes FOR INSERT WITH CHECK (true);
CREATE POLICY update_poll_votes ON public.poll_votes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY delete_poll_votes ON public.poll_votes FOR DELETE USING (true);

-- POLICIES: POLL MESSAGES & RESPONSES
DROP POLICY IF EXISTS select_poll_messages ON public.poll_messages;
DROP POLICY IF EXISTS write_poll_messages ON public.poll_messages;
CREATE POLICY select_poll_messages ON public.poll_messages FOR SELECT USING (true);
CREATE POLICY write_poll_messages ON public.poll_messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS select_poll_responses ON public.poll_responses;
DROP POLICY IF EXISTS write_poll_responses ON public.poll_responses;
CREATE POLICY select_poll_responses ON public.poll_responses FOR SELECT USING (true);
CREATE POLICY write_poll_responses ON public.poll_responses FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: NEWS POSTS
DROP POLICY IF EXISTS select_news_posts ON public.news_posts;
DROP POLICY IF EXISTS write_news_posts ON public.news_posts;
CREATE POLICY select_news_posts ON public.news_posts FOR SELECT USING (true);
CREATE POLICY write_news_posts ON public.news_posts FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: GOALS & GOAL UPDATES
DROP POLICY IF EXISTS select_goals ON public.goals;
DROP POLICY IF EXISTS write_goals ON public.goals;
CREATE POLICY select_goals ON public.goals FOR SELECT USING (true);
CREATE POLICY write_goals ON public.goals FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS select_goal_updates ON public.goal_updates;
DROP POLICY IF EXISTS write_goal_updates ON public.goal_updates;
CREATE POLICY select_goal_updates ON public.goal_updates FOR SELECT USING (true);
CREATE POLICY write_goal_updates ON public.goal_updates FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: GRANTS
DROP POLICY IF EXISTS select_grants ON public.grants;
DROP POLICY IF EXISTS write_grants ON public.grants;
CREATE POLICY select_grants ON public.grants FOR SELECT USING (true);
CREATE POLICY write_grants ON public.grants FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: LEDGER ENTRIES
DROP POLICY IF EXISTS select_ledger_entries ON public.ledger_entries;
DROP POLICY IF EXISTS write_ledger_entries ON public.ledger_entries;
CREATE POLICY select_ledger_entries ON public.ledger_entries FOR SELECT USING (true);
CREATE POLICY write_ledger_entries ON public.ledger_entries FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: DONATIONS
DROP POLICY IF EXISTS select_donations ON public.donations;
DROP POLICY IF EXISTS write_donations ON public.donations;
CREATE POLICY select_donations ON public.donations FOR SELECT USING (true);
CREATE POLICY write_donations ON public.donations FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: ERROR REPORTS
DROP POLICY IF EXISTS select_error_reports ON public.error_reports;
DROP POLICY IF EXISTS write_error_reports ON public.error_reports;
CREATE POLICY select_error_reports ON public.error_reports FOR SELECT USING (true);
CREATE POLICY write_error_reports ON public.error_reports FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: SUBSCRIPTION PAYMENTS
DROP POLICY IF EXISTS select_subscription_payments ON public.subscription_payments;
DROP POLICY IF EXISTS write_subscription_payments ON public.subscription_payments;
CREATE POLICY select_subscription_payments ON public.subscription_payments FOR SELECT USING (true);
CREATE POLICY write_subscription_payments ON public.subscription_payments FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: PLATFORM SETTINGS
DROP POLICY IF EXISTS select_platform_settings ON public.platform_settings;
DROP POLICY IF EXISTS write_platform_settings ON public.platform_settings;
CREATE POLICY select_platform_settings ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY write_platform_settings ON public.platform_settings FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: DOCUMENTS & ACKNOWLEDGEMENTS
DROP POLICY IF EXISTS select_documents ON public.documents;
DROP POLICY IF EXISTS write_documents ON public.documents;
CREATE POLICY select_documents ON public.documents FOR SELECT USING (true);
CREATE POLICY write_documents ON public.documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS select_doc_ack ON public.document_acknowledgements;
DROP POLICY IF EXISTS write_doc_ack ON public.document_acknowledgements;
CREATE POLICY select_doc_ack ON public.document_acknowledgements FOR SELECT USING (true);
CREATE POLICY write_doc_ack ON public.document_acknowledgements FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: RESIGNATIONS
DROP POLICY IF EXISTS select_resignations ON public.resignations;
DROP POLICY IF EXISTS write_resignations ON public.resignations;
CREATE POLICY select_resignations ON public.resignations FOR SELECT USING (true);
CREATE POLICY write_resignations ON public.resignations FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: AUDIT LOGS
DROP POLICY IF EXISTS select_audit_logs ON public.audit_logs;
DROP POLICY IF EXISTS write_audit_logs ON public.audit_logs;
CREATE POLICY select_audit_logs ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY write_audit_logs ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: SUPPORT CONVERSATIONS & MESSAGES
DROP POLICY IF EXISTS select_support_conv ON public.support_conversations;
DROP POLICY IF EXISTS write_support_conv ON public.support_conversations;
CREATE POLICY select_support_conv ON public.support_conversations FOR SELECT USING (true);
CREATE POLICY write_support_conv ON public.support_conversations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS select_support_msg ON public.support_messages;
DROP POLICY IF EXISTS write_support_msg ON public.support_messages;
CREATE POLICY select_support_msg ON public.support_messages FOR SELECT USING (true);
CREATE POLICY write_support_msg ON public.support_messages FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: IDENTITY VERIFICATIONS
DROP POLICY IF EXISTS select_ident_verify ON public.identity_verifications;
DROP POLICY IF EXISTS write_ident_verify ON public.identity_verifications;
CREATE POLICY select_ident_verify ON public.identity_verifications FOR SELECT USING (true);
CREATE POLICY write_ident_verify ON public.identity_verifications FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: MEMBER FEES
DROP POLICY IF EXISTS select_member_fees ON public.member_fees;
DROP POLICY IF EXISTS write_member_fees ON public.member_fees;
CREATE POLICY select_member_fees ON public.member_fees FOR SELECT USING (true);
CREATE POLICY write_member_fees ON public.member_fees FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: MARKETPLACE PRODUCTS & LEADS
DROP POLICY IF EXISTS select_marketplace_products ON public.marketplace_products;
DROP POLICY IF EXISTS write_marketplace_products ON public.marketplace_products;
CREATE POLICY select_marketplace_products ON public.marketplace_products FOR SELECT USING (true);
CREATE POLICY write_marketplace_products ON public.marketplace_products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS select_marketplace_leads ON public.marketplace_leads;
DROP POLICY IF EXISTS write_marketplace_leads ON public.marketplace_leads;
CREATE POLICY select_marketplace_leads ON public.marketplace_leads FOR SELECT USING (true);
CREATE POLICY write_marketplace_leads ON public.marketplace_leads FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: SHARE CAPITAL & SHARE TRANSACTIONS
DROP POLICY IF EXISTS select_share_capital ON public.share_capital;
DROP POLICY IF EXISTS write_share_capital ON public.share_capital;
CREATE POLICY select_share_capital ON public.share_capital FOR SELECT USING (true);
CREATE POLICY write_share_capital ON public.share_capital FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS select_share_transactions ON public.share_transactions;
DROP POLICY IF EXISTS write_share_transactions ON public.share_transactions;
CREATE POLICY select_share_transactions ON public.share_transactions FOR SELECT USING (true);
CREATE POLICY write_share_transactions ON public.share_transactions FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: ACTIVITY LOGS & ATTENDANCE
DROP POLICY IF EXISTS select_activity_logs ON public.activity_logs;
DROP POLICY IF EXISTS write_activity_logs ON public.activity_logs;
CREATE POLICY select_activity_logs ON public.activity_logs FOR SELECT USING (true);
CREATE POLICY write_activity_logs ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS select_activity_attendance ON public.activity_attendance;
DROP POLICY IF EXISTS write_activity_attendance ON public.activity_attendance;
CREATE POLICY select_activity_attendance ON public.activity_attendance FOR SELECT USING (true);
CREATE POLICY write_activity_attendance ON public.activity_attendance FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: MESSAGE TEMPLATES & NOTIFICATION SENDS
DROP POLICY IF EXISTS select_message_templates ON public.message_templates;
DROP POLICY IF EXISTS write_message_templates ON public.message_templates;
CREATE POLICY select_message_templates ON public.message_templates FOR SELECT USING (true);
CREATE POLICY write_message_templates ON public.message_templates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS select_notification_sends ON public.notification_sends;
DROP POLICY IF EXISTS write_notification_sends ON public.notification_sends;
CREATE POLICY select_notification_sends ON public.notification_sends FOR SELECT USING (true);
CREATE POLICY write_notification_sends ON public.notification_sends FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: PASSWORD RESET REQUESTS
DROP POLICY IF EXISTS select_password_reset_requests ON public.password_reset_requests;
DROP POLICY IF EXISTS write_password_reset_requests ON public.password_reset_requests;
CREATE POLICY select_password_reset_requests ON public.password_reset_requests FOR SELECT USING (true);
CREATE POLICY write_password_reset_requests ON public.password_reset_requests FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: PAWAPAY DEPOSITS
DROP POLICY IF EXISTS select_pawapay_deposits ON public.pawapay_deposits;
DROP POLICY IF EXISTS write_pawapay_deposits ON public.pawapay_deposits;
CREATE POLICY select_pawapay_deposits ON public.pawapay_deposits FOR SELECT USING (true);
CREATE POLICY write_pawapay_deposits ON public.pawapay_deposits FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: MARKETPLACE FEATURES & PACKAGES
DROP POLICY IF EXISTS select_marketplace_features ON public.marketplace_features;
DROP POLICY IF EXISTS write_marketplace_features ON public.marketplace_features;
CREATE POLICY select_marketplace_features ON public.marketplace_features FOR SELECT USING (true);
CREATE POLICY write_marketplace_features ON public.marketplace_features FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS select_marketplace_packages ON public.marketplace_packages;
DROP POLICY IF EXISTS write_marketplace_packages ON public.marketplace_packages;
CREATE POLICY select_marketplace_packages ON public.marketplace_packages FOR SELECT USING (true);
CREATE POLICY write_marketplace_packages ON public.marketplace_packages FOR ALL USING (true) WITH CHECK (true);

-- POLICIES: ORG PURCHASED ITEMS
DROP POLICY IF EXISTS select_org_purchased_items ON public.org_purchased_items;
DROP POLICY IF EXISTS write_org_purchased_items ON public.org_purchased_items;
CREATE POLICY select_org_purchased_items ON public.org_purchased_items FOR SELECT USING (true);
CREATE POLICY write_org_purchased_items ON public.org_purchased_items FOR ALL USING (true) WITH CHECK (true);


-- =====================================================================
-- 5. SUPABASE REALTIME PUBLICATIONS SETUP
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.donations;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.member_fees;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_sends;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.password_reset_requests;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Publication alter skipped or table already registered: %', SQLERRM;
END $$;


-- =====================================================================
-- 6. SUPABASE STORAGE BUCKETS SETUP & POLICIES
-- =====================================================================
-- Four dedicated buckets:
-- 1. 'documents': Official PDFs, Word letters, bylaws, compliance vaults
-- 2. 'chat-attachments': Direct messaging media, file transfers, voice notes
-- 3. 'avatars': User profile portraits and organization brand logos
-- 4. 'impacto-files': General proof slips, ID KYC cards, product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('documents', 'documents', true, 52428800, NULL),
  ('chat-attachments', 'chat-attachments', true, 52428800, NULL),
  ('avatars', 'avatars', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml']),
  ('impacto-files', 'impacto-files', true, 52428800, NULL)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Objects Row-Level Security
DROP POLICY IF EXISTS "Allow public select on storage objects" ON storage.objects;
CREATE POLICY "Allow public select on storage objects" ON storage.objects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on storage objects" ON storage.objects;
CREATE POLICY "Allow public insert on storage objects" ON storage.objects FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on storage objects" ON storage.objects;
CREATE POLICY "Allow public update on storage objects" ON storage.objects FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete on storage objects" ON storage.objects;
CREATE POLICY "Allow public delete on storage objects" ON storage.objects FOR DELETE USING (true);


-- =====================================================================
-- 7. DATABASE TRIGGERS (AUTH & USER SYNCHRONIZATION)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, is_superadmin, auth_user_id)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    FALSE,
    NEW.id::text
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    auth_user_id = EXCLUDED.auth_user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger binding for supabase auth.users table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'users') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Trigger creation on auth.users skipped: %', SQLERRM;
END $$;


-- =====================================================================
-- 8. SUPERADMIN & PLATFORM SEED INITIALIZATION
-- =====================================================================

-- 1. Create Superadmin auth user and mirror to public.users
DO $$
DECLARE
  super_id UUID := '7c81d898-a6b1-4b19-b2f4-8a4db9be1cf9';
  enc_pwd TEXT;
BEGIN
  enc_pwd := crypt('princegabby4@gmail.com', gen_salt('bf'));

  -- Insert into auth.users if Supabase auth exists
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'users') THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'princegabby4@gmail.com') THEN
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) VALUES (
        super_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'princegabby4@gmail.com', enc_pwd, NOW(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        '{"full_name": "Gaby Prince Kabuye"}'::jsonb,
        NOW(), NOW()
      );
    ELSE
      SELECT id INTO super_id FROM auth.users WHERE email = 'princegabby4@gmail.com';
    END IF;
  END IF;

  -- Upsert into public.users
  INSERT INTO public.users (id, email, full_name, avatar_url, is_superadmin, auth_user_id, created_at)
  VALUES (
    super_id::text,
    'princegabby4@gmail.com',
    'Gaby Prince Kabuye',
    NULL,
    TRUE,
    super_id::text,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    is_superadmin = TRUE,
    auth_user_id = EXCLUDED.auth_user_id;

END $$;

-- 2. Platform Global Settings & Exchange Rates
INSERT INTO public.platform_settings (id, usd_to_rwf_rate, eur_to_rwf_rate, kes_to_rwf_rate, mtn_payment_number, airtel_payment_number, payment_name)
VALUES ('global', 1300, 1400, 10, '0788100100', '0733100100', 'VIRELLIX INC')
ON CONFLICT (id) DO UPDATE SET
  usd_to_rwf_rate = EXCLUDED.usd_to_rwf_rate,
  eur_to_rwf_rate = EXCLUDED.eur_to_rwf_rate,
  kes_to_rwf_rate = EXCLUDED.kes_to_rwf_rate,
  mtn_payment_number = EXCLUDED.mtn_payment_number,
  airtel_payment_number = EXCLUDED.airtel_payment_number,
  payment_name = EXCLUDED.payment_name;

-- 3. Demo Persona Accounts
INSERT INTO public.users (id, email, full_name, avatar_url, is_superadmin, created_at) VALUES 
('user-super', 'superadmin@impacto.rw', 'Gaby Prince Kabuye', NULL, TRUE, '2026-01-01T00:00:00Z'),
('user-admin', 'admin@impacto.rw', 'Anatole Mugisha', NULL, FALSE, '2026-02-01T00:00:00Z'),
('user-member', 'member@impacto.rw', 'Divine Uwera', NULL, FALSE, '2026-03-01T00:00:00Z'),
('user-donor', 'john@funder.org', 'John Radcliffe', NULL, FALSE, '2026-04-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 4. Initial Demonstration Organizations
INSERT INTO public.organizations (
  id, name, slug, tagline, description, mission, vision, logo_url, cover_url, primary_color, secondary_color,
  language, auto_confirm_members, donations_enabled, donation_mtn_number, donation_airtel_number,
  donation_account_name, donation_description, subscription_status, subscription_tier, subscription_plan,
  subscription_ends_at, trial_ends_at, grace_period_ends_at, member_limit, storage_unlimited,
  org_category, is_public_directory, allow_public_joining, created_at
) VALUES
(
  'org-rfc', 'Rwanda Forestry Center', 'rfc',
  'Restoring hillsides and greening Kigali''s future',
  'Our mission is to plant 1 million native trees across Eastern Province hillsides by 2028, training local cooperatives in agroforestry.',
  'To inspire community-led landscape restoration for climate resilience.',
  'A green and climate-resilient Rwanda with flourishing indigenous woodlands.',
  '🌳', '🌲', '#16a34a', '#ca8a04', 'en', TRUE, TRUE, '0788123456', '0733123456',
  'Rwanda Forestry Center', 'Support our hills nursery project in Kayonza. Every 1,000 RWF plants 2 native trees.',
  'active', 'pro', 'pro', '2027-12-31T23:59:59Z', '2027-12-31T23:59:59Z', '2028-01-03T23:59:59Z', 250, true,
  'Environment', TRUE, TRUE, '2026-01-10T12:00:00Z'
),
(
  'org-imbuto', 'Imbuto Scholars Foundation', 'imbuto',
  'Empowering underrepresented youth in ICT',
  'Imbuto Scholars Foundation matches high-potential high schoolers in Rwanda with top-tier tech mentorship and university scholarships.',
  'Unlocking extraordinary talent through quality secondary and tertiary resources.',
  'Leading tech-driven sustainable economies throughout East Africa.',
  '🎓', '📚', '#1d4ed8', '#f59e0b', 'en', FALSE, TRUE, '0788777888', '0733777888',
  'Imbuto Scholars Trust', 'Help buy laptops for 20 incoming female engineering students.',
  'trial', 'growth', 'growth', '2026-06-30T23:59:59Z', '2026-06-30T23:59:59Z', '2026-07-03T23:59:59Z', 30, false,
  'Education', TRUE, TRUE, '2026-05-01T08:00:00Z'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Membership Tiers
INSERT INTO public.member_tiers (id, org_id, name, annual_fee, currency, benefits, color) VALUES
('tier-gold', 'org-rfc', 'Gold Conservator', 50000, 'RWF', ARRAY['Priority planting access', 'Quarterly printed audits', 'Annual Forest banquet invitation'], '#ca8a04'),
('tier-bronze', 'org-rfc', 'Seedling Guardian', 10000, 'RWF', ARRAY['Eco-badge on active lists', 'Bi-annual planting meetups'], '#854d0e')
ON CONFLICT (id) DO NOTHING;

-- 6. Initial Memberships
INSERT INTO public.org_members (id, org_id, user_id, role, status, member_number, tier_id, joined_at) VALUES 
('member-1', 'org-rfc', 'user-admin', 'org_admin', 'active', 'RFC-001', 'tier-gold', '2026-01-10T14:00:00Z'),
('member-2', 'org-rfc', 'user-member', 'member', 'active', 'RFC-014', 'tier-bronze', '2026-03-01T09:00:00Z'),
('member-3', 'org-imbuto', 'user-admin', 'org_admin', 'active', 'IS-001', NULL, '2026-05-01T08:30:00Z')
ON CONFLICT (id) DO NOTHING;

-- 7. Operational Programs
INSERT INTO public.programs (id, org_id, name, description, status, created_at) VALUES
('prog-1', 'org-rfc', 'Eastern Province Reforestation', 'Reforesting hillsides in Kayonza, Nyagatare and Bugesera.', 'active', '2026-01-15T09:00:00Z'),
('prog-2', 'org-imbuto', 'ICT Mentorship Kigali', 'Connecting teenage developers with industry experts.', 'active', '2026-05-02T10:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 8. Demonstration Events
INSERT INTO public.events (id, org_id, title, description, date_time, end_time, location, online_link, program_id, max_attendees, is_public, qr_code_token, attendees_count, status) VALUES
('event-1', 'org-rfc', 'Eco-Restoration Planting Day at Mt. Kigali', 'Join us for our major mid-year planting session. We will meet at Nyarugenge side and plant 5,000 indigenous saplings. Gloves and lunch provided.', '2026-06-15T08:00:00Z', '2026-06-15T15:00:00Z', 'Mt. Kigali Forest Reserve, Kigali', NULL, 'prog-1', 150, TRUE, 'event-token-mtkigali', 82, 'upcoming'),
('event-2', 'org-rfc', 'Agroforestry Capacity Masterclass', 'Online training session on integrating grevillea and avocado trees into dryland bean farming systems.', '2026-05-28T14:00:00Z', '2026-05-28T16:00:00Z', 'Zoom Virtual Classroom', 'https://zoom.us/j/123456789', 'prog-1', 200, TRUE, 'event-token-mclass', 30, 'upcoming')
ON CONFLICT (id) DO NOTHING;

-- 9. Metric Goals
INSERT INTO public.goals (id, org_id, title, description, target, unit, current_progress, deadline, visibility, is_pinned, created_at) VALUES
('goal-1', 'org-rfc', 'Kayonza Indigenous Planting Initiative', 'Planting sustainable high-canopy trees to rebuild lost woodlands.', 25000, 'saplings', 18200, '2026-11-30T00:00:00Z', 'public', TRUE, '2026-01-12T00:00:00Z'),
('goal-2', 'org-imbuto', 'ICT mentorship scholars matched', 'Match scholarship beneficiaries with active professional software consultants in Rwanda.', 50, 'students', 15, '2026-12-31T00:00:00Z', 'public', FALSE, '2026-05-02T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 10. Marketplace Features Catalog (V2 Add-ons)
INSERT INTO public.marketplace_features (feature_id, name, theme, description, base_price, is_active) VALUES
('feat-quorum', 'Governance Quorum Validation', 'Governance', 'Automated quorum calculation and verification for board assemblies.', 12000, true),
('feat-esign', 'Document E-Signatures', 'Governance', 'Legally binding in-app signatures and acknowledgement tracking.', 15000, true),
('feat-audit', 'Full Audit Trail Historical Logs', 'Governance', 'Immutable, chronological log of all administrative actions.', 10000, true),
('feat-qr-att', 'QR Code Attendance Engine', 'Operations', 'Cryptographic QR check-in scanning for events and general meetings.', 8000, true),
('feat-asset', 'Asset & Inventory Tracker', 'Operations', 'Physical inventory and equipment tracking for cooperatives.', 12000, true),
('feat-offline', 'PWA Offline Sync Queue', 'Operations', 'Reliable offline operation for remote and field staff.', 14000, true),
('feat-pawapay', 'MTN/Airtel Live Payment APIs', 'Finance', 'Automated push-to-pay mobile money deposits powered by pawaPay.', 18000, true),
('feat-dues', 'Automated Member Dues Schedules', 'Finance', 'Automated recurring billing cycles with MoMo proof verification.', 12000, true),
('feat-export', 'Excel Attendance & Ledger Export', 'Finance', 'Professional multi-sheet Excel exports for accountants and donors.', 8000, true)
ON CONFLICT (feature_id) DO NOTHING;

-- 11. Curated Marketplace Packages (V2 Packs)
INSERT INTO public.marketplace_packages (package_id, name, description, feature_ids, package_price) VALUES
('gov-pack', 'Governance Pack', 'Ensure transparent assemblies, tamper-proof sign-offs, and complete accountability.', ARRAY['feat-quorum', 'feat-esign', 'feat-audit'], 25000),
('field-pack', 'Field Ops Pack', 'Equip field workers and cooperative agents with robust offline and QR tools.', ARRAY['feat-qr-att', 'feat-asset', 'feat-offline'], 20000),
('fintech-pack', 'Fintech & Dues Pack', 'Streamline collections with automated MoMo push-to-pay and robust financial exports.', ARRAY['feat-pawapay', 'feat-dues', 'feat-export'], 30000)
ON CONFLICT (package_id) DO NOTHING;

-- 12. Default Communication Channels
INSERT INTO public.chat_channels (id, org_id, name, type, channel_type, is_private, created_by) VALUES
('channel-rfc-gen', 'org-rfc', 'General Discussion', 'group', 'general', false, 'user-admin'),
('channel-rfc-ann', 'org-rfc', 'Official Announcements', 'announcement', 'announcement', false, 'user-admin'),
('channel-imbuto-gen', 'org-imbuto', 'Scholars Forum', 'group', 'general', false, 'user-admin')
ON CONFLICT (id) DO NOTHING;

-- 13. Default Member Dues Setup (Seed initial dues for demo members)
INSERT INTO public.member_fees (id, org_id, member_id, amount, currency, payment_period, period_date, status, created_at, admin_note) VALUES
('fee-demo-1', 'org-rfc', 'member-1', 5000, 'RWF', 'monthly', '2026-05', 'paid', NOW(), 'Initial Annual Registration Dues'),
('fee-demo-2', 'org-rfc', 'member-2', 5000, 'RWF', 'monthly', '2026-05', 'pending', NOW(), 'Standard Monthly Contribution')
ON CONFLICT (id) DO NOTHING;

-- 14. Default Produce Listing (Cooperative Marketplace)
INSERT INTO public.marketplace_products (id, org_id, title, description, price, currency, contact_info, created_by) VALUES
('prod-tree-saplings', 'org-rfc', 'Native Grevillea & Avocado Saplings (Pack of 50)', 'Healthy agroforestry saplings raised in Kayonza community nursery, ready for transplanting.', 25000, 'RWF', '+250 788 123 456 (Anatole)', 'user-admin'),
('prod-honey', 'org-rfc', 'Organic Forest Reserve Honey (1kg)', 'Pure wildflower honey harvested sustainably from cooperative apiaries on Mt. Kigali.', 8500, 'RWF', '+250 788 123 456 (Anatole)', 'user-admin')
ON CONFLICT (id) DO NOTHING;

-- 15. Default Share Capital Records
INSERT INTO public.share_capital (id, org_id, member_id, shares_count, share_value, total_paid, status, last_updated) VALUES
('share-rfc-1', 'org-rfc', 'member-1', 5, 10000, 50000, 'paid', NOW()),
('share-rfc-2', 'org-rfc', 'member-2', 2, 10000, 20000, 'paid', NOW())
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- DATABASE SCHEMA RE-INITIALIZATION & RESTORE SCRIPT COMPLETED
-- All 47 tables, indices, relations, security policies, storage buckets,
-- and seed accounts are now fully unified and ready for execution.
-- =====================================================================
-- =========================================================================
-- Impacto V2 — Database Schema Updates & RLS Policies for Supabase
-- Run this manually in your Supabase SQL Editor to support:
-- 1. Subscription, Trial, and Grace Period tracking
-- 2. pawaPay Push-to-Pay Deposits & Webhooks
-- 3. Feature Marketplace, Packages, and Custom Pricing
-- 4. Unlimited Storage & Member Cap enforcement
-- =========================================================================

-- Organizations table subscription & limits extensions
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'growth' CHECK (subscription_plan IN ('free', 'growth', 'pro', 'enterprise')),
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'grace_period', 'expired', 'cancelled')),
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT (now() + interval '30 days'),
ADD COLUMN IF NOT EXISTS grace_period_ends_at timestamptz DEFAULT (now() + interval '33 days'),
ADD COLUMN IF NOT EXISTS member_limit integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS storage_unlimited boolean DEFAULT false;

-- pawaPay Deposits Table
CREATE TABLE IF NOT EXISTS public.pawapay_deposits (
    deposit_id uuid PRIMARY KEY,
    org_id text NOT NULL,
    amount numeric NOT NULL,
    currency text DEFAULT 'RWF',
    phone_number text NOT NULL,
    provider text NOT NULL,
    status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'COMPLETED', 'FAILED', 'IN_RECONCILIATION')),
    client_reference_id text,
    provider_transaction_id text,
    failure_code text,
    failure_message text,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Marketplace Features Table
CREATE TABLE IF NOT EXISTS public.marketplace_features (
    feature_id text PRIMARY KEY,
    name text NOT NULL,
    theme text NOT NULL CHECK (theme IN ('Finance', 'Governance', 'Operations', 'Communication')),
    description text,
    base_price numeric DEFAULT 0.00,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Marketplace Packages Table (2-4 features grouped together)
CREATE TABLE IF NOT EXISTS public.marketplace_packages (
    package_id text PRIMARY KEY,
    name text NOT NULL,
    description text,
    feature_ids text[] NOT NULL,
    package_price numeric DEFAULT 0.00,
    created_at timestamptz DEFAULT now()
);

-- Organization Active Features / Packages
CREATE TABLE IF NOT EXISTS public.org_purchased_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id text NOT NULL,
    item_type text NOT NULL CHECK (item_type IN ('feature', 'package')),
    item_id text NOT NULL,
    expires_at timestamptz, -- automatically set 30 days if Free plan
    created_at timestamptz DEFAULT now()
);

-- Grant Permissions & Enable RLS
GRANT ALL ON TABLE public.pawapay_deposits TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.marketplace_features TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.marketplace_packages TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.org_purchased_items TO anon, authenticated, service_role;

-- Row Level Security Policies
ALTER TABLE public.pawapay_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_purchased_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_pawapay_deposits ON public.pawapay_deposits;
DROP POLICY IF EXISTS write_pawapay_deposits ON public.pawapay_deposits;
CREATE POLICY select_pawapay_deposits ON public.pawapay_deposits FOR SELECT USING (true);
CREATE POLICY write_pawapay_deposits ON public.pawapay_deposits FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS select_marketplace_features ON public.marketplace_features;
DROP POLICY IF EXISTS write_marketplace_features ON public.marketplace_features;
CREATE POLICY select_marketplace_features ON public.marketplace_features FOR SELECT USING (true);
CREATE POLICY write_marketplace_features ON public.marketplace_features FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS select_marketplace_packages ON public.marketplace_packages;
DROP POLICY IF EXISTS write_marketplace_packages ON public.marketplace_packages;
CREATE POLICY select_marketplace_packages ON public.marketplace_packages FOR SELECT USING (true);
CREATE POLICY write_marketplace_packages ON public.marketplace_packages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS select_org_purchased_items ON public.org_purchased_items;
DROP POLICY IF EXISTS write_org_purchased_items ON public.org_purchased_items;
CREATE POLICY select_org_purchased_items ON public.org_purchased_items FOR SELECT USING (true);
CREATE POLICY write_org_purchased_items ON public.org_purchased_items FOR ALL USING (true) WITH CHECK (true);
-- =====================================================================
-- IMPACTO SCHEMA UPDATE SCRIPT
-- =====================================================================
-- Multi-organization membership tracking & primary organization landing

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS primary_org_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS joined_org_ids TEXT[] DEFAULT '{}';

-- ---------------------------------------------------------------------
-- Table: ASSETS (Physical Equipment, IT Hardware & Inventory Tracking)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Equipment',
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
-- Table: CERTIFICATES (Official Workshop & Recognition Certificates)
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

-- ---------------------------------------------------------------------
-- Table: DOCUMENT_SIGNATURES (Touch/Cursor/Image Digital E-Signatures)
-- ---------------------------------------------------------------------
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

ALTER TABLE public.document_acknowledgements ADD COLUMN IF NOT EXISTS signature_data_url TEXT;
ALTER TABLE public.document_acknowledgements ADD COLUMN IF NOT EXISTS signature_type TEXT DEFAULT 'typed';
ALTER TABLE public.document_acknowledgements ADD COLUMN IF NOT EXISTS signer_name TEXT;
ALTER TABLE public.document_acknowledgements ADD COLUMN IF NOT EXISTS signer_role TEXT;
ALTER TABLE public.document_acknowledgements ADD COLUMN IF NOT EXISTS verification_hash TEXT;

-- ---------------------------------------------------------------------
-- Table: OFFLINE_SYNC_LOGS (PWA Field Operations Sync Audit)
-- ---------------------------------------------------------------------
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

-- ==============================================================================
-- ASSET & STOCK / INVENTORY MANAGEMENT MIGRATION
-- Compatible with both UUID and TEXT ID schemas
-- ==============================================================================

-- 1. Ensure the assets table exists with flexible types
CREATE TABLE IF NOT EXISTS public.assets (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    org_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'General Asset',
    quantity NUMERIC DEFAULT 1,
    quality TEXT,
    identifier TEXT,
    serial_number TEXT,
    purchase_date DATE DEFAULT CURRENT_DATE,
    purchase_cost NUMERIC DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'RWF',
    condition VARCHAR(50) DEFAULT 'good',
    assigned_to_member_id TEXT,
    assigned_to_name TEXT,
    location TEXT,
    status VARCHAR(50) DEFAULT 'operational',
    notes TEXT,
    qr_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add columns if table already existed under an older definition
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 1;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS quality TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS identifier TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS assigned_to_member_id TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS assigned_to_name TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'operational';
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS condition VARCHAR(50) DEFAULT 'good';
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS location TEXT;

-- 3. Indexes for fast filtering and search
CREATE INDEX IF NOT EXISTS idx_assets_org_id ON public.assets(org_id);
CREATE INDEX IF NOT EXISTS idx_assets_assigned_member ON public.assets(assigned_to_member_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_identifier ON public.assets(identifier);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Clean existing policies if re-running
DROP POLICY IF EXISTS "Allow members of org to view assets" ON public.assets;
DROP POLICY IF EXISTS "Allow staff to insert and manage assets" ON public.assets;
DROP POLICY IF EXISTS "Allow authenticated users full access to assets" ON public.assets;

-- 6. Add is_volunteer flag to org_members if not present
ALTER TABLE IF EXISTS public.org_members ADD COLUMN IF NOT EXISTS is_volunteer BOOLEAN DEFAULT false;

-- ==============================================================================
-- PLATFORM COMPLIANCE & AUDIT MIGRATION
-- ==============================================================================

-- 1. Ensure platform_staff table exists
CREATE TABLE IF NOT EXISTS public.platform_staff (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'auditor',
    status VARCHAR(50) DEFAULT 'active',
    last_active TIMESTAMPTZ,
    notes TEXT,
    permissions JSONB DEFAULT '{"can_audit_payments": true, "can_view_ledgers": true, "can_verify_members": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure platform_audit_logs table exists
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    action TEXT NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id TEXT,
    actor_id TEXT,
    actor_name TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add platform_role column to users
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS platform_role VARCHAR(50);













































