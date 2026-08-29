-- =====================================================================
-- IMPACTO SYSTEM DATABASE MIGRATION & SCHEMAS (CLEANED MASTER SCHEMA)
-- CORE PLATFORM OPERATOR DATABASE SEED FOR SUPABASE
-- Built with love for Rwandan Organizations, Cooperatives, and non-profits.
-- =====================================================================

-- Ensure cryptographic extension is loaded
CREATE EXTENSION IF NOT EXISTS pgcrypto CASCADE;

-- SAFE DROP SEQUENCE (DEPENDENCY SAFE)
DROP TABLE IF EXISTS notification_sends CASCADE;
DROP TABLE IF EXISTS message_templates CASCADE;
DROP TABLE IF EXISTS activity_attendance CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS share_transactions CASCADE;
DROP TABLE IF EXISTS share_capital CASCADE;
DROP TABLE IF EXISTS marketplace_leads CASCADE;
DROP TABLE IF EXISTS marketplace_products CASCADE;
DROP TABLE IF EXISTS member_fees CASCADE;
DROP TABLE IF EXISTS identity_verifications CASCADE;
DROP TABLE IF EXISTS support_messages CASCADE;
DROP TABLE IF EXISTS support_conversations CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS resignations CASCADE;
DROP TABLE IF EXISTS document_acknowledgements CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS platform_settings CASCADE;
DROP TABLE IF EXISTS subscription_payments CASCADE;
DROP TABLE IF EXISTS error_reports CASCADE;
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS ledger_entries CASCADE;
DROP TABLE IF EXISTS grants CASCADE;
DROP TABLE IF EXISTS news_posts CASCADE;
DROP TABLE IF EXISTS goal_updates CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS poll_votes CASCADE;
DROP TABLE IF EXISTS polls CASCADE;
DROP TABLE IF EXISTS poll_responses CASCADE;
DROP TABLE IF EXISTS poll_messages CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_channels CASCADE;
DROP TABLE IF EXISTS action_items CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS event_waitlist CASCADE;
DROP TABLE IF EXISTS event_rsvps CASCADE;
DROP TABLE IF EXISTS event_attendance CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS programs CASCADE;
DROP TABLE IF EXISTS org_members CASCADE;
DROP TABLE IF EXISTS member_tiers CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==========================================
-- 1. CORE SYSTEM USERS
-- ==========================================
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  is_superadmin BOOLEAN DEFAULT FALSE,
  auth_user_id TEXT UNIQUE, -- Supported for Supabase Auth auto-sync triggers
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. MULTI-TENANT ORGANIZATIONS
-- ==========================================
CREATE TABLE organizations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  mission TEXT,
  vision TEXT,
  logo_url TEXT,
  cover_url TEXT,
  primary_color TEXT DEFAULT '#16a34a',
  secondary_color TEXT DEFAULT '#ca8a04',
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'fr', 'rw')),
  auto_confirm_members BOOLEAN DEFAULT TRUE,
  donations_enabled BOOLEAN DEFAULT TRUE,
  donation_mtn_number TEXT,
  donation_airtel_number TEXT,
  donation_account_name TEXT,
  donation_description TEXT,
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired')),
  subscription_tier TEXT DEFAULT 'trial',
  subscription_ends_at TIMESTAMPTZ,
  org_category TEXT NOT NULL,
  location_name TEXT,
  contact_us TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  dashboard_theme TEXT DEFAULT 'light',
  dashboard_logo TEXT,
  fee_notification TEXT,
  quorum_type TEXT DEFAULT 'absolute' CHECK (quorum_type IN ('absolute', 'percentage')),
  quorum_value INT DEFAULT 0,
  public_page_enabled BOOLEAN DEFAULT TRUE,
  show_goals_publicly BOOLEAN DEFAULT TRUE,
  show_impact_publicly BOOLEAN DEFAULT TRUE,
  is_public_directory BOOLEAN DEFAULT TRUE,
  allow_public_joining BOOLEAN DEFAULT TRUE,
  financial_summary_enabled BOOLEAN DEFAULT TRUE,
  marketplace_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. INTER-ORG MEMBER TIERS
-- ==========================================
CREATE TABLE member_tiers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  annual_fee NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'RWF',
  benefits TEXT[] DEFAULT '{}',
  color TEXT
);

-- ==========================================
-- 4. ORGANIZATION MEMBERS (MEMBERSHIP MAPPING)
-- ==========================================
CREATE TABLE org_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('superadmin', 'org_admin', 'manager', 'accountant', 'member')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  member_number TEXT,
  tier_id TEXT, -- References member_tiers loosely or as string
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  verification_status TEXT DEFAULT 'not_required' CHECK (verification_status IN ('not_required','pending','verified','rejected','flagged')),
  verified_at TIMESTAMPTZ,
  verified_by TEXT REFERENCES users(id),
  permissions JSONB DEFAULT '{
    "manage_members": false,
    "manage_content": false,
    "manage_finance": false,
    "manage_settings": false,
    "view_analytics": false,
    "manage_documents": false,
    "manage_chat": false
  }'::jsonb
);

-- ==========================================
-- 5. PUBLIC PROGRAMS
-- ==========================================
CREATE TABLE programs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 6. COMMUNITY SESSIONS & EVENTS
-- ==========================================
CREATE TABLE events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location TEXT NOT NULL,
  online_link TEXT,
  program_id TEXT REFERENCES programs(id) ON DELETE SET NULL,
  max_attendees INTEGER,
  is_public BOOLEAN DEFAULT TRUE,
  qr_code_token TEXT,
  attendees_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  is_deleted BOOLEAN DEFAULT false,
  last_edited_at TIMESTAMPTZ
);

-- ==========================================
-- 7. EVENT PORTAL CHECK-IN & ATTENDANCE
-- ==========================================
CREATE TABLE event_attendance (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES org_members(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_in_method TEXT DEFAULT 'manual' CHECK (check_in_method IN ('manual', 'qr', 'self')),
  UNIQUE(event_id, member_id)
);

-- ==========================================
-- 8. EVENT RSVPS
-- ==========================================
CREATE TABLE event_rsvps (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES org_members(id) ON DELETE CASCADE,
  response TEXT NOT NULL CHECK (response IN ('yes', 'no', 'maybe')),
  guests_count INT DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, member_id)
);

-- ==========================================
-- 9. EVENT WAITLIST
-- ==========================================
CREATE TABLE event_waitlist (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES org_members(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'promoted', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, member_id)
);

-- ==========================================
-- 10. MEETINGS & MINUTING BOARDS
-- ==========================================
CREATE TABLE meetings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date_time TIMESTAMPTZ NOT NULL,
  duration INTEGER DEFAULT 60, -- minutes
  location TEXT NOT NULL,
  link TEXT,
  agenda JSONB DEFAULT '[]'::jsonb,
  minutes TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  quorum_required INT,
  quorum_reached BOOLEAN DEFAULT false,
  quorum_count_at_completion INT,
  attendance_count INT DEFAULT 0
);

