-- =====================================================================
-- IMPACTO OPERATING SYSTEM — MASTER DATABASE BACKUP & RESTORE SCRIPT
-- =====================================================================
-- Description: Complete, reproducible, deduplicated, and idempotent full-database
-- backup schema definition, relational foreign keys, performance indices,
-- Row-Level Security (RLS) policies, Realtime publications, and grants.
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
  platform_role TEXT DEFAULT 'user',
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
  referral_code TEXT,
  referred_by_code TEXT,
  referred_by_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely ensure columns exist on existing databases
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS platform_role TEXT DEFAULT 'user';
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
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by_user_id TEXT;
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
  dues_mtn_number TEXT,
  dues_airtel_number TEXT,
  dues_account_name TEXT,
  momo_merchant_code TEXT,
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

-- Safely ensure columns exist on existing databases
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS dues_mtn_number TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS dues_airtel_number TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS dues_account_name TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS momo_merchant_code TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS active_packages TEXT[] DEFAULT '{}';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS packages_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS bonus_member_slots INTEGER DEFAULT 0;
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
  phone_number TEXT,
  is_volunteer BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'not_required' CHECK (verification_status IN ('not_required', 'pending', 'verified', 'rejected', 'flagged')),
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
  tasks JSONB DEFAULT '[]'::jsonb,
  overall_progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'on-site';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS radius_meters NUMERIC DEFAULT 100;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_broadcasted BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS overall_progress INTEGER DEFAULT 0;

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
-- Table 10: SPACES & SPACE_BOOKINGS (Rentable Facility Spaces)
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
-- Table 11: MEETINGS & ACTION ITEMS
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
-- Table 12: CHAT CHANNELS & CHAT MESSAGES
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
-- Table 13: POLLS & POLL VOTES
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
-- Table 14: NEWS POSTS & ANNOUNCEMENTS
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
-- Table 15: GOALS, GOAL UPDATES & GRANTS
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
  period_label TEXT,
  achievement_percentage NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  is_deleted BOOLEAN DEFAULT false,
  last_edited_at TIMESTAMPTZ,
  last_note TEXT,
  user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.goal_updates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  goal_id TEXT NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  note TEXT,
  updated_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
-- Table 16: LEDGER ENTRIES, DONATIONS & MEMBER FEES
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