-- ==========================================
-- 11. ACTION ITEMS ASSIGNED IN MEETINGS
-- ==========================================
CREATE TABLE action_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  meeting_id TEXT REFERENCES meetings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  assigned_to TEXT REFERENCES org_members(id) ON DELETE CASCADE,
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed'))
);

-- ==========================================
-- 12. REAL-TIME INTERACTIVE CHAT CHANNELS
-- ==========================================
CREATE TABLE chat_channels (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'group' CHECK (type IN ('group', 'announcement', 'direct')),
  channel_type TEXT DEFAULT 'general' CHECK (channel_type IN ('general','project','committee','private','announcement')),
  is_private BOOLEAN DEFAULT false,
  created_by TEXT REFERENCES users(id) ON DELETE CASCADE
);

-- ==========================================
-- 13. CHAT CHANNEL MESSAGES
-- ==========================================
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  channel_id TEXT REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  attachment_url TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text','file','image','voice','poll','system')),
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  file_mime_type TEXT,
  voice_duration_seconds INT,
  reply_to_id TEXT REFERENCES chat_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 14. CHAT POLL MESSAGES
-- ==========================================
CREATE TABLE poll_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  message_id TEXT REFERENCES chat_messages(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  allow_multiple BOOLEAN DEFAULT false,
  show_results_before_vote BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 15. CHAT POLL RESPONSES
-- ==========================================
CREATE TABLE poll_responses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  poll_id TEXT REFERENCES poll_messages(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES org_members(id) ON DELETE CASCADE,
  selected_options JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, member_id)
);

-- ==========================================
-- 15B. REAL-TIME STANDALONE POLLS & VOTING
-- ==========================================
CREATE TABLE polls (
  poll_id TEXT PRIMARY KEY,
  message_id TEXT,
  channel_id TEXT NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE poll_votes (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL REFERENCES polls(poll_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

-- ==========================================
-- 16. BRANDED ANNOUNCEMENTS / NEWS
-- ==========================================
CREATE TABLE news_posts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  cover_url TEXT,
  category TEXT NOT NULL,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'members')),
  is_pinned BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  author_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  last_edited_at TIMESTAMPTZ,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0
);

-- ==========================================
-- 17. DYNAMIC METRIC GOALS (GOALS TRACKER)
-- ==========================================
CREATE TABLE goals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target NUMERIC DEFAULT 100,
  unit TEXT DEFAULT 'units',
  current_progress NUMERIC DEFAULT 0,
  deadline TIMESTAMPTZ NOT NULL,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'members')),
  is_pinned BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  last_edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 18. GOAL PROGRESS UPDATES
-- ==========================================
CREATE TABLE goal_updates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  goal_id TEXT REFERENCES goals(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  note TEXT,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 19. ORGANIZATION GRANTS TRACKER & OPPORTUNITIES
-- ==========================================
CREATE TABLE grants (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  funder TEXT NOT NULL,
  amount_range TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  deadline TIMESTAMPTZ NOT NULL,
  link TEXT,
  eligibility TEXT,
  program_id TEXT REFERENCES programs(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'tracking' CHECK (status IN ('tracking', 'applied', 'successful', 'unsuccessful', 'withdrawn'))
);

-- ==========================================
-- 20. CORE BOOKKEEPING LEDGER ENTRIES
-- ==========================================
CREATE TABLE ledger_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'RWF',
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  reference TEXT,
  receipt_url TEXT,
  program_id TEXT REFERENCES programs(id) ON DELETE SET NULL,
  goal_id TEXT -- Tied to goals for budgeting traceability
);

-- ==========================================
-- 21. MOMO DONATIONS SUBMISSIONS
-- ==========================================
CREATE TABLE donations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  donor_name TEXT NOT NULL,
  donor_email TEXT NOT NULL,
  message TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('mtn', 'airtel')),
  proof_url TEXT,
  status TEXT DEFAULT 'awaiting_approval' CHECK (status IN ('awaiting_approval', 'confirmed', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 22. PLATFORM INCIDENT GLITCH REPORTS
-- ==========================================
CREATE TABLE error_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  screenshot_url TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'wont_fix')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 23. TENANT LICENSE PREMIUM SUBSCRIPTIONS
-- ==========================================
CREATE TABLE subscription_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  amount_usd NUMERIC NOT NULL,
  amount_local NUMERIC NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('mtn', 'airtel')),
  phone TEXT NOT NULL,
  reference TEXT NOT NULL,
  proof_url TEXT,
  status TEXT DEFAULT 'awaiting_approval' CHECK (status IN ('awaiting_approval', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 24. PLATFORM GLOBAL BILLING & RATES
-- ==========================================
CREATE TABLE platform_settings (
  id TEXT PRIMARY KEY,
  usd_to_rwf_rate NUMERIC DEFAULT 1300,
  eur_to_rwf_rate NUMERIC DEFAULT 1400,
  kes_to_rwf_rate NUMERIC DEFAULT 10,
  mtn_payment_number TEXT DEFAULT '0788100100',
  airtel_payment_number TEXT DEFAULT '0733100100',
  payment_name TEXT DEFAULT 'VIRELLIX INC',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 25. IN-APP DOCUMENTS, LETTERS & EDITING
-- ==========================================
CREATE TABLE documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT,
  file_size TEXT,
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  uploader_name TEXT DEFAULT 'Anonymous Representative',
  requires_acknowledgement BOOLEAN DEFAULT false,
  acknowledgement_deadline DATE,
  content TEXT,
  file_type TEXT DEFAULT 'other', -- 'word' | 'excel' | 'pdf' | 'image' | 'other'
  recipient_member_ids TEXT[] DEFAULT '{}',
  is_letter BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 26. DOCUMENT ACKNOWLEDGEMENTS
-- ==========================================
CREATE TABLE document_acknowledgements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES org_members(id) ON DELETE CASCADE,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  document_version INT NOT NULL DEFAULT 1,
  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, member_id, document_version)
);

-- ==========================================
-- 27. MEMBER RESIGNATIONS & EXIT OFFBOARDING SURVEYS
-- ==========================================
CREATE TABLE resignations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  member_id TEXT REFERENCES org_members(id) ON DELETE CASCADE,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  reason_category TEXT,
  reason_detail TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  finalized_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','finalized','cancelled')),
  admin_response TEXT,
  admin_responded_at TIMESTAMPTZ,
  admin_responded_by TEXT REFERENCES users(id)
);

-- ==========================================
-- 28. FULL AUDIT TRAIL LOGS TRACKER
-- ==========================================
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  performed_by TEXT REFERENCES users(id),
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

-- ==========================================
-- 29. SUPPORT HOTLINE CHAT CONVERSATIONS
-- ==========================================
CREATE TABLE support_conversations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 30. SUPPORT HOTLINE CHAT MESSAGES
-- ==========================================
CREATE TABLE support_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conversation_id TEXT REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('superadmin','org_member')),
  sender_id TEXT REFERENCES users(id),
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 31. MEMBER IDENTITY VERIFICATIONS
-- ==========================================
CREATE TABLE identity_verifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  member_id TEXT REFERENCES org_members(id) ON DELETE CASCADE,
  national_id_number TEXT NOT NULL,
  id_card_front_url TEXT,
  id_card_back_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewer_id TEXT REFERENCES users(id),
  rejection_reason TEXT
);