CREATE TABLE IF NOT EXISTS public.member_fees (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
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

-- ---------------------------------------------------------------------
-- Table 17: ERROR REPORTS, SUPPORT CONVERSATIONS & MESSAGES
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
  sender_type TEXT NOT NULL CHECK (sender_type IN ('superadmin', 'org_member')),
  sender_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  sender_name TEXT,
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS ticket_id TEXT;
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS error_report_id TEXT REFERENCES public.error_reports(id) ON DELETE CASCADE;
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- ---------------------------------------------------------------------
-- Table 18: SUBSCRIPTION PAYMENTS & PLATFORM SETTINGS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  package_id TEXT,
  item_type TEXT DEFAULT 'subscription',
  amount_usd NUMERIC NOT NULL,
  amount_local NUMERIC NOT NULL,
  method TEXT NOT NULL,
  phone TEXT NOT NULL,
  reference TEXT NOT NULL,
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

ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS package_id TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'subscription';
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS transaction_reference TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS pawapay_deposit_id TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS audited_by TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS audited_by_name TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS audit_notes TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS audited_at TIMESTAMPTZ;

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
-- Table 19: DOCUMENTS, ACKNOWLEDGEMENTS & RESIGNATIONS
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
-- Table 20: AUDIT LOGS & IDENTITY VERIFICATIONS
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

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_name TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS metadata_json JSONB;

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
-- Table 21: MARKETPLACE PRODUCTS, LEADS, SHARES, ACTIVITIES
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
  variables_applied JSONB DEFAULT '{}'::jsonb,
  activity_id TEXT REFERENCES public.activity_logs(id) ON DELETE SET NULL,
  event_id TEXT REFERENCES public.events(id) ON DELETE SET NULL,
  meeting_id TEXT REFERENCES public.meetings(id) ON DELETE SET NULL,
  sent_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
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

CREATE TABLE IF NOT EXISTS public.assets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Equipment',
  quantity INTEGER DEFAULT 1,
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
CREATE INDEX IF NOT EXISTS idx_spaces_org ON public.spaces(org_id);
CREATE INDEX IF NOT EXISTS idx_space_bookings_org ON public.space_bookings(org_id, date);
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
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_bookings ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_sync_logs ENABLE ROW LEVEL SECURITY;

-- Grant permissions to client roles
GRANT ALL ON TABLE public.users TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.organizations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.org_members TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.member_tiers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.programs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.events TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.event_attendance TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.event_rsvps TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.event_waitlist TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.spaces TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.space_bookings TO anon, authenticated, service_role;
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
GRANT ALL ON TABLE public.assets TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.certificates TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.document_signatures TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.offline_sync_logs TO anon, authenticated, service_role;

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

-- POLICIES: MEMBER_FEES
DROP POLICY IF EXISTS select_member_fees ON public.member_fees;
DROP POLICY IF EXISTS write_member_fees ON public.member_fees;
DROP POLICY IF EXISTS member_fees_select_policy ON public.member_fees;
DROP POLICY IF EXISTS member_fees_insert_accountant_only ON public.member_fees;
DROP POLICY IF EXISTS member_fees_delete_accountant_only ON public.member_fees;
DROP POLICY IF EXISTS member_fees_update_policy ON public.member_fees;

CREATE POLICY member_fees_select_policy ON public.member_fees FOR SELECT USING (true);
CREATE POLICY member_fees_insert_accountant_only ON public.member_fees FOR INSERT WITH CHECK (public.is_org_accountant(org_id, auth.uid()::text));
CREATE POLICY member_fees_delete_accountant_only ON public.member_fees FOR DELETE USING (public.is_org_accountant(org_id, auth.uid()::text));
CREATE POLICY member_fees_update_policy ON public.member_fees FOR UPDATE USING (true) WITH CHECK (true);

-- POLICIES: GENERAL TABLES OPEN ACCESS FOR READ/WRITE
CREATE POLICY write_member_tiers ON public.member_tiers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_programs ON public.programs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_events ON public.events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_event_attendance ON public.event_attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_event_rsvps ON public.event_rsvps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_event_waitlist ON public.event_waitlist FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_spaces ON public.spaces FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_space_bookings ON public.space_bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_meetings ON public.meetings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_action_items ON public.action_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_chat_channels ON public.chat_channels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_chat_messages ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_polls ON public.polls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_poll_votes ON public.poll_votes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_news_posts ON public.news_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_goals ON public.goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_goal_updates ON public.goal_updates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_grants ON public.grants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_ledger_entries ON public.ledger_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_donations ON public.donations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_error_reports ON public.error_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_subscription_payments ON public.subscription_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_platform_settings ON public.platform_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_documents ON public.documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_doc_ack ON public.document_acknowledgements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_resignations ON public.resignations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_audit_logs ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_support_conv ON public.support_conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_support_msg ON public.support_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_ident_verify ON public.identity_verifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_marketplace_products ON public.marketplace_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_marketplace_leads ON public.marketplace_leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_share_capital ON public.share_capital FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_share_transactions ON public.share_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_activity_logs ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_activity_attendance ON public.activity_attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_message_templates ON public.message_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_notification_sends ON public.notification_sends FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_password_reset_requests ON public.password_reset_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_pawapay_deposits ON public.pawapay_deposits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_marketplace_features ON public.marketplace_features FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_marketplace_packages ON public.marketplace_packages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_org_purchased_items ON public.org_purchased_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_assets ON public.assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_certificates ON public.certificates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_document_signatures ON public.document_signatures FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY write_offline_sync_logs ON public.offline_sync_logs FOR ALL USING (true) WITH CHECK (true);

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
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.error_reports;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
-- =====================================================================
-- COMPREHENSIVE UPDATE MIGRATION: Full Application Features & Schema
-- =====================================================================
-- Purpose:
-- 1. Alter all existing tables to support newly added columns safely.
-- 2. Create any missing tables (e.g. member_fees, subscription_payments, 
--    spaces, space_bookings, support_messages, error_reports, certificates, etc.).
-- 3. Update security functions and RLS policies for strict role access.
-- 4. Enable Realtime publication for member fees, events, and support messages.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ORGANIZATIONS TABLE UPDATES
-- ---------------------------------------------------------------------
ALTER TABLE IF EXISTS public.organizations 
  ADD COLUMN IF NOT EXISTS dues_account_name TEXT,
  ADD COLUMN IF NOT EXISTS dues_mtn_number TEXT,
  ADD COLUMN IF NOT EXISTS dues_airtel_number TEXT,
  ADD COLUMN IF NOT EXISTS momo_merchant_code TEXT,
  ADD COLUMN IF NOT EXISTS donation_account_name TEXT,
  ADD COLUMN IF NOT EXISTS donation_mtn_number TEXT,
  ADD COLUMN IF NOT EXISTS donation_airtel_number TEXT,
  ADD COLUMN IF NOT EXISTS donation_description TEXT,
  ADD COLUMN IF NOT EXISTS donations_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS active_packages TEXT[],
  ADD COLUMN IF NOT EXISTS packages_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS bonus_member_slots INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_rentable_spaces BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rentable_spaces JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS show_space_calendar_publicly BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by TEXT,
  ADD COLUMN IF NOT EXISTS verification_rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS referred_by_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by_user_id TEXT,
  ADD COLUMN IF NOT EXISTS location_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_us TEXT,
  ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS public_page_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_goals_publicly BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_impact_publicly BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_calendar_publicly BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_public_directory BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_public_joining BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS exit_survey_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS exit_survey_title TEXT,
  ADD COLUMN IF NOT EXISTS exit_survey_description TEXT,
  ADD COLUMN IF NOT EXISTS exit_survey_questions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS financial_summary_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS fee_notification TEXT,
  ADD COLUMN IF NOT EXISTS marketplace_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS sector TEXT,
  ADD COLUMN IF NOT EXISTS founded_date DATE,
  ADD COLUMN IF NOT EXISTS founders TEXT,
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS employee_count TEXT;

-- ---------------------------------------------------------------------
-- 2. USERS TABLE UPDATES
-- ---------------------------------------------------------------------
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS auth_user_id TEXT,
  ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS platform_role TEXT DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by_user_id TEXT,
  ADD COLUMN IF NOT EXISTS primary_org_id TEXT;

-- ---------------------------------------------------------------------
-- 3. ORG MEMBERS TABLE UPDATES
-- ---------------------------------------------------------------------
ALTER TABLE IF EXISTS public.org_members
  ADD COLUMN IF NOT EXISTS member_number TEXT,
  ADD COLUMN IF NOT EXISTS tier_id TEXT,
  ADD COLUMN IF NOT EXISTS is_volunteer BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by TEXT,
  ADD COLUMN IF NOT EXISTS passport_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS id_document_url TEXT,
  ADD COLUMN IF NOT EXISTS id_document_type TEXT,
  ADD COLUMN IF NOT EXISTS id_document_number TEXT,
  ADD COLUMN IF NOT EXISTS id_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------
-- 4. MEMBER FEES TABLE (DUES MANAGEMENT)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_fees (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
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

-- ---------------------------------------------------------------------
-- 5. EVENTS & ATTENDANCE TABLES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location TEXT,
  online_link TEXT,
  program_id TEXT,
  max_attendees INTEGER,
  is_public BOOLEAN DEFAULT false,
  qr_code_token TEXT,
  attendees_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'upcoming',
  is_deleted BOOLEAN DEFAULT false,
  last_edited_at TIMESTAMPTZ,
  location_type TEXT DEFAULT 'on-site',
  latitude NUMERIC,
  longitude NUMERIC,
  radius_meters NUMERIC,
  is_broadcasted BOOLEAN DEFAULT false,
  tasks JSONB DEFAULT '[]'::jsonb,
  overall_progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'on-site';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS radius_meters NUMERIC;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_broadcasted BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS overall_progress INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.event_attendance (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_in_method TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'present',
  attempt_lat NUMERIC,
  attempt_lng NUMERIC,
  distance_meters NUMERIC
);

-- ---------------------------------------------------------------------
-- 6. RENTABLE SPACES & BOOKINGS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spaces (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
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
  org_id TEXT NOT NULL,
  space_id TEXT NOT NULL,
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
-- 7. SUBSCRIPTION PAYMENTS TABLE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  plan TEXT NOT NULL,
  package_id TEXT,
  item_type TEXT DEFAULT 'subscription',
  amount_usd NUMERIC DEFAULT 0,
  amount_local NUMERIC DEFAULT 0,
  method TEXT NOT NULL,
  phone TEXT,
  reference TEXT,
  transaction_reference TEXT,
  pawapay_deposit_id TEXT,
  payer_name TEXT,
  comment TEXT,
  plan_details TEXT,
  proof_url TEXT,
  status TEXT DEFAULT 'awaiting_approval',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  audited_by TEXT,
  audited_by_name TEXT,
  audit_notes TEXT,
  audited_at TIMESTAMPTZ
);

ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS package_id TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'subscription';
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS transaction_reference TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS pawapay_deposit_id TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS audited_by TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS audited_by_name TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS audit_notes TEXT;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS audited_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------
-- 8. ERROR REPORTS & DIRECT INCIDENT SUPPORT MESSAGES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.error_reports (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  screenshot_url TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'open',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT,
  error_report_id TEXT,
  org_id TEXT NOT NULL,
  sender_type TEXT NOT NULL DEFAULT 'org_member',
  sender_id TEXT NOT NULL,
  sender_name TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 9. ASSETS, CERTIFICATES & SIGNATURES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assets (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER DEFAULT 1,
  quality TEXT,
  identifier TEXT,
  serial_number TEXT,
  purchase_date DATE,
  purchase_cost NUMERIC,
  currency TEXT DEFAULT 'RWF',
  condition TEXT DEFAULT 'good',
  assigned_to_member_id TEXT,
  assigned_to_name TEXT,
  location TEXT,
  status TEXT DEFAULT 'operational',
  notes TEXT,
  qr_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.certificates (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  recipient_member_id TEXT,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  title TEXT NOT NULL,
  description TEXT,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  certificate_code TEXT NOT NULL,
  template_theme TEXT DEFAULT 'gold',
  signatory_name TEXT,
  signatory_title TEXT,
  signatory_signature_url TEXT,
  qr_verification_url TEXT,
  status TEXT DEFAULT 'issued',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.document_signatures (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signer_role TEXT,
  signature_type TEXT DEFAULT 'drawn',
  signature_data_url TEXT NOT NULL,
  document_version INTEGER DEFAULT 1,
  ip_address TEXT,
  user_agent TEXT,
  verification_hash TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 10. PLATFORM SETTINGS
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

-- Insert default row if not exists
INSERT INTO public.platform_settings (id, usd_to_rwf_rate, eur_to_rwf_rate, kes_to_rwf_rate)
VALUES ('default', 1400, 1450, 10)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 11. AUDIT LOGS & PLATFORM AUDIT LOGS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  performed_by TEXT,
  action TEXT,
  action_label TEXT,
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

ALTER TABLE IF EXISTS public.audit_logs 
  ADD COLUMN IF NOT EXISTS action_type TEXT,
  ADD COLUMN IF NOT EXISTS actor_name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS metadata_json JSONB;

-- ---------------------------------------------------------------------
-- 12. HELPER FUNCTIONS & ROLE AUTHORIZATION
-- ---------------------------------------------------------------------
-- Accountant verification helper function
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

  -- 1. Superadmins have universal access
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE (id = v_uid OR auth_user_id = v_uid) 
      AND is_superadmin = true
  ) THEN
    RETURN true;
  END IF;

  -- 2. Verify active cooperative membership with role = 'accountant'
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

-- Overload for UUID org_id
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

-- Update accountant permissions on org_members
UPDATE public.org_members
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{manage_finance}',
  'true'::jsonb
)
WHERE role = 'accountant';

-- ---------------------------------------------------------------------
-- 13. ROW LEVEL SECURITY (RLS) POLICIES & GRANTS
-- ---------------------------------------------------------------------
ALTER TABLE public.member_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Member fees policies
DROP POLICY IF EXISTS member_fees_select_policy ON public.member_fees;
DROP POLICY IF EXISTS member_fees_insert_accountant_only ON public.member_fees;
DROP POLICY IF EXISTS member_fees_delete_accountant_only ON public.member_fees;
DROP POLICY IF EXISTS member_fees_update_policy ON public.member_fees;

CREATE POLICY member_fees_select_policy ON public.member_fees FOR SELECT USING (true);
CREATE POLICY member_fees_insert_accountant_only ON public.member_fees FOR INSERT WITH CHECK (public.is_org_accountant(org_id, auth.uid()::text));
CREATE POLICY member_fees_delete_accountant_only ON public.member_fees FOR DELETE USING (public.is_org_accountant(org_id, auth.uid()::text));
CREATE POLICY member_fees_update_policy ON public.member_fees FOR UPDATE USING (true) WITH CHECK (true);

-- Support messages policies
DROP POLICY IF EXISTS support_messages_select ON public.support_messages;
DROP POLICY IF EXISTS support_messages_insert ON public.support_messages;

CREATE POLICY support_messages_select ON public.support_messages FOR SELECT USING (true);
CREATE POLICY support_messages_insert ON public.support_messages FOR INSERT WITH CHECK (true);

-- Table access grants
GRANT ALL ON TABLE public.member_fees TO authenticated, service_role;
GRANT SELECT ON TABLE public.member_fees TO anon;

GRANT ALL ON TABLE public.organizations TO authenticated, service_role;
GRANT SELECT ON TABLE public.organizations TO anon;

GRANT ALL ON TABLE public.users TO authenticated, service_role;
GRANT SELECT ON TABLE public.users TO anon;

GRANT ALL ON TABLE public.org_members TO authenticated, service_role;
GRANT SELECT ON TABLE public.org_members TO anon;

GRANT ALL ON TABLE public.events TO authenticated, service_role;
GRANT SELECT ON TABLE public.events TO anon;

GRANT ALL ON TABLE public.event_attendance TO authenticated, service_role;
GRANT SELECT ON TABLE public.event_attendance TO anon;

GRANT ALL ON TABLE public.spaces TO authenticated, service_role;
GRANT SELECT ON TABLE public.spaces TO anon;

GRANT ALL ON TABLE public.space_bookings TO authenticated, service_role;
GRANT SELECT ON TABLE public.space_bookings TO anon;

GRANT ALL ON TABLE public.subscription_payments TO authenticated, service_role;
GRANT SELECT ON TABLE public.subscription_payments TO anon;

GRANT ALL ON TABLE public.error_reports TO authenticated, service_role;
GRANT SELECT ON TABLE public.error_reports TO anon;

GRANT ALL ON TABLE public.support_messages TO authenticated, service_role;
GRANT SELECT ON TABLE public.support_messages TO anon;

GRANT ALL ON TABLE public.assets TO authenticated, service_role;
GRANT SELECT ON TABLE public.assets TO anon;

GRANT ALL ON TABLE public.certificates TO authenticated, service_role;
GRANT SELECT ON TABLE public.certificates TO anon;

GRANT ALL ON TABLE public.document_signatures TO authenticated, service_role;
GRANT SELECT ON TABLE public.document_signatures TO anon;

GRANT ALL ON TABLE public.platform_settings TO authenticated, service_role;
GRANT SELECT ON TABLE public.platform_settings TO anon;

GRANT ALL ON TABLE public.audit_logs TO authenticated, service_role;
GRANT SELECT ON TABLE public.audit_logs TO anon;

-- ---------------------------------------------------------------------
-- 14. REALTIME PUBLICATION SETUP
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'member_fees'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.member_fees;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'support_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'error_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.error_reports;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;



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

-- 2b. Meetings Table Column Alterations for Full Live History
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

-- =====================================================================
-- 7. Tasks & Task Checklists Tables DDL with Foreign Keys & Timestamps
-- =====================================================================
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

-- Indices
CREATE INDEX IF NOT EXISTS idx_tasks_goal ON public.tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_event ON public.tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_task_checklists_task ON public.task_checklists(task_id);

-- RLS & Policies
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'allow_all_tasks') THEN
    CREATE POLICY allow_all_tasks ON public.tasks FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_checklists' AND policyname = 'allow_all_task_checklists') THEN
    CREATE POLICY allow_all_task_checklists ON public.task_checklists FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON TABLE public.tasks TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.task_checklists TO anon, authenticated, service_role;

-- Realtime Publication for tasks and task_checklists
DO $$
BEGIN
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
  meeting_code TEXT,
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
  ADD COLUMN IF NOT EXISTS meeting_code TEXT,
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

-- ============================================================================
-- IMPACTO LIVE MEET & WEBRTC SIGNALING SUPABASE STABILITY SCHEMA (update.sql)
-- ============================================================================

-- 1. Meetings Table
CREATE TABLE IF NOT EXISTS public.meetings (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  meeting_title TEXT,
  meeting_code TEXT,
  channel_name TEXT,
  date_time TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  is_public BOOLEAN DEFAULT true,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration INTEGER,
  duration_seconds INTEGER,
  duration_formatted TEXT,
  location TEXT,
  location_type TEXT,
  recorded_by TEXT,
  participants JSONB DEFAULT '[]'::jsonb,
  documents_used JSONB DEFAULT '[]'::jsonb,
  notes JSONB DEFAULT '[]'::jsonb,
  chat_messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist on pre-existing public.meetings deployments
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS meeting_title TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS meeting_code TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS channel_name TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS channel_id TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS host_id TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS host_name TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS date_time TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 60;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS duration_formatted TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Online Meet';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'online';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS recorded_by TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS documents_used JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS chat_messages JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Relax legacy NOT NULL constraints from db.sql for ad-hoc live meetings and allow 'active' status
ALTER TABLE public.meetings ALTER COLUMN date_time DROP NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN date_time SET DEFAULT NOW();
ALTER TABLE public.meetings ALTER COLUMN duration DROP NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN duration SET DEFAULT 60;
ALTER TABLE public.meetings ALTER COLUMN location DROP NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN location SET DEFAULT 'Online Meet';
ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_status_check;
ALTER TABLE public.meetings ADD CONSTRAINT meetings_status_check CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled'));

-- Ensure full row data on Supabase Realtime postgres_changes updates
ALTER TABLE public.meetings REPLICA IDENTITY FULL;

-- Indexes for fast, low-egress meeting code & organization status lookups
CREATE INDEX IF NOT EXISTS idx_meetings_code ON public.meetings (meeting_code);
CREATE INDEX IF NOT EXISTS idx_meetings_code_status ON public.meetings (meeting_code, status);
CREATE INDEX IF NOT EXISTS idx_meetings_org_status ON public.meetings (org_id, status);
CREATE INDEX IF NOT EXISTS idx_meetings_org_status_started ON public.meetings (org_id, status, started_at DESC);

-- 2. Meeting Sessions Table (Session Archive Metadata)
CREATE TABLE IF NOT EXISTS public.meeting_sessions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  meeting_title TEXT NOT NULL,
  channel_name TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  duration_formatted TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_sessions_org ON public.meeting_sessions (org_id);

-- 3. Meeting Participants Table
CREATE TABLE IF NOT EXISTS public.meeting_participants (
  id SERIAL PRIMARY KEY,
  session_id TEXT,
  meeting_id TEXT,
  peer_id TEXT,
  user_id TEXT,
  user_name TEXT,
  name TEXT,
  role TEXT,
  is_me BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ
);

ALTER TABLE public.meeting_participants ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE public.meeting_participants ADD COLUMN IF NOT EXISTS meeting_id TEXT;
ALTER TABLE public.meeting_participants ADD COLUMN IF NOT EXISTS peer_id TEXT;
ALTER TABLE public.meeting_participants ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.meeting_participants ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.meeting_participants ADD COLUMN IF NOT EXISTS is_me BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_meeting_participants_user ON public.meeting_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_session ON public.meeting_participants (session_id);

-- 4. Meeting Documents Table
CREATE TABLE IF NOT EXISTS public.meeting_documents (
  id SERIAL PRIMARY KEY,
  session_id TEXT,
  doc_id TEXT,
  name TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_documents_session ON public.meeting_documents (session_id);

-- 5. Meeting Notes / Agenda Action Items Table
CREATE TABLE IF NOT EXISTS public.meeting_notes (
  id SERIAL PRIMARY KEY,
  session_id TEXT,
  title TEXT,
  assignee TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_session ON public.meeting_notes (session_id);

-- 6. Meeting Chat Messages Table
CREATE TABLE IF NOT EXISTS public.meeting_chat_messages (
  id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  session_id TEXT,
  meeting_id TEXT,
  sender_id TEXT,
  sender_name TEXT,
  sender TEXT,
  text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.meeting_chat_messages ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE public.meeting_chat_messages ADD COLUMN IF NOT EXISTS meeting_id TEXT;
ALTER TABLE public.meeting_chat_messages ADD COLUMN IF NOT EXISTS sender TEXT;
ALTER TABLE public.meeting_chat_messages ADD COLUMN IF NOT EXISTS sender_name TEXT;

CREATE INDEX IF NOT EXISTS idx_meeting_chat_session ON public.meeting_chat_messages (session_id);

-- Enable Row Level Security (RLS) for stability & real-time access
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to ensure idempotency
DROP POLICY IF EXISTS "Enable all access for meetings" ON public.meetings;
DROP POLICY IF EXISTS "Enable all access for meeting_sessions" ON public.meeting_sessions;
DROP POLICY IF EXISTS "Enable all access for meeting_participants" ON public.meeting_participants;
DROP POLICY IF EXISTS "Enable all access for meeting_documents" ON public.meeting_documents;
DROP POLICY IF EXISTS "Enable all access for meeting_notes" ON public.meeting_notes;
DROP POLICY IF EXISTS "Enable all access for meeting_chat_messages" ON public.meeting_chat_messages;

-- Create permissive open policies for cross-device meeting room sync & real-time signaling
CREATE POLICY "Enable all access for meetings" ON public.meetings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for meeting_sessions" ON public.meeting_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for meeting_participants" ON public.meeting_participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for meeting_documents" ON public.meeting_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for meeting_notes" ON public.meeting_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for meeting_chat_messages" ON public.meeting_chat_messages FOR ALL USING (true) WITH CHECK (true);

-- Ensure Supabase Realtime publication includes meeting tables (idempotent)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_sessions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_participants;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_chat_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;





























//mark down from current database 
## Table `users`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `email` | `text` |  Unique |
| `full_name` | `text` |  |
| `avatar_url` | `text` |  Nullable |
| `is_superadmin` | `bool` |  Nullable |
| `auth_user_id` | `text` |  Nullable Unique |
| `created_at` | `timestamptz` |  Nullable |
| `primary_org_id` | `text` |  Nullable |
| `joined_org_ids` | `_text` |  Nullable |
| `platform_role` | `varchar` |  Nullable |

## Table `organizations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `name` | `text` |  |
| `slug` | `text` |  Unique |
| `tagline` | `text` |  |
| `description` | `text` |  |
| `mission` | `text` |  Nullable |
| `vision` | `text` |  Nullable |
| `logo_url` | `text` |  Nullable |
| `cover_url` | `text` |  Nullable |
| `primary_color` | `text` |  Nullable |
| `secondary_color` | `text` |  Nullable |
| `language` | `text` |  Nullable |
| `auto_confirm_members` | `bool` |  Nullable |
| `donations_enabled` | `bool` |  Nullable |
| `donation_mtn_number` | `text` |  Nullable |
| `donation_airtel_number` | `text` |  Nullable |
| `donation_account_name` | `text` |  Nullable |
| `donation_description` | `text` |  Nullable |
| `subscription_status` | `text` |  Nullable |
| `subscription_tier` | `text` |  Nullable |
| `subscription_ends_at` | `timestamptz` |  Nullable |
| `org_category` | `text` |  |
| `location_name` | `text` |  Nullable |
| `contact_us` | `text` |  Nullable |
| `gallery_urls` | `_text` |  Nullable |
| `dashboard_theme` | `text` |  Nullable |
| `dashboard_logo` | `text` |  Nullable |
| `fee_notification` | `text` |  Nullable |
| `quorum_type` | `text` |  Nullable |
| `quorum_value` | `int4` |  Nullable |
| `public_page_enabled` | `bool` |  Nullable |
| `show_goals_publicly` | `bool` |  Nullable |
| `show_impact_publicly` | `bool` |  Nullable |
| `is_public_directory` | `bool` |  Nullable |
| `allow_public_joining` | `bool` |  Nullable |
| `financial_summary_enabled` | `bool` |  Nullable |
| `marketplace_enabled` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `country` | `text` |  Nullable |
| `province` | `text` |  Nullable |
| `district` | `text` |  Nullable |
| `sector` | `text` |  Nullable |
| `founded_date` | `text` |  Nullable |
| `founders` | `text` |  Nullable |
| `registration_number` | `text` |  Nullable |
| `website` | `text` |  Nullable |
| `facebook_url` | `text` |  Nullable |
| `twitter_url` | `text` |  Nullable |
| `linkedin_url` | `text` |  Nullable |
| `employee_count` | `text` |  Nullable |
| `subscription_plan` | `text` |  Nullable |
| `trial_ends_at` | `timestamptz` |  Nullable |
| `grace_period_ends_at` | `timestamptz` |  Nullable |
| `member_limit` | `int4` |  Nullable |
| `storage_unlimited` | `bool` |  Nullable |
| `active_packages` | `jsonb` |  Nullable |
| `dues_account_name` | `text` |  Nullable |
| `dues_mtn_number` | `text` |  Nullable |
| `dues_airtel_number` | `text` |  Nullable |
| `momo_merchant_code` | `text` |  Nullable |

## Table `member_tiers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  Nullable |
| `name` | `text` |  |
| `annual_fee` | `numeric` |  Nullable |
| `currency` | `text` |  Nullable |
| `benefits` | `_text` |  Nullable |
| `color` | `text` |  Nullable |

## Table `org_members`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  Nullable |
| `user_id` | `text` |  Nullable |
| `role` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `member_number` | `text` |  Nullable |
| `tier_id` | `text` |  Nullable |
| `joined_at` | `timestamptz` |  Nullable |
| `verification_status` | `text` |  Nullable |
| `verified_at` | `timestamptz` |  Nullable |
| `verified_by` | `text` |  Nullable |
| `permissions` | `jsonb` |  Nullable |
| `is_volunteer` | `bool` |  Nullable |

## Table `programs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  Nullable |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  Nullable |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `date_time` | `timestamptz` |  |
| `end_time` | `timestamptz` |  Nullable |
| `location` | `text` |  |
| `online_link` | `text` |  Nullable |
| `program_id` | `text` |  Nullable |
| `max_attendees` | `int4` |  Nullable |
| `is_public` | `bool` |  Nullable |
| `qr_code_token` | `text` |  Nullable |
| `attendees_count` | `int4` |  Nullable |
| `status` | `text` |  Nullable |
| `is_deleted` | `bool` |  Nullable |
| `last_edited_at` | `timestamptz` |  Nullable |

## Table `event_attendance`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `event_id` | `text` |  Nullable |
| `member_id` | `text` |  Nullable |
| `check_in_time` | `timestamptz` |  Nullable |
| `check_in_method` | `text` |  Nullable |

## Table `event_rsvps`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `event_id` | `text` |  Nullable |
| `member_id` | `text` |  Nullable |
| `response` | `text` |  |
| `guests_count` | `int4` |  Nullable |
| `note` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `event_waitlist`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `event_id` | `text` |  Nullable |
| `member_id` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `meetings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  Nullable |
| `title` | `text` |  |
| `date_time` | `timestamptz` |  |
| `duration` | `int4` |  Nullable |
| `location` | `text` |  |
| `link` | `text` |  Nullable |
| `agenda` | `jsonb` |  Nullable |
| `minutes` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `quorum_required` | `int4` |  Nullable |
| `quorum_reached` | `bool` |  Nullable |
| `quorum_count_at_completion` | `int4` |  Nullable |
| `attendance_count` | `int4` |  Nullable |

## Table `action_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  Nullable |
| `meeting_id` | `text` |  Nullable |
| `title` | `text` |  |
| `assigned_to` | `text` |  Nullable |
| `due_date` | `timestamptz` |  |
| `status` | `text` |  Nullable |

## Table `chat_channels`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  Nullable |
| `name` | `text` |  |
| `type` | `text` |  Nullable |
| `channel_type` | `text` |  Nullable |
| `is_private` | `bool` |  Nullable |
| `created_by` | `text` |  Nullable |

## Table `chat_messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `channel_id` | `text` |  Nullable |
| `sender_id` | `text` |  Nullable |
| `text` | `text` |  |
| `attachment_url` | `text` |  Nullable |
| `message_type` | `text` |  Nullable |
| `file_url` | `text` |  Nullable |
| `file_name` | `text` |  Nullable |
| `file_size` | `int8` |  Nullable |
| `file_mime_type` | `text` |  Nullable |
| `voice_duration_seconds` | `int4` |  Nullable |
| `reply_to_id` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `news_posts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  Nullable |
| `title` | `text` |  |
| `body` | `text` |  |
| `excerpt` | `text` |  |
| `cover_url` | `text` |  Nullable |
| `category` | `text` |  |
| `visibility` | `text` |  Nullable |
| `is_pinned` | `bool` |  Nullable |
| `is_deleted` | `bool` |  Nullable |
| `author_id` | `text` |  Nullable |
| `published_at` | `timestamptz` |  Nullable |
| `last_edited_at` | `timestamptz` |  Nullable |
| `likes_count` | `int4` |  Nullable |
| `comments_count` | `int4` |  Nullable |

## Table `goals`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  Nullable |
| `title` | `text` |  |
| `description` | `text` |  |
| `target` | `numeric` |  Nullable |
| `unit` | `text` |  Nullable |
| `current_progress` | `numeric` |  Nullable |
| `deadline` | `timestamptz` |  |
| `visibility` | `text` |  Nullable |
| `is_pinned` | `bool` |  Nullable |
| `is_deleted` | `bool` |  Nullable |
| `last_edited_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `period_type` | `text` |  Nullable |
| `period_label` | `text` |  Nullable |
| `achievement_percentage` | `numeric` |  Nullable |
| `status` | `text` |  Nullable |
| `tasks` | `jsonb` |  Nullable |

## Table `goal_updates`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `goal_id` | `text` |  Nullable |
| `value` | `numeric` |  |
| `note` | `text` |  Nullable |
| `updated_by` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `grants`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  Nullable |
| `title` | `text` |  |
| `funder` | `text` |  |
| `amount_range` | `text` |  |
| `currency` | `text` |  Nullable |
| `deadline` | `timestamptz` |  |
| `link` | `text` |  Nullable |
| `eligibility` | `text` |  Nullable |
| `program_id` | `text` |  Nullable |
| `status` | `text` |  Nullable |

## Table `ledger_entries`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  Nullable |
| `type` | `text` |  |
| `amount` | `numeric` |  |
| `currency` | `text` |  Nullable |
| `category` | `text` |  |
| `description` | `text` |  |
| `date` | `timestamptz` |  |
| `reference` | `text` |  Nullable |
| `receipt_url` | `text` |  Nullable |
| `program_id` | `text` |  Nullable |
| `goal_id` | `text` |  Nullable |

## Table `donations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  Nullable |
| `amount` | `numeric` |  |
| `donor_name` | `text` |  |
| `donor_email` | `text` |  |
| `message` | `text` |  Nullable |
| `payment_method` | `text` |  |
| `proof_url` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `error_reports`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  Nullable |
| `title` | `text` |  |
| `description` | `text` |  |
| `screenshot_url` | `text` |  Nullable |
| `priority` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `admin_notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `subscription_payments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  Nullable |
| `plan` | `text` |  |
| `amount_usd` | `numeric` |  |
| `amount_local` | `numeric` |  |
| `method` | `text` |  |
| `phone` | `text` |  |
| `reference` | `text` |  |
| `proof_url` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `submitted_at` | `timestamptz` |  Nullable |
| `validated_at` | `timestamptz` |  Nullable |
| `audited_at` | `timestamptz` |  Nullable |
| `audited_by` | `text` |  Nullable |
| `audited_by_name` | `text` |  Nullable |
| `audit_notes` | `text` |  Nullable |
| `package_id` | `text` |  Nullable |
| `item_type` | `text` |  Nullable |
| `phone_number` | `text` |  Nullable |
| `transaction_reference` | `text` |  Nullable |
| `plan_details` | `text` |  Nullable |

## Table `platform_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `usd_to_rwf_rate` | `numeric` |  Nullable |
| `eur_to_rwf_rate` | `numeric` |  Nullable |
| `kes_to_rwf_rate` | `numeric` |  Nullable |
| `mtn_payment_number` | `text` |  Nullable |
| `airtel_payment_number` | `text` |  Nullable |
| `payment_name` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `documents`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  Nullable |
| `name` | `text` |  |
| `file_url` | `text` |  Nullable |
| `file_size` | `text` |  Nullable |
| `uploaded_by` | `text` |  Nullable |
| `uploader_name` | `text` |  Nullable |
| `requires_acknowledgement` | `bool` |  Nullable |
| `acknowledgement_deadline` | `date` |  Nullable |
| `content` | `text` |  Nullable |
| `file_type` | `text` |  Nullable |
| `recipient_member_ids` | `_text` |  Nullable |
| `is_letter` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `is_private` | `bool` |  Nullable |

## Table `document_acknowledgements`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `document_id` | `text` |  Nullable |
| `member_id` | `text` |  Nullable |
| `org_id` | `text` |  Nullable |
| `document_version` | `int4` |  |
| `acknowledged_at` | `timestamptz` |  Nullable |
| `signature_data_url` | `text` |  Nullable |
| `signature_type` | `text` |  Nullable |
| `signer_name` | `text` |  Nullable |
| `signer_role` | `text` |  Nullable |
| `verification_hash` | `text` |  Nullable |

## Table `resignations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `member_id` | `text` |  Nullable |
| `org_id` | `text` |  Nullable |
| `reason_category` | `text` |  Nullable |
| `reason_detail` | `text` |  Nullable |
| `submitted_at` | `timestamptz` |  Nullable |
| `finalized_at` | `timestamptz` |  Nullable |
| `cancelled_at` | `timestamptz` |  Nullable |
| `status` | `text` |  Nullable |
| `admin_response` | `text` |  Nullable |
| `admin_responded_at` | `timestamptz` |  Nullable |
| `admin_responded_by` | `text` |  Nullable |

## Table `audit_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  Nullable |
| `performed_by` | `text` |  Nullable |
| `action` | `text` |  |
| `action_label` | `text` |  |
| `target_table` | `text` |  Nullable |
| `target_id` | `text` |  Nullable |
| `target_label` | `text` |  Nullable |
| `old_value` | `jsonb` |  Nullable |
| `new_value` | `jsonb` |  Nullable |
| `ip_address` | `text` |  Nullable |
| `user_agent` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `action_type` | `text` |  Nullable |
| `actor_name` | `text` |  Nullable |
| `description` | `text` |  Nullable |
| `metadata_json` | `jsonb` |  Nullable |

## Table `support_conversations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  Nullable |
| `created_by` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `support_messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `conversation_id` | `text` |  Nullable |
| `sender_type` | `text` |  |
| `sender_id` | `text` |  Nullable |
| `message_text` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `identity_verifications`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `member_id` | `text` |  Nullable |
| `national_id_number` | `text` |  |
| `id_card_front_url` | `text` |  Nullable |
| `id_card_back_url` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `submitted_at` | `timestamptz` |  Nullable |
| `reviewed_at` | `timestamptz` |  Nullable |
| `reviewer_id` | `text` |  Nullable |
| `rejection_reason` | `text` |  Nullable |
| `org_id` | `text` |  Nullable |

## Table `member_fees`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  |
| `member_id` | `text` |  |
| `amount` | `numeric` |  |
| `currency` | `text` |  |
| `payment_period` | `text` |  |
| `period_date` | `text` |  |
| `status` | `text` |  |
| `paid_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `paid_by_method` | `text` |  Nullable |
| `transaction_reference` | `text` |  Nullable |
| `sender_info` | `text` |  Nullable |
| `reported_at` | `timestamptz` |  Nullable |
| `report_note` | `text` |  Nullable |
| `admin_note` | `text` |  Nullable |
| `proof_url` | `text` |  Nullable |
| `due_date` | `date` |  Nullable |
| `is_recurring` | `bool` |  Nullable |

## Table `marketplace_products`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  |
| `title` | `text` |  |
| `description` | `text` |  |
| `price` | `numeric` |  |
| `currency` | `text` |  |
| `image_url` | `text` |  Nullable |
| `contact_info` | `text` |  |
| `created_by` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `marketplace_leads`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `product_id` | `text` |  |
| `member_id` | `text` |  |
| `message` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `share_capital`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  |
| `member_id` | `text` |  |
| `shares_count` | `int4` |  |
| `share_value` | `numeric` |  |
| `total_paid` | `numeric` |  |
| `status` | `text` |  |
| `last_updated` | `timestamptz` |  Nullable |

## Table `share_transactions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  |
| `member_id` | `text` |  |
| `shares_added` | `int4` |  |
| `amount_paid` | `numeric` |  |
| `transaction_date` | `timestamptz` |  Nullable |
| `recorded_by` | `text` |  |

## Table `activity_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  Nullable |
| `program_id` | `text` |  Nullable |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `location` | `text` |  Nullable |
| `activity_date` | `date` |  |
| `created_by` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `activity_attendance`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `activity_id` | `text` |  Nullable |
| `member_id` | `text` |  Nullable |
| `recorded_by` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `message_templates`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  Nullable |
| `name` | `text` |  |
| `occasion` | `text` |  Nullable |
| `subject` | `text` |  Nullable |
| `body` | `text` |  |
| `variables` | `_text` |  Nullable |
| `is_system_template` | `bool` |  Nullable |
| `created_by` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `notification_sends`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  Nullable |
| `template_id` | `text` |  Nullable |
| `channels` | `_text` |  Nullable |
| `recipient_ids` | `_text` |  Nullable |
| `variables_applied` | `jsonb` |  Nullable |
| `sent_by` | `text` |  Nullable |
| `sent_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `recipient_group` | `text` |  Nullable |
| `recipient_count` | `int4` |  Nullable |
| `body_text` | `text` |  Nullable |

## Table `polls`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `poll_id` | `text` | Primary |
| `message_id` | `text` |  Nullable |
| `channel_id` | `text` |  |
| `question` | `text` |  |
| `options` | `jsonb` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `poll_votes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `poll_id` | `text` |  |
| `user_id` | `text` |  |
| `option_index` | `int4` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `password_reset_requests`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `text` |  |
| `user_id` | `text` |  Nullable |
| `email` | `text` |  |
| `full_name` | `text` |  Nullable |
| `requested_password` | `text` |  Nullable |
| `reason` | `text` |  Nullable |
| `status` | `text` |  |
| `requested_at` | `timestamptz` |  |
| `resolved_at` | `timestamptz` |  Nullable |
| `resolved_by` | `text` |  Nullable |

## Table `pawapay_deposits`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `deposit_id` | `uuid` | Primary |
| `org_id` | `text` |  |
| `amount` | `numeric` |  |
| `currency` | `text` |  Nullable |
| `phone_number` | `text` |  |
| `provider` | `text` |  |
| `status` | `text` |  Nullable |
| `client_reference_id` | `text` |  Nullable |
| `provider_transaction_id` | `text` |  Nullable |
| `failure_code` | `text` |  Nullable |
| `failure_message` | `text` |  Nullable |
| `metadata` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `marketplace_features`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `feature_id` | `text` | Primary |
| `name` | `text` |  |
| `theme` | `text` |  |
| `description` | `text` |  Nullable |
| `base_price` | `numeric` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `marketplace_packages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `package_id` | `text` | Primary |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `feature_ids` | `_text` |  |
| `package_price` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `org_purchased_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `text` |  |
| `item_type` | `text` |  |
| `item_id` | `text` |  |
| `expires_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `assets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  |
| `name` | `text` |  |
| `category` | `text` |  |
| `serial_number` | `text` |  Nullable |
| `purchase_date` | `date` |  Nullable |
| `purchase_cost` | `numeric` |  Nullable |
| `currency` | `text` |  Nullable |
| `condition` | `text` |  Nullable |
| `assigned_to_member_id` | `text` |  Nullable |
| `assigned_to_name` | `text` |  Nullable |
| `location` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `qr_code` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `quantity` | `numeric` |  Nullable |
| `quality` | `text` |  Nullable |
| `identifier` | `text` |  Nullable |

## Table `certificates`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  |
| `recipient_member_id` | `text` |  Nullable |
| `recipient_name` | `text` |  |
| `recipient_email` | `text` |  Nullable |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `issue_date` | `date` |  |
| `expiry_date` | `date` |  Nullable |
| `certificate_code` | `text` |  Unique |
| `template_theme` | `text` |  Nullable |
| `signatory_name` | `text` |  |
| `signatory_title` | `text` |  |
| `signatory_signature_url` | `text` |  Nullable |
| `qr_verification_url` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `document_signatures`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `document_id` | `text` |  |
| `member_id` | `text` |  |
| `org_id` | `text` |  |
| `signer_name` | `text` |  |
| `signer_email` | `text` |  Nullable |
| `signer_role` | `text` |  Nullable |
| `signature_type` | `text` |  Nullable |
| `signature_data_url` | `text` |  |
| `document_version` | `int4` |  |
| `ip_address` | `text` |  Nullable |
| `user_agent` | `text` |  Nullable |
| `verification_hash` | `text` |  Nullable |
| `signed_at` | `timestamptz` |  Nullable |

## Table `offline_sync_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `org_id` | `text` |  |
| `performed_by` | `text` |  Nullable |
| `operation` | `text` |  |
| `entity` | `text` |  |
| `payload` | `jsonb` |  Nullable |
| `client_timestamp` | `timestamptz` |  |
| `synced_at` | `timestamptz` |  Nullable |
| `status` | `text` |  Nullable |

## Table `platform_staff`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `email` | `text` |  Unique |
| `username` | `text` |  |
| `full_name` | `text` |  |
| `role` | `varchar` |  Nullable |
| `status` | `varchar` |  Nullable |
| `last_active` | `timestamptz` |  Nullable |
| `notes` | `text` |  Nullable |
| `permissions` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `platform_audit_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `action` | `text` |  |
| `target_type` | `varchar` |  |
| `target_id` | `text` |  Nullable |
| `actor_id` | `text` |  Nullable |
| `actor_name` | `text` |  Nullable |
| `details` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## RLS Policies

### `action_items`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_action_items` | SELECT | public | PERMISSIVE | `is_member_of_org(org_id, (auth.uid())::text)` | — |
| `write_action_items` | ALL | public | PERMISSIVE | `is_member_of_org(org_id, (auth.uid())::text)` | — |

### `chat_channels`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_chat_channels` | SELECT | public | PERMISSIVE | `is_member_of_org(org_id, (auth.uid())::text)` | — |
| `write_chat_channels` | ALL | public | PERMISSIVE | `is_member_of_org(org_id, (auth.uid())::text)` | — |

### `goal_updates`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_goal_updates` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM goals   WHERE ((goals.id = goal_updates.goal_id) AND ((goals.visibility = 'public'::text) OR is_member_of_org(goals.org_id, (auth.uid())::text)))))` | — |
| `write_goal_updates` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM goals   WHERE ((goals.id = goal_updates.goal_id) AND is_member_of_org(goals.org_id, (auth.uid())::text))))` | — |

### `support_conversations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_support_conv` | SELECT | public | PERMISSIVE | `(is_member_of_org(org_id, (auth.uid())::text) OR is_platform_superadmin((auth.uid())::text))` | — |
| `write_support_conv` | ALL | public | PERMISSIVE | `(is_member_of_org(org_id, (auth.uid())::text) OR is_platform_superadmin((auth.uid())::text))` | — |

### `support_messages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_support_msg` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM support_conversations   WHERE ((support_conversations.id = support_messages.conversation_id) AND (is_member_of_org(support_conversations.org_id, (auth.uid())::text) OR is_platform_superadmin((auth.uid())::text)))))` | — |
| `write_support_msg` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM support_conversations   WHERE ((support_conversations.id = support_messages.conversation_id) AND (is_member_of_org(support_conversations.org_id, (auth.uid())::text) OR is_platform_superadmin((auth.uid())::text)))))` | — |

### `marketplace_products`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow anyone with membership to browse products` | SELECT | public | PERMISSIVE | `(org_id IN ( SELECT org_members.org_id    FROM org_members   WHERE (org_members.user_id = (auth.uid())::text)))` | — |
| `Allow organization admins to list or delete products` | ALL | public | PERMISSIVE | `(org_id IN ( SELECT org_members.org_id    FROM org_members   WHERE ((org_members.user_id = (auth.uid())::text) AND ((org_members.role = 'org_admin'::text) OR (org_members.role = 'manager'::text)))))` | — |

### `member_fees`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow members of the organization to read fees` | SELECT | public | PERMISSIVE | `true` | — |
| `Allow members to update their own fees for reporting` | UPDATE | public | PERMISSIVE | `true` | — |
| `Allow organization admins to manage fees` | ALL | public | PERMISSIVE | `true` | — |
| `member_fees_delete_accountant_only` | DELETE | public | PERMISSIVE | `is_org_accountant(org_id, (auth.uid())::text)` | — |
| `member_fees_insert_accountant_only` | INSERT | public | PERMISSIVE | — | `is_org_accountant(org_id, (auth.uid())::text)` |
| `member_fees_select_policy` | SELECT | public | PERMISSIVE | `true` | — |
| `member_fees_update_policy` | UPDATE | public | PERMISSIVE | `true` | `true` |

### `marketplace_leads`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow admins to scan purchase leads` | SELECT | public | PERMISSIVE | `(product_id IN ( SELECT marketplace_products.id    FROM marketplace_products   WHERE (marketplace_products.org_id IN ( SELECT org_members.org_id            FROM org_members           WHERE ((org_members.user_id = (auth.uid())::text) AND ((org_members.role = 'org_admin'::text) OR (org_members.role = 'manager'::text)))))))` | — |
| `Allow members to express interest in products` | INSERT | public | PERMISSIVE | — | `(member_id IN ( SELECT org_members.id    FROM org_members   WHERE (org_members.user_id = (auth.uid())::text)))` |

### `share_capital`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow admins and accountants to manage share capital` | ALL | public | PERMISSIVE | `(org_id IN ( SELECT org_members.org_id    FROM org_members   WHERE ((org_members.user_id = (auth.uid())::text) AND ((org_members.role = 'org_admin'::text) OR (org_members.role = 'accountant'::text)))))` | — |
| `Allow members of organization to read share capital` | SELECT | public | PERMISSIVE | `(org_id IN ( SELECT org_members.org_id    FROM org_members   WHERE (org_members.user_id = (auth.uid())::text)))` | — |

### `audit_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_audit_logs` | SELECT | public | PERMISSIVE | `is_member_of_org(org_id, (auth.uid())::text)` | — |
| `write_audit_logs` | ALL | public | PERMISSIVE | `is_member_of_org(org_id, (auth.uid())::text)` | — |

### `share_transactions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow admins and accountants to manage share transactions` | ALL | public | PERMISSIVE | `(org_id IN ( SELECT org_members.org_id    FROM org_members   WHERE ((org_members.user_id = (auth.uid())::text) AND ((org_members.role = 'org_admin'::text) OR (org_members.role = 'accountant'::text)))))` | — |
| `Allow members to view share transactions` | SELECT | public | PERMISSIVE | `(org_id IN ( SELECT org_members.org_id    FROM org_members   WHERE (org_members.user_id = (auth.uid())::text)))` | — |

### `message_templates`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_message_templates` | SELECT | public | PERMISSIVE | `is_member_of_org(org_id, (auth.uid())::text)` | — |
| `write_message_templates` | ALL | public | PERMISSIVE | `is_admin_of_org(org_id, (auth.uid())::text)` | — |

### `notification_sends`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow public insert notification_sends` | INSERT | public | PERMISSIVE | — | `true` |
| `Allow public select notification_sends` | SELECT | public | PERMISSIVE | `true` | — |
| `allow_all_notification_sends` | ALL | public | PERMISSIVE | `true` | `true` |
| `select_notification_sends` | SELECT | public | PERMISSIVE | `is_member_of_org(org_id, (auth.uid())::text)` | — |
| `write_notification_sends` | ALL | public | PERMISSIVE | `is_admin_of_org(org_id, (auth.uid())::text)` | — |

### `donations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `insert_donations` | INSERT | public | PERMISSIVE | — | `true` |
| `select_donations` | SELECT | public | PERMISSIVE | `true` | — |
| `write_donations` | ALL | public | PERMISSIVE | `true` | `true` |

### `documents`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_documents` | SELECT | public | PERMISSIVE | `is_member_of_org(org_id, (auth.uid())::text)` | — |
| `write_documents` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM org_members   WHERE ((org_members.org_id = documents.org_id) AND (org_members.user_id = (auth.uid())::text) AND (org_members.role = ANY (ARRAY['org_admin'::text, 'manager'::text, 'accountant'::text])) AND (org_members.status = 'active'::text))))` | `(EXISTS ( SELECT 1    FROM org_members   WHERE ((org_members.org_id = documents.org_id) AND (org_members.user_id = (auth.uid())::text) AND (org_members.role = ANY (ARRAY['org_admin'::text, 'manager'::text, 'accountant'::text])) AND (org_members.status = 'active'::text))))` |

### `identity_verifications`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_ident_verify` | SELECT | public | PERMISSIVE | `true` | — |
| `write_ident_verify` | ALL | public | PERMISSIVE | `true` | `true` |

### `pawapay_deposits`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_pawapay_deposits` | SELECT | public | PERMISSIVE | `true` | — |
| `write_pawapay_deposits` | ALL | public | PERMISSIVE | `true` | `true` |

### `marketplace_features`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_marketplace_features` | SELECT | public | PERMISSIVE | `true` | — |
| `write_marketplace_features` | ALL | public | PERMISSIVE | `true` | `true` |

### `marketplace_packages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_marketplace_packages` | SELECT | public | PERMISSIVE | `true` | — |
| `write_marketplace_packages` | ALL | public | PERMISSIVE | `true` | `true` |

### `org_purchased_items`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_org_purchased_items` | SELECT | public | PERMISSIVE | `true` | — |
| `write_org_purchased_items` | ALL | public | PERMISSIVE | `true` | `true` |

### `password_reset_requests`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow members/admins to read password reset requests in their o` | SELECT | public | PERMISSIVE | `(((auth.uid())::text = user_id) OR (EXISTS ( SELECT 1    FROM org_members   WHERE ((org_members.org_id = password_reset_requests.org_id) AND (org_members.user_id = (auth.uid())::text) AND (org_members.role = ANY (ARRAY['org_admin'::text, 'superadmin'::text, 'manager'::text]))))))` | — |
| `Allow org admins to update password reset requests` | UPDATE | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM org_members   WHERE ((org_members.org_id = password_reset_requests.org_id) AND (org_members.user_id = (auth.uid())::text) AND (org_members.role = ANY (ARRAY['org_admin'::text, 'superadmin'::text])))))` | — |
| `Allow public insert for password reset requests` | INSERT | public | PERMISSIVE | — | `true` |

### `events`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_events` | SELECT | public | PERMISSIVE | `true` | — |
| `write_events` | ALL | public | PERMISSIVE | `true` | `true` |

### `event_attendance`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_event_attendance` | SELECT | public | PERMISSIVE | `true` | — |
| `write_event_attendance` | ALL | public | PERMISSIVE | `true` | `true` |

### `event_rsvps`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_event_rsvps` | SELECT | public | PERMISSIVE | `is_member_of_org(( SELECT events.org_id    FROM events   WHERE (events.id = event_rsvps.event_id)), (auth.uid())::text)` | — |
| `write_event_rsvps` | ALL | public | PERMISSIVE | `is_member_of_org(( SELECT events.org_id    FROM events   WHERE (events.id = event_rsvps.event_id)), (auth.uid())::text)` | — |

### `event_waitlist`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_event_waitlist` | SELECT | public | PERMISSIVE | `is_member_of_org(( SELECT events.org_id    FROM events   WHERE (events.id = event_waitlist.event_id)), (auth.uid())::text)` | — |
| `write_event_waitlist` | ALL | public | PERMISSIVE | `is_member_of_org(( SELECT events.org_id    FROM events   WHERE (events.id = event_waitlist.event_id)), (auth.uid())::text)` | — |

### `assets`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow members of org to view assets` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM org_members   WHERE ((org_members.org_id = assets.org_id) AND (org_members.user_id = (auth.uid())::text))))` | — |
| `Allow staff to insert and manage assets` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM org_members   WHERE ((org_members.org_id = assets.org_id) AND (org_members.user_id = (auth.uid())::text) AND (org_members.role = ANY (ARRAY['org_admin'::text, 'manager'::text, 'accountant'::text])))))` | — |

### `member_tiers`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_member_tiers` | SELECT | public | PERMISSIVE | `true` | — |
| `write_member_tiers` | ALL | public | PERMISSIVE | `is_admin_of_org(org_id, (auth.uid())::text)` | — |