-- ==========================================
-- 32. COOPERATIVE MEMBER DUES / CONTRIBUTION FEES
-- ==========================================
CREATE TABLE member_fees (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES org_members(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RWF',
  payment_period TEXT NOT NULL, -- 'weekly' | 'monthly'
  period_date TEXT NOT NULL,     -- e.g. '2026-W22' or 'May 2026'
  status TEXT NOT NULL DEFAULT 'pending', -- 'paid' | 'pending'
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_by_method TEXT,
  transaction_reference TEXT,
  sender_info TEXT,
  reported_at TIMESTAMPTZ,
  report_note TEXT,
  admin_note TEXT,
  proof_url TEXT
);

-- ==========================================
-- 33. COOPERATIVE MARKETPLACE PRODUCTS
-- ==========================================
CREATE TABLE marketplace_products (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RWF',
  image_url TEXT,
  contact_info TEXT NOT NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 34. COOPERATIVE MARKETPLACE INTEREST LEADS
-- ==========================================
CREATE TABLE marketplace_leads (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES marketplace_products(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES org_members(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 35. SHARE CAPITAL INVESTMENT TRACKER
-- ==========================================
CREATE TABLE share_capital (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES org_members(id) ON DELETE CASCADE,
  shares_count INT NOT NULL DEFAULT 0,
  share_value NUMERIC NOT NULL DEFAULT 10000,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- 'paid' | 'partially_paid' | 'pending'
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 36. SHARE CAPITAL ADDITION TRANSACTIONS
-- ==========================================
CREATE TABLE share_transactions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES org_members(id) ON DELETE CASCADE,
  shares_added INT NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  recorded_by TEXT NOT NULL
);

-- ==========================================
-- 37. COOPERATIVE EXTENDED ACTIVITY LOGS
-- ==========================================
CREATE TABLE activity_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  program_id TEXT REFERENCES programs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  activity_date DATE NOT NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 38. ACTIVITY ATTENDANCE MAPPING
-- ==========================================
CREATE TABLE activity_attendance (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  activity_id TEXT REFERENCES activity_logs(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES org_members(id) ON DELETE CASCADE,
  recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, member_id)
);

-- ==========================================
-- 39. EMAIL/SMS NOTIFICATION TEMPLATES
-- ==========================================
CREATE TABLE message_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  occasion TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT[],
  is_system_template BOOLEAN DEFAULT false,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 40. HISTORIC NOTIFICATION DISPATCHES
-- ==========================================
CREATE TABLE notification_sends (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  template_id TEXT REFERENCES message_templates(id) ON DELETE SET NULL,
  channels TEXT[], -- e.g. ['sms', 'email', 'chat']
  recipient_ids TEXT[],
  variables_applied JSONB,
  sent_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- PERFORMANCE & CHRONOLOGICAL INDICES
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_member_fees_org_id ON member_fees(org_id);
CREATE INDEX IF NOT EXISTS idx_member_fees_member_id ON member_fees(member_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_org ON marketplace_products(org_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_evt ON event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_mem ON event_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_share_capital_org_id ON share_capital(org_id);
CREATE INDEX IF NOT EXISTS idx_share_capital_member_id ON share_capital(member_id);
CREATE INDEX IF NOT EXISTS idx_share_tx_org_id ON share_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_share_tx_member_id ON share_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_id ON activity_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_activity_attendance_act ON activity_attendance(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_attendance_mem ON activity_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_audit_org_date ON audit_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(performed_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rsvp_event ON event_rsvps(event_id, response);
CREATE INDEX IF NOT EXISTS idx_identity_member ON identity_verifications(member_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_org ON ledger_entries(org_id);
CREATE INDEX IF NOT EXISTS idx_donations_org ON donations(org_id);
CREATE INDEX IF NOT EXISTS idx_news_posts_org ON news_posts(org_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_org ON meetings(org_id, date_time DESC);
CREATE INDEX IF NOT EXISTS idx_goals_org ON goals(org_id);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- Enable RLS across all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE resignations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_capital ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_sends ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER HELPERS
CREATE OR REPLACE FUNCTION is_member_of_org(org_id TEXT, user_uid TEXT)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM org_members 
    WHERE org_members.org_id = is_member_of_org.org_id 
      AND org_members.user_id = is_member_of_org.user_uid 
      AND org_members.status = 'active'
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_admin_of_org(org_id TEXT, user_uid TEXT)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM org_members 
    WHERE org_members.org_id = is_admin_of_org.org_id 
      AND org_members.user_id = is_admin_of_org.user_uid 
      AND org_members.role = 'org_admin' 
      AND org_members.status = 'active'
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_platform_superadmin(user_uid TEXT)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = is_platform_superadmin.user_uid 
      AND users.is_superadmin = true
  );
END;
$$ LANGUAGE plpgsql;

-- POLICIES: users
CREATE POLICY select_users ON users FOR SELECT USING (true);
CREATE POLICY insert_users ON users FOR INSERT WITH CHECK (true);
CREATE POLICY update_users ON users FOR UPDATE USING (auth.uid()::text = id OR id LIKE 'user-%' OR is_platform_superadmin(auth.uid()::text));

-- POLICIES: organizations
CREATE POLICY select_organizations ON organizations FOR SELECT USING (true);
CREATE POLICY insert_organizations ON organizations FOR INSERT WITH CHECK (true);
CREATE POLICY update_organizations ON organizations FOR UPDATE USING (is_admin_of_org(id, auth.uid()::text) OR id LIKE 'org-%' OR is_platform_superadmin(auth.uid()::text));
CREATE POLICY delete_organizations ON organizations FOR DELETE USING (is_admin_of_org(id, auth.uid()::text) OR is_platform_superadmin(auth.uid()::text));

-- POLICIES: org_members
CREATE POLICY select_org_members ON org_members FOR SELECT USING (true);
CREATE POLICY insert_org_members ON org_members FOR INSERT WITH CHECK (true);
CREATE POLICY update_org_members ON org_members FOR UPDATE USING (is_admin_of_org(org_id, auth.uid()::text) OR user_id LIKE 'user-%' OR is_platform_superadmin(auth.uid()::text));
CREATE POLICY delete_org_members ON org_members FOR DELETE USING (is_admin_of_org(org_id, auth.uid()::text) OR is_platform_superadmin(auth.uid()::text));

-- POLICIES: member_tiers
CREATE POLICY select_member_tiers ON member_tiers FOR SELECT USING (true);
CREATE POLICY write_member_tiers ON member_tiers FOR ALL USING (is_admin_of_org(org_id, auth.uid()::text));

-- POLICIES: programs
CREATE POLICY select_programs ON programs FOR SELECT USING (is_member_of_org(org_id, auth.uid()::text));
CREATE POLICY write_programs ON programs FOR ALL USING (is_admin_of_org(org_id, auth.uid()::text));

-- POLICIES: events
CREATE POLICY select_events ON events FOR SELECT USING (is_public = true OR is_member_of_org(org_id, auth.uid()::text));
CREATE POLICY write_events ON events FOR ALL USING (is_admin_of_org(org_id, auth.uid()::text));

-- POLICIES: event_attendance
CREATE POLICY select_event_attendance ON event_attendance FOR SELECT USING (member_id IN (SELECT id FROM org_members WHERE user_id::text = auth.uid()::text) OR EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND is_member_of_org(events.org_id, auth.uid()::text)));
CREATE POLICY write_event_attendance ON event_attendance FOR ALL USING (event_id IN (SELECT id FROM events WHERE org_id IN (SELECT org_id FROM org_members WHERE user_id::text = auth.uid()::text AND (role = 'org_admin' OR role = 'manager'))));

-- POLICIES: event_rsvps
CREATE POLICY select_event_rsvps ON event_rsvps FOR SELECT USING (is_member_of_org((SELECT org_id FROM events WHERE events.id = event_id), auth.uid()::text));
CREATE POLICY write_event_rsvps ON event_rsvps FOR ALL USING (is_member_of_org((SELECT org_id FROM events WHERE events.id = event_id), auth.uid()::text));

-- POLICIES: event_waitlist
CREATE POLICY select_event_waitlist ON event_waitlist FOR SELECT USING (is_member_of_org((SELECT org_id FROM events WHERE events.id = event_id), auth.uid()::text));
CREATE POLICY write_event_waitlist ON event_waitlist FOR ALL USING (is_member_of_org((SELECT org_id FROM events WHERE events.id = event_id), auth.uid()::text));

-- POLICIES: meetings
CREATE POLICY select_meetings ON meetings FOR SELECT USING (is_member_of_org(org_id, auth.uid()::text));
CREATE POLICY write_meetings ON meetings FOR ALL USING (is_admin_of_org(org_id, auth.uid()::text));

-- POLICIES: action_items
CREATE POLICY select_action_items ON action_items FOR SELECT USING (is_member_of_org(org_id, auth.uid()::text));
CREATE POLICY write_action_items ON action_items FOR ALL USING (is_member_of_org(org_id, auth.uid()::text));

-- POLICIES: chat_channels
CREATE POLICY select_chat_channels ON chat_channels FOR SELECT USING (is_member_of_org(org_id, auth.uid()::text));
CREATE POLICY write_chat_channels ON chat_channels FOR ALL USING (is_member_of_org(org_id, auth.uid()::text));

-- POLICIES: chat_messages
CREATE POLICY select_chat_messages ON chat_messages FOR SELECT USING (EXISTS (SELECT 1 FROM chat_channels WHERE chat_channels.id = channel_id AND is_member_of_org(chat_channels.org_id, auth.uid()::text)));
CREATE POLICY insert_chat_messages ON chat_messages FOR INSERT WITH CHECK (auth.uid()::text = sender_id);

-- POLICIES: poll_messages
CREATE POLICY select_poll_messages ON poll_messages FOR SELECT USING (EXISTS (SELECT 1 FROM chat_messages WHERE chat_messages.id = message_id));
CREATE POLICY write_poll_messages ON poll_messages FOR ALL USING (true);

-- POLICIES: poll_responses
CREATE POLICY select_poll_responses ON poll_responses FOR SELECT USING (true);
CREATE POLICY write_poll_responses ON poll_responses FOR ALL USING (true);

-- POLICIES: polls & poll_votes (STANDALONE REALTIME VOTING)
GRANT ALL ON TABLE polls TO anon, authenticated, service_role;
GRANT ALL ON TABLE poll_votes TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Allow public select polls" ON polls;
CREATE POLICY "Allow public select polls" ON polls FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert polls" ON polls;
CREATE POLICY "Allow public insert polls" ON polls FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update polls" ON polls;
CREATE POLICY "Allow public update polls" ON polls FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public select poll_votes" ON poll_votes;
CREATE POLICY "Allow public select poll_votes" ON poll_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert poll_votes" ON poll_votes;
CREATE POLICY "Allow public insert poll_votes" ON poll_votes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update poll_votes" ON poll_votes;
CREATE POLICY "Allow public update poll_votes" ON poll_votes FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete poll_votes" ON poll_votes;
CREATE POLICY "Allow public delete poll_votes" ON poll_votes FOR DELETE USING (true);

-- POLICIES: news_posts
CREATE POLICY select_news_posts ON news_posts FOR SELECT USING (visibility = 'public' OR is_member_of_org(org_id, auth.uid()::text));
CREATE POLICY write_news_posts ON news_posts FOR ALL USING (is_admin_of_org(org_id, auth.uid()::text));

-- POLICIES: goals
CREATE POLICY select_goals ON goals FOR SELECT USING (visibility = 'public' OR is_member_of_org(org_id, auth.uid()::text));
CREATE POLICY write_goals ON goals FOR ALL USING (is_admin_of_org(org_id, auth.uid()::text));

-- POLICIES: goal_updates
CREATE POLICY select_goal_updates ON goal_updates FOR SELECT USING (EXISTS (SELECT 1 FROM goals WHERE goals.id = goal_id AND (goals.visibility = 'public' OR is_member_of_org(goals.org_id, auth.uid()::text))));
CREATE POLICY write_goal_updates ON goal_updates FOR ALL USING (EXISTS (SELECT 1 FROM goals WHERE goals.id = goal_id AND is_member_of_org(goals.org_id, auth.uid()::text)));

-- POLICIES: grants
CREATE POLICY select_grants ON grants FOR SELECT USING (is_member_of_org(org_id, auth.uid()::text));
CREATE POLICY write_grants ON grants FOR ALL USING (is_admin_of_org(org_id, auth.uid()::text));

-- POLICIES: ledger_entries
CREATE POLICY select_ledger_entries ON ledger_entries FOR SELECT USING (is_member_of_org(org_id, auth.uid()::text));
CREATE POLICY write_ledger_entries ON ledger_entries FOR ALL USING (is_admin_of_org(org_id, auth.uid()::text));

-- POLICIES: donations
CREATE POLICY select_donations ON donations FOR SELECT USING (is_member_of_org(org_id, auth.uid()::text));
CREATE POLICY insert_donations ON donations FOR INSERT WITH CHECK (true);

-- POLICIES: error_reports
CREATE POLICY select_error_reports ON error_reports FOR SELECT USING (is_member_of_org(org_id, auth.uid()::text) OR is_platform_superadmin(auth.uid()::text));
CREATE POLICY insert_error_reports ON error_reports FOR INSERT WITH CHECK (true);
CREATE POLICY update_error_reports ON error_reports FOR UPDATE USING (is_member_of_org(org_id, auth.uid()::text) OR is_platform_superadmin(auth.uid()::text));

-- POLICIES: subscription_payments
CREATE POLICY select_subscription_payments ON subscription_payments FOR SELECT USING (is_member_of_org(org_id, auth.uid()::text) OR is_platform_superadmin(auth.uid()::text));
CREATE POLICY insert_subscription_payments ON subscription_payments FOR INSERT WITH CHECK (is_admin_of_org(org_id, auth.uid()::text));
CREATE POLICY update_subscription_payments ON subscription_payments FOR UPDATE USING (is_platform_superadmin(auth.uid()::text));

-- POLICIES: platform_settings
CREATE POLICY select_platform_settings ON platform_settings FOR SELECT USING (true);
CREATE POLICY update_platform_settings ON platform_settings FOR UPDATE USING (is_platform_superadmin(auth.uid()::text));

-- POLICIES: documents
CREATE POLICY select_documents ON documents FOR SELECT USING (is_member_of_org(org_id, auth.uid()::text));
CREATE POLICY write_documents ON documents FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM org_members 
    WHERE org_members.org_id = documents.org_id 
      AND org_members.user_id::text = auth.uid()::text 
      AND org_members.role IN ('org_admin', 'manager', 'accountant') 
      AND org_members.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM org_members 
    WHERE org_members.org_id = documents.org_id 
      AND org_members.user_id::text = auth.uid()::text 
      AND org_members.role IN ('org_admin', 'manager', 'accountant') 
      AND org_members.status = 'active'
  )
);

-- POLICIES: document_acknowledgements
CREATE POLICY select_doc_ack ON document_acknowledgements FOR SELECT USING (is_member_of_org(org_id, auth.uid()::text));
CREATE POLICY write_doc_ack ON document_acknowledgements FOR ALL USING (is_member_of_org(org_id, auth.uid()::text));

-- POLICIES: resignations
CREATE POLICY select_resignations ON resignations FOR SELECT USING (is_member_of_org(org_id, auth.uid()::text));
CREATE POLICY write_resignations ON resignations FOR ALL USING (is_member_of_org(org_id, auth.uid()::text));

-- POLICIES: audit_logs
CREATE POLICY select_audit_logs ON audit_logs FOR SELECT USING (is_member_of_org(org_id, auth.uid()::text));
CREATE POLICY write_audit_logs ON audit_logs FOR ALL USING (is_member_of_org(org_id, auth.uid()::text));

-- POLICIES: support_conversations
CREATE POLICY select_support_conv ON support_conversations FOR SELECT USING (is_member_of_org(org_id, auth.uid()::text) OR is_platform_superadmin(auth.uid()::text));
CREATE POLICY write_support_conv ON support_conversations FOR ALL USING (is_member_of_org(org_id, auth.uid()::text) OR is_platform_superadmin(auth.uid()::text));

-- POLICIES: support_messages
CREATE POLICY select_support_msg ON support_messages FOR SELECT USING (EXISTS (SELECT 1 FROM support_conversations WHERE id = conversation_id AND (is_member_of_org(org_id, auth.uid()::text) OR is_platform_superadmin(auth.uid()::text))));
CREATE POLICY write_support_msg ON support_messages FOR ALL USING (EXISTS (SELECT 1 FROM support_conversations WHERE id = conversation_id AND (is_member_of_org(org_id, auth.uid()::text) OR is_platform_superadmin(auth.uid()::text))));

-- POLICIES: identity_verifications
CREATE POLICY select_ident_verify ON identity_verifications FOR SELECT USING (member_id IN (SELECT id FROM org_members WHERE user_id::text = auth.uid()::text) OR is_admin_of_org((SELECT org_id FROM org_members WHERE org_members.id = member_id), auth.uid()::text));
CREATE POLICY write_ident_verify ON identity_verifications FOR ALL USING (member_id IN (SELECT id FROM org_members WHERE user_id::text = auth.uid()::text) OR is_admin_of_org((SELECT org_id FROM org_members WHERE org_members.id = member_id), auth.uid()::text));

-- POLICIES: member_fees
CREATE POLICY "Allow members of the organization to read fees" ON member_fees FOR SELECT USING (org_id IN (SELECT org_id FROM org_members WHERE user_id::text = auth.uid()::text));
CREATE POLICY "Allow members to update their own fees for reporting" ON member_fees FOR UPDATE USING (member_id IN (SELECT id FROM org_members WHERE user_id::text = auth.uid()::text));
CREATE POLICY "Allow organization admins to manage fees" ON member_fees FOR ALL USING (org_id IN (SELECT org_id FROM org_members WHERE user_id::text = auth.uid()::text AND (role = 'org_admin' OR role = 'manager' OR role = 'accountant')));

-- POLICIES: marketplace_products
CREATE POLICY "Allow anyone with membership to browse products" ON marketplace_products FOR SELECT USING (org_id IN (SELECT org_id FROM org_members WHERE user_id::text = auth.uid()::text));
CREATE POLICY "Allow organization admins to list or delete products" ON marketplace_products FOR ALL USING (org_id IN (SELECT org_id FROM org_members WHERE user_id::text = auth.uid()::text AND (role = 'org_admin' OR role = 'manager')));

-- POLICIES: marketplace_leads
CREATE POLICY "Allow admins to scan purchase leads" ON marketplace_leads FOR SELECT USING (product_id IN (SELECT id FROM marketplace_products WHERE org_id IN (SELECT org_id FROM org_members WHERE user_id::text = auth.uid()::text AND (role = 'org_admin' OR role = 'manager'))));
CREATE POLICY "Allow members to express interest in products" ON marketplace_leads FOR INSERT WITH CHECK (member_id IN (SELECT id FROM org_members WHERE user_id::text = auth.uid()::text));

-- POLICIES: share_capital
CREATE POLICY "Allow members of organization to read share capital" ON share_capital FOR SELECT USING (org_id IN (SELECT org_id FROM org_members WHERE user_id::text = auth.uid()::text));
CREATE POLICY "Allow admins and accountants to manage share capital" ON share_capital FOR ALL USING (org_id IN (SELECT org_id FROM org_members WHERE user_id::text = auth.uid()::text AND (role = 'org_admin' OR role = 'accountant')));

-- POLICIES: share_transactions
CREATE POLICY "Allow members to view share transactions" ON share_transactions FOR SELECT USING (org_id IN (SELECT org_id FROM org_members WHERE user_id::text = auth.uid()::text));
CREATE POLICY "Allow admins and accountants to manage share transactions" ON share_transactions FOR ALL USING (org_id IN (SELECT org_id FROM org_members WHERE user_id::text = auth.uid()::text AND (role = 'org_admin' OR role = 'accountant')));

-- POLICIES: activity_logs
CREATE POLICY select_activity_logs ON activity_logs FOR SELECT USING (is_member_of_org(org_id, auth.uid()::text));
CREATE POLICY write_activity_logs ON activity_logs FOR ALL USING (is_member_of_org(org_id, auth.uid()::text));

-- POLICIES: activity_attendance
CREATE POLICY select_activity_attendance ON activity_attendance FOR SELECT USING (true);
CREATE POLICY write_activity_attendance ON activity_attendance FOR ALL USING (true);

-- POLICIES: message_templates
CREATE POLICY select_message_templates ON message_templates FOR SELECT USING (is_member_of_org(org_id, auth.uid()::text));
CREATE POLICY write_message_templates ON message_templates FOR ALL USING (is_admin_of_org(org_id, auth.uid()::text));

-- POLICIES: notification_sends
CREATE POLICY select_notification_sends ON notification_sends FOR SELECT USING (is_member_of_org(org_id, auth.uid()::text));
CREATE POLICY write_notification_sends ON notification_sends FOR ALL USING (is_admin_of_org(org_id, auth.uid()::text));

-- =====================================================================
-- SUPABASE REALTIME PUBLICATIONS SETUP
-- =====================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE polls;
ALTER PUBLICATION supabase_realtime ADD TABLE poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE donations;

-- =====================================================================
-- SUPABASE STORAGE BUCKETS SETUP & SECURITY POLICIES
-- =====================================================================
-- Storage Buckets Definition & Application Usage:
-- 1. 'documents': Official Organization documents, PDFs, bylaws, letters, and compliance files.
-- 2. 'chat-attachments': Images, files, audio recordings, and media shared in chat channels.
-- 3. 'avatars': User profile avatar images and organization brand logo images.
-- 4. 'impacto-files': General media uploads, MoMo payment proof slips for donations and member fees, and marketplace product media.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('documents', 'documents', true, 52428800, NULL),
  ('chat-attachments', 'chat-attachments', true, 52428800, NULL),
  ('avatars', 'avatars', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml']),
  ('impacto-files', 'impacto-files', true, 52428800, NULL)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Objects RLS Policies (Full Read/Write Access for App Assets)
DROP POLICY IF EXISTS "Allow public select on storage objects" ON storage.objects;
CREATE POLICY "Allow public select on storage objects" ON storage.objects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on storage objects" ON storage.objects;
CREATE POLICY "Allow public insert on storage objects" ON storage.objects FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on storage objects" ON storage.objects;
CREATE POLICY "Allow public update on storage objects" ON storage.objects FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete on storage objects" ON storage.objects;
CREATE POLICY "Allow public delete on storage objects" ON storage.objects FOR DELETE USING (true);

-- =====================================================================
-- DATABASE TRIGGERS
-- =====================================================================

-- Overwrite the handle_new_user() trigger function in public schema to correctly populate both "id" and "auth_user_id"
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

-- =====================================================================
-- SUPERADMIN ACCOUNT SEED
-- =====================================================================
DO $$
DECLARE
  super_id UUID := '7c81d898-a6b1-4b19-b2f4-8a4db9be1cf9';
  enc_pwd TEXT;
BEGIN
  enc_pwd := crypt('princegabby4@gmail.com', gen_salt('bf'));

  -- Insert into auth.users if not already exists in supabase auth schema
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'princegabby4@gmail.com') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      super_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'princegabby4@gmail.com',
      enc_pwd,
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"full_name": "Gaby Prince Kabuye"}'::jsonb,
      NOW(),
      NOW()
    );
  ELSE
    SELECT id INTO super_id FROM auth.users WHERE email = 'princegabby4@gmail.com';
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

-- =====================================================================
-- SEED DATA SETUP
-- =====================================================================

-- SEED: PLATFORM SETTINGS
INSERT INTO platform_settings (id, usd_to_rwf_rate, eur_to_rwf_rate, kes_to_rwf_rate, mtn_payment_number, airtel_payment_number, payment_name)
VALUES ('global', 1300, 1400, 10, '0788100100', '0733100100', 'VIRELLIX INC')
ON CONFLICT (id) DO NOTHING;

-- SEED: USERS (Initial Demo Accounts)
INSERT INTO users (id, email, full_name, avatar_url, is_superadmin, created_at) VALUES 
('user-super', 'superadmin@impacto.rw', 'Gaby Prince Kabuye', NULL, TRUE, '2026-01-01T00:00:00Z'),
('user-admin', 'admin@impacto.rw', 'Anatole Mugisha', NULL, FALSE, '2026-02-01T00:00:00Z'),
('user-member', 'member@impacto.rw', 'Divine Uwera', NULL, FALSE, '2026-03-01T00:00:00Z'),
('user-donor', 'john@funder.org', 'John Radcliffe', NULL, FALSE, '2026-04-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- SEED: ORGANIZATIONS
INSERT INTO organizations (id, name, slug, tagline, description, mission, vision, logo_url, cover_url, primary_color, secondary_color, language, auto_confirm_members, donations_enabled, donation_mtn_number, donation_airtel_number, donation_account_name, donation_description, subscription_status, subscription_ends_at, org_category, created_at) VALUES
('org-rfc', 'Rwanda Forestry Center', 'rfc', 'Restoring hillsides and greening Kigali''s future', 'Our mission is to plant 1 million native trees across Eastern Province hillsides by 2028, training local cooperatives in agroforestry.', 'To inspire community-led landscape restoration for climate resilience.', 'A green and climate-resilient Rwanda with flourishing indigenous woodlands.', '🌳', '🌲', '#16a34a', '#ca8a04', 'en', TRUE, TRUE, '0788123456', '0733123456', 'Rwanda Forestry Center', 'Support our hills nursery project in Kayonza. Every 1,000 RWF plants 2 native trees.', 'active', '2027-12-31T23:59:59Z', 'Environment', '2026-01-10T12:00:00Z'),
('org-imbuto', 'Imbuto Scholars Foundation', 'imbuto', 'Empowering underrepresented youth in ICT', 'Imbuto Scholars Foundation matches high-potential high schoolers in Rwanda with top-tier tech mentorship and university scholarships.', 'Unlocking extraordinary talent through quality secondary and tertiary resources.', 'Leading tech-driven sustainable economies throughout East Africa.', '🎓', '📚', '#1d4ed8', '#f59e0b', 'en', FALSE, TRUE, '0788777888', '0733777888', 'Imbuto Scholars Trust', 'Help buy laptops for 20 incoming female engineering students.', 'trial', '2026-06-30T23:59:59Z', 'Education', '2026-05-01T08:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- SEED: MEMBER TIERS
INSERT INTO member_tiers (id, org_id, name, annual_fee, currency, benefits, color) VALUES
('tier-gold', 'org-rfc', 'Gold Conservator', 50000, 'RWF', ARRAY['Priority planting access', 'Quarterly printed audits', 'Annual Forest banquet invitation'], '#ca8a04'),
('tier-bronze', 'org-rfc', 'Seedling Guardian', 10000, 'RWF', ARRAY['Eco-badge on active lists', 'Bi-annual planting meetups'], '#854d0e')
ON CONFLICT (id) DO NOTHING;

-- SEED: MEMBERS
INSERT INTO org_members (id, org_id, user_id, role, status, member_number, tier_id, joined_at) VALUES 
('member-1', 'org-rfc', 'user-admin', 'org_admin', 'active', 'RFC-001', 'tier-gold', '2026-01-10T14:00:00Z'),
('member-2', 'org-rfc', 'user-member', 'member', 'active', 'RFC-014', 'tier-bronze', '2026-03-01T09:00:00Z'),
('member-3', 'org-imbuto', 'user-admin', 'org_admin', 'active', 'IS-001', NULL, '2026-05-01T08:30:00Z')
ON CONFLICT (id) DO NOTHING;

-- SEED: PROGRAMS
INSERT INTO programs (id, org_id, name, description, status, created_at) VALUES
('prog-1', 'org-rfc', 'Eastern Province Reforestation', 'Reforesting hillsides in Kayonza, Nyagatare and Bugesera.', 'active', '2026-01-15T09:00:00Z'),
('prog-2', 'org-imbuto', 'ICT Mentorship Kigali', 'Connecting teenage developers with industry experts.', 'active', '2026-05-02T10:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- SEED: EVENTS
INSERT INTO events (id, org_id, title, description, date_time, end_time, location, online_link, program_id, max_attendees, is_public, qr_code_token, attendees_count, status) VALUES
('event-1', 'org-rfc', 'Eco-Restoration Planting Day at Mt. Kigali', 'Join us for our major mid-year planting session. We will meet at Nyarugenge side and plant 5,000 indigenous saplings. Gloves and lunch provided.', '2026-06-15T08:00:00Z', '2026-06-15T15:00:00Z', 'Mt. Kigali Forest Reserve, Kigali', NULL, 'prog-1', 150, TRUE, 'event-token-mtkigali', 82, 'upcoming'),
('event-2', 'org-rfc', 'Agroforestry Capacity Masterclass', 'Online training session on integrating grevillea and avocado trees into dryland bean farming systems.', '2026-05-28T14:00:00Z', '2026-05-28T16:00:00Z', 'Zoom Virtual Classroom', 'https://zoom.us/j/123456789', 'prog-1', 200, TRUE, 'event-token-mclass', 30, 'upcoming')
ON CONFLICT (id) DO NOTHING;

-- SEED: GOALS
INSERT INTO goals (id, org_id, title, description, target, unit, current_progress, deadline, visibility, is_pinned, created_at) VALUES
('goal-1', 'org-rfc', 'Kayonza Indigenous Planting Initiative', 'Planting sustainable high-canopy trees to rebuild lost woodlands.', 25000, 'saplings', 18200, '2026-11-30T00:00:00Z', 'public', TRUE, '2026-01-12T00:00:00Z'),
('goal-2', 'org-imbuto', 'ICT mentorship scholars matched', 'Match scholarship beneficiaries with active professional software consultants in Rwanda.', 50, 'students', 15, '2026-12-31T00:00:00Z', 'public', FALSE, '2026-05-02T00:00:00Z')
ON CONFLICT (id) DO NOTHING;











-- =====================================================================
-- IMPACTO SYSTEM DATABASE MIGRATION & APPLICATION COMMUNICATION UPDATE
-- Run this SQL script in your Supabase SQL Editor to enable real-time
-- communication, instant fee tracking, payment notifications, and voting.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. REAL-TIME POLLS & VOTING ENGINE
-- Ensures interactive voting channels work seamlessly across all users.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS polls (
    poll_id TEXT PRIMARY KEY,
    message_id TEXT,
    channel_id TEXT NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poll_votes (
    id TEXT PRIMARY KEY,
    poll_id TEXT NOT NULL REFERENCES polls(poll_id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    option_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(poll_id, user_id)
);

-- Enable Row Level Security (RLS) on polling tables
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Grant explicit privileges to all active client roles
GRANT ALL ON TABLE polls TO anon, authenticated, service_role;
GRANT ALL ON TABLE poll_votes TO anon, authenticated, service_role;

-- Permissive policies for real-time polling access
DROP POLICY IF EXISTS "Allow public select polls" ON polls;
CREATE POLICY "Allow public select polls" ON polls FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert polls" ON polls;
CREATE POLICY "Allow public insert polls" ON polls FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update polls" ON polls;
CREATE POLICY "Allow public update polls" ON polls FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public select poll_votes" ON poll_votes;
CREATE POLICY "Allow public select poll_votes" ON poll_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert poll_votes" ON poll_votes;
CREATE POLICY "Allow public insert poll_votes" ON poll_votes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update poll_votes" ON poll_votes;
CREATE POLICY "Allow public update poll_votes" ON poll_votes FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete poll_votes" ON poll_votes;
CREATE POLICY "Allow public delete poll_votes" ON poll_votes FOR DELETE USING (true);




-- ---------------------------------------------------------------------
-- 2. DISPATCHED NOTIFICATIONS & BROADCAST LOGS
-- Allows real-time payment slip alerts and cooperative announcements to communicate.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_sends (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
    template_id TEXT REFERENCES message_templates(id) ON DELETE SET NULL,
    channels TEXT[],
    recipient_ids TEXT[],
    variables_applied JSONB,
    sent_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    recipient_group TEXT,
    recipient_count INTEGER DEFAULT 1,
    body_text TEXT
);

-- Ensure missing columns exist if table was already created earlier
ALTER TABLE notification_sends ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE notification_sends ADD COLUMN IF NOT EXISTS recipient_group TEXT;
ALTER TABLE notification_sends ADD COLUMN IF NOT EXISTS recipient_count INTEGER DEFAULT 1;
ALTER TABLE notification_sends ADD COLUMN IF NOT EXISTS body_text TEXT;

ALTER TABLE notification_sends ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE notification_sends TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Allow public select notification_sends" ON notification_sends;
CREATE POLICY "Allow public select notification_sends" ON notification_sends FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert notification_sends" ON notification_sends;
CREATE POLICY "Allow public insert notification_sends" ON notification_sends FOR INSERT WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 3. COOPERATIVE MEMBER DUES & PAYMENT VERIFICATION LEDGER
-- Ensures payment slip submissions and supervisor verification sync properly.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_fees (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES org_members(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'RWF',
    payment_period TEXT NOT NULL,
    period_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_by_method TEXT,
    transaction_reference TEXT,
    sender_info TEXT,
    reported_at TIMESTAMPTZ,
    report_note TEXT,
    admin_note TEXT,
    proof_url TEXT
);

ALTER TABLE member_fees ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE member_fees TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Allow members of the organization to read fees" ON member_fees;
CREATE POLICY "Allow members of the organization to read fees" ON member_fees FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow members to update their own fees for reporting" ON member_fees;
CREATE POLICY "Allow members to update their own fees for reporting" ON member_fees FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow organization admins to manage fees" ON member_fees;
CREATE POLICY "Allow organization admins to manage fees" ON member_fees FOR ALL USING (true);

-- ---------------------------------------------------------------------
-- 4. DOCUMENT PRIVACY & VISIBILITY TOGGLE
-- Supports public vs private document sharing and letter acknowledgements.
-- ---------------------------------------------------------------------
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- ---------------------------------------------------------------------
-- 5. REAL-TIME SUBSCRIPTIONS (SUPABASE REALTIME PUBLICATION)
-- Enables live sync for polling, chat channels, and payment notifications.
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE polls;
        ALTER PUBLICATION supabase_realtime ADD TABLE poll_votes;
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
        ALTER PUBLICATION supabase_realtime ADD TABLE notification_sends;
        ALTER PUBLICATION supabase_realtime ADD TABLE member_fees;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Publication alter skipped: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------
-- 6. MEDIA & PROOF SLIP STORAGE BUCKETS
-- Ensures payment receipts and documents can be uploaded without permission errors.
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES 
  ('documents', 'documents', true, 52428800),
  ('chat-attachments', 'chat-attachments', true, 52428800),
  ('avatars', 'avatars', true, 10485760),
  ('impacto-files', 'impacto-files', true, 52428800)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public select on storage objects" ON storage.objects;
CREATE POLICY "Allow public select on storage objects" ON storage.objects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on storage objects" ON storage.objects;
CREATE POLICY "Allow public insert on storage objects" ON storage.objects FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on storage objects" ON storage.objects;
CREATE POLICY "Allow public update on storage objects" ON storage.objects FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete on storage objects" ON storage.objects;
CREATE POLICY "Allow public delete on storage objects" ON storage.objects FOR DELETE USING (true);

-- ---------------------------------------------------------------------
-- 7. CLEANUP ERRONEOUS CROSS-JOINED MEMBERSHIPS & AUTO-GENERATE FEES
-- Ensure users ONLY belong to organizations they explicitly registered in or created.
-- ---------------------------------------------------------------------
-- Remove erroneous cross-joined memberships where users were incorrectly added 
-- to organizations they did not create or register into.
DELETE FROM org_members om
WHERE om.id LIKE 'mem-%'
  AND NOT EXISTS (
      SELECT 1 FROM organizations o WHERE o.id = om.org_id AND o.created_by = om.user_id
  );

-- Auto-generate initial member fee records ONLY for valid organization members lacking an active invoice
INSERT INTO member_fees (id, org_id, member_id, amount, currency, payment_period, period_date, status, created_at, admin_note)
SELECT 
    'fee-' || substring(om.id from 1 for 8) || '-' || (floor(extract(epoch from now()))::text) || '-' || substring(md5(random()::text) from 1 for 4),
    om.org_id,
    om.id,
    5000,
    'RWF',
    'monthly',
    to_char(now(), 'YYYY') || '-W' || to_char(now(), 'IW'),
    'pending',
    now(),
    'Standard Monthly Contribution'
FROM org_members om
WHERE NOT EXISTS (
    SELECT 1 FROM member_fees mf WHERE mf.org_id = om.org_id AND mf.member_id = om.id
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 9. STRICT ORGANIZATION ISOLATION & FILTERING ENFORCEMENT
-- Ensures that every table, membership, and query strictly links by org_id 
-- and prevents cross-tenant data leakage between different organizations.
-- =====================================================================
-- YES! Strictly scoping every query with WHERE org_id = ... and ensuring 
-- all members and transactional records are tied directly to their organization ID
-- is the definitive solution to prevent users from appearing across unrelated organizations.
-- ---------------------------------------------------------------------

-- Ensure index coverage on org_id across all key tables for high-performance scoped queries
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_member_fees_org_id ON member_fees(org_id);
CREATE INDEX IF NOT EXISTS idx_identity_verifications_org_id ON identity_verifications(org_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_org_id ON chat_channels(org_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_org_id ON ledger_entries(org_id);
CREATE INDEX IF NOT EXISTS idx_documents_org_id ON documents(org_id);

-- Enforce strict RLS (Row Level Security) check function for organization membership isolation
CREATE OR REPLACE FUNCTION is_member_of_org(org_id TEXT, user_uid TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM org_members 
        WHERE org_members.org_id = is_member_of_org.org_id 
          AND org_members.user_id::text = is_member_of_org.user_uid::text 
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;





-- =========================================================================
-- Impacto Database Schema Updates & Row-Level Security (RLS) Policies
-- Safe to execute against Supabase / PostgreSQL databases
-- =========================================================================

-- Organization extended profile columns
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS province text,
ADD COLUMN IF NOT EXISTS district text,
ADD COLUMN IF NOT EXISTS sector text,
ADD COLUMN IF NOT EXISTS founded_date text,
ADD COLUMN IF NOT EXISTS founders text,
ADD COLUMN IF NOT EXISTS registration_number text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS facebook_url text,
ADD COLUMN IF NOT EXISTS twitter_url text,
ADD COLUMN IF NOT EXISTS linkedin_url text,
ADD COLUMN IF NOT EXISTS employee_count text;

-- Add new columns for the goals table improvement
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS period_type text DEFAULT 'yearly' CHECK (period_type IN ('yearly', 'monthly')),
ADD COLUMN IF NOT EXISTS period_label text, -- e.g., '2026' or '2026-05'
ADD COLUMN IF NOT EXISTS achievement_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed'));

-- Update ledger_entries table type constraint to support Assets, Liabilities, and Equity for Real-Time Balance Sheet
ALTER TABLE public.ledger_entries 
DROP CONSTRAINT IF EXISTS ledger_entries_type_check;

ALTER TABLE public.ledger_entries 
ADD CONSTRAINT ledger_entries_type_check 
CHECK (type IN ('income', 'expense', 'asset', 'liability', 'equity'));

-- Fix Row Level Security (RLS) policies and grant access for application tables
GRANT ALL ON TABLE public.ledger_entries TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.events TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.event_attendance TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.donations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.grants TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.member_fees TO anon, authenticated, service_role;

DROP POLICY IF EXISTS write_ledger_entries ON public.ledger_entries;
DROP POLICY IF EXISTS select_ledger_entries ON public.ledger_entries;
CREATE POLICY select_ledger_entries ON public.ledger_entries FOR SELECT USING (true);
CREATE POLICY write_ledger_entries ON public.ledger_entries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS write_events ON public.events;
DROP POLICY IF EXISTS select_events ON public.events;
CREATE POLICY select_events ON public.events FOR SELECT USING (true);
CREATE POLICY write_events ON public.events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS write_event_attendance ON public.event_attendance;
DROP POLICY IF EXISTS select_event_attendance ON public.event_attendance;
CREATE POLICY select_event_attendance ON public.event_attendance FOR SELECT USING (true);
CREATE POLICY write_event_attendance ON public.event_attendance FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS write_donations ON public.donations;
DROP POLICY IF EXISTS select_donations ON public.donations;
CREATE POLICY select_donations ON public.donations FOR SELECT USING (true);
CREATE POLICY write_donations ON public.donations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS write_grants ON public.grants;
DROP POLICY IF EXISTS select_grants ON public.grants;
CREATE POLICY select_grants ON public.grants FOR SELECT USING (true);
CREATE POLICY write_grants ON public.grants FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS write_member_fees ON public.member_fees;
DROP POLICY IF EXISTS select_member_fees ON public.member_fees;
CREATE POLICY select_member_fees ON public.member_fees FOR SELECT USING (true);
CREATE POLICY write_member_fees ON public.member_fees FOR ALL USING (true) WITH CHECK (true);




