### `programs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_programs` | SELECT | public | PERMISSIVE | `is_member_of_org(org_id, (auth.uid())::text)` | — |
| `write_programs` | ALL | public | PERMISSIVE | `is_admin_of_org(org_id, (auth.uid())::text)` | — |

### `document_acknowledgements`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_doc_ack` | SELECT | public | PERMISSIVE | `is_member_of_org(org_id, (auth.uid())::text)` | — |
| `write_doc_ack` | ALL | public | PERMISSIVE | `is_member_of_org(org_id, (auth.uid())::text)` | — |

### `subscription_payments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow insert subscription payments` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Allow select subscription payments` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |
| `Allow update subscription payments` | UPDATE | anon, authenticated | PERMISSIVE | `true` | `true` |
| `insert_subscription_payments` | INSERT | public | PERMISSIVE | — | `is_admin_of_org(org_id, (auth.uid())::text)` |
| `select_subscription_payments` | SELECT | public | PERMISSIVE | `(is_member_of_org(org_id, (auth.uid())::text) OR is_platform_superadmin((auth.uid())::text))` | — |
| `update_subscription_payments` | UPDATE | public | PERMISSIVE | `is_platform_superadmin((auth.uid())::text)` | — |

### `grants`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_grants` | SELECT | public | PERMISSIVE | `true` | — |
| `write_grants` | ALL | public | PERMISSIVE | `true` | `true` |

### `ledger_entries`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_ledger_entries` | SELECT | public | PERMISSIVE | `true` | — |
| `write_ledger_entries` | ALL | public | PERMISSIVE | `true` | `true` |

### `activity_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_activity_logs` | SELECT | public | PERMISSIVE | `is_member_of_org(org_id, (auth.uid())::text)` | — |
| `write_activity_logs` | ALL | public | PERMISSIVE | `is_member_of_org(org_id, (auth.uid())::text)` | — |

### `activity_attendance`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_activity_attendance` | SELECT | public | PERMISSIVE | `true` | — |
| `write_activity_attendance` | ALL | public | PERMISSIVE | `true` | — |

### `error_reports`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `insert_error_reports` | INSERT | public | PERMISSIVE | — | `true` |
| `select_error_reports` | SELECT | public | PERMISSIVE | `(is_member_of_org(org_id, (auth.uid())::text) OR is_platform_superadmin((auth.uid())::text))` | — |
| `update_error_reports` | UPDATE | public | PERMISSIVE | `(is_member_of_org(org_id, (auth.uid())::text) OR is_platform_superadmin((auth.uid())::text))` | — |

### `platform_settings`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_platform_settings` | SELECT | public | PERMISSIVE | `true` | — |
| `update_platform_settings` | UPDATE | public | PERMISSIVE | `is_platform_superadmin((auth.uid())::text)` | — |

### `chat_messages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `insert_chat_messages` | INSERT | public | PERMISSIVE | — | `((auth.uid())::text = sender_id)` |
| `select_chat_messages` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM chat_channels   WHERE ((chat_channels.id = chat_messages.channel_id) AND is_member_of_org(chat_channels.org_id, (auth.uid())::text))))` | — |

### `org_members`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `delete_org_members` | DELETE | public | PERMISSIVE | `(is_admin_of_org(org_id, (auth.uid())::text) OR is_platform_superadmin((auth.uid())::text))` | — |
| `insert_org_members` | INSERT | public | PERMISSIVE | — | `true` |
| `select_org_members` | SELECT | public | PERMISSIVE | `true` | — |
| `update_org_members` | UPDATE | public | PERMISSIVE | `(is_admin_of_org(org_id, (auth.uid())::text) OR (user_id ~~ 'user-%'::text) OR is_platform_superadmin((auth.uid())::text))` | — |

### `users`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `insert_users` | INSERT | public | PERMISSIVE | — | `true` |
| `select_users` | SELECT | public | PERMISSIVE | `true` | — |
| `update_users` | UPDATE | public | PERMISSIVE | `(((auth.uid())::text = id) OR (id ~~ 'user-%'::text) OR is_platform_superadmin((auth.uid())::text))` | — |

### `news_posts`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_news_posts` | SELECT | public | PERMISSIVE | `((visibility = 'public'::text) OR is_member_of_org(org_id, (auth.uid())::text))` | — |
| `write_news_posts` | ALL | public | PERMISSIVE | `is_admin_of_org(org_id, (auth.uid())::text)` | — |

### `organizations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `delete_organizations` | DELETE | public | PERMISSIVE | `(is_admin_of_org(id, (auth.uid())::text) OR is_platform_superadmin((auth.uid())::text))` | — |
| `insert_organizations` | INSERT | public | PERMISSIVE | — | `true` |
| `select_organizations` | SELECT | public | PERMISSIVE | `true` | — |
| `update_organizations` | UPDATE | public | PERMISSIVE | `(is_admin_of_org(id, (auth.uid())::text) OR (id ~~ 'org-%'::text) OR is_platform_superadmin((auth.uid())::text))` | — |

### `meetings`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_meetings` | SELECT | public | PERMISSIVE | `is_member_of_org(org_id, (auth.uid())::text)` | — |
| `write_meetings` | ALL | public | PERMISSIVE | `is_admin_of_org(org_id, (auth.uid())::text)` | — |

### `goals`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_goals` | SELECT | public | PERMISSIVE | `true` | — |
| `write_goals` | ALL | public | PERMISSIVE | `is_admin_of_org(org_id, (auth.uid())::text)` | — |

### `poll_votes`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow public delete poll_votes` | DELETE | public | PERMISSIVE | `true` | — |
| `Allow public insert poll_votes` | INSERT | public | PERMISSIVE | — | `true` |
| `Allow public select poll_votes` | SELECT | public | PERMISSIVE | `true` | — |
| `Allow public update poll_votes` | UPDATE | public | PERMISSIVE | `true` | — |

### `polls`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow public insert polls` | INSERT | public | PERMISSIVE | — | `true` |
| `Allow public select polls` | SELECT | public | PERMISSIVE | `true` | — |
| `Allow public update polls` | UPDATE | public | PERMISSIVE | `true` | — |

### `resignations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `select_resignations` | SELECT | public | PERMISSIVE | `true` | — |
| `write_resignations` | ALL | public | PERMISSIVE | `true` | `true` |

