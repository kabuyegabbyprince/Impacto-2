export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  is_superadmin: boolean;
  created_at: string;
  preferred_language?: "en" | "fr" | "rw";
  accessibility_font_size?: "normal" | "large" | "x-large";
  accessibility_high_contrast?: boolean;
  bio?: string;
  phone_number?: string;
  job_title?: string;
  notification_email?: boolean;
  notification_sms?: boolean;
  ui_density?: "normal" | "compact" | "spacious";
  reduced_motion?: boolean;
  profile_visibility?: "public" | "members_only" | "private";
  status_badge?: "active" | "remote" | "field" | "away";
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  mission?: string;
  vision?: string;
  logo_url?: string;
  cover_url?: string;
  primary_color: string;
  secondary_color: string;
  language: "en" | "fr" | "rw";
  auto_confirm_members: boolean;
  donations_enabled: boolean;
  donation_mtn_number?: string;
  donation_airtel_number?: string;
  donation_account_name?: string;
  donation_description?: string;
  subscription_status: "trial" | "active" | "expired";
  subscription_ends_at?: string;
  subscription_tier?: "trial" | "starter" | "growth" | "enterprise";
  org_category: string;
  created_at: string;
  // Custom public portal settings
  location_name?: string;
  contact_us?: string;
  gallery_urls?: string[];
  public_page_enabled?: boolean;
  show_goals_publicly?: boolean;
  show_impact_publicly?: boolean;
  // Members dashboard settings
  dashboard_theme?: "light" | "dark" | "custom";
  dashboard_logo?: string;
  is_public_directory?: boolean;
  allow_public_joining?: boolean;
  // V2 highlights
  quorum_type?: "absolute" | "percentage";
  quorum_value?: number;
  financial_summary_enabled?: boolean;
  fee_notification?: string;
  marketplace_enabled?: boolean;
  country?: string;
  province?: string;
  district?: string;
  sector?: string;
  founded_date?: string;
  founders?: string;
  registration_number?: string;
  website?: string;
  facebook_url?: string;
  twitter_url?: string;
  linkedin_url?: string;
  employee_count?: string;
}


export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: "superadmin" | "org_admin" | "manager" | "accountant" | "member";
  status: "pending" | "active" | "suspended" | "resigned" | "rejected";
  member_number?: string;
  tier_id?: string;
  joined_at: string;
  is_volunteer?: boolean;
  user?: User; // joined relation
  verification_status?: "not_required" | "pending" | "verified" | "rejected" | "flagged";
  verified_at?: string;
  verified_by?: string;
  permissions?: {
    manage_members: boolean;
    manage_content: boolean;
    manage_finance: boolean;
    manage_settings: boolean;
    view_analytics: boolean;
    manage_documents: boolean;
    manage_chat: boolean;
  };
}

export interface MemberTier {
  id: string;
  org_id: string;
  name: string;
  annual_fee: number;
  currency: string;
  benefits: string[];
  color: string;
}

export interface Event {
  id: string;
  org_id: string;
  title: string;
  description: string;
  date_time: string;
  end_time?: string;
  location: string;
  online_link?: string;
  program_id?: string;
  max_attendees?: number;
  is_public: boolean;
  qr_code_token: string;
  attendees_count: number;
  status: "upcoming" | "active" | "completed" | "cancelled";
  is_deleted?: boolean;
  last_edited_at?: string;
  // Advanced attendance elements
  location_type?: "on-site" | "online";
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
  is_broadcasted?: boolean;
}

export interface EventAttendance {
  id: string;
  event_id: string;
  member_id: string;
  check_in_time: string;
  check_in_method: "manual" | "qr" | "self" | "online_confirm";
  status?: "present" | "attempted" | "mismatch";
  attempt_lat?: number;
  attempt_lng?: number;
  distance_meters?: number;
}

export interface Program {
  id: string;
  org_id: string;
  name: string;
  description: string;
  status: "planning" | "active" | "completed";
  created_at: string;
}

export interface Meeting {
  id: string;
  org_id: string;
  title: string;
  date_time: string;
  duration: number; // in mins
  location: string;
  link?: string;
  agenda: { title: string; presenter?: string; duration: number }[];
  minutes?: string; // markdown or plain text
  status: "scheduled" | "completed" | "cancelled";
  // V2 highlights
  quorum_required?: number;
  quorum_reached?: boolean;
  quorum_count_at_completion?: number;
  attendance_count?: number;
  location_type?: "on-site" | "online";
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
  is_broadcasted?: boolean;
}

export interface ActionItem {
  id: string;
  org_id: string;
  meeting_id?: string;
  title: string;
  assigned_to: string; // member_id
  due_date: string;
  status: "open" | "in_progress" | "completed";
}

export interface NewsPost {
  id: string;
  org_id: string;
  title: string;
  body: string;
  excerpt: string;
  cover_url?: string;
  category: string;
  visibility: "public" | "members";
  is_pinned: boolean;
  author_id: string; // user_id
  published_at?: string;
  likes_count: number;
  comments_count: number;
  is_deleted?: boolean;
  last_edited_at?: string;
}

export interface ChatChannel {
  id: string;
  org_id: string;
  name: string;
  type: "group" | "announcement" | "direct";
  channel_type?: "general" | "project" | "committee" | "private" | "announcement";
  is_private?: boolean;
  created_by: string;
  member_ids?: string[]; // for private channels select members
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string; // user_id
  text: string;
  attachment_url?: string;
  created_at: string;
  // V2 enhancements
  message_type?: "text" | "file" | "image" | "voice" | "poll" | "system";
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_mime_type?: string;
  voice_duration_seconds?: number;
  reply_to_id?: string;
  // joined info
  sender_name?: string;
  sender_avatar?: string;
}

export interface Goal {
  id: string;
  org_id: string;
  title: string;
  description: string;
  target?: number;
  unit?: string;
  current_progress: number;
  starting_progress?: number;
  deadline: string;
  visibility: "public" | "members";
  is_pinned: boolean;
  created_at: string;
  is_deleted?: boolean;
  last_edited_at?: string;
  last_note?: string;
  period_type?: "yearly" | "monthly";
  period_label?: string;
  achievement_percentage?: number;
  status?: "pending" | "in_progress" | "completed";
}

export interface GoalUpdate {
  id: string;
  goal_id: string;
  value: number;
  note?: string;
  updated_by: string;
  created_at: string;
}

export interface Grant {
  id: string;
  org_id: string;
  title: string;
  funder: string;
  amount_range: string;
  currency: string;
  deadline: string;
  link?: string;
  eligibility?: string;
  program_id?: string;
  status: "tracking" | "applied" | "successful" | "unsuccessful" | "withdrawn";
}

export interface LedgerEntry {
  id: string;
  org_id: string;
  type: "income" | "expense" | "asset" | "liability" | "equity";
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;
  reference?: string;
  receipt_url?: string;
  program_id?: string;
  goal_id?: string;
}

export interface Donation {
  id: string;
  org_id: string;
  amount: number;
  donor_name: string;
  donor_email: string;
  message?: string;
  payment_method: "mtn" | "airtel";
  proof_url?: string;
  status: "awaiting_approval" | "confirmed" | "rejected";
  created_at: string;
}

export interface ErrorReport {
  id: string;
  org_id: string;
  title: string;
  description: string;
  screenshot_url?: string;
  priority: "low" | "normal" | "high" | "critical";
  status: "open" | "in_review" | "resolved" | "wont_fix";
  admin_notes?: string;
  created_at: string;
}

export interface PlatformSettings {
  usd_to_rwf_rate: number;
  eur_to_rwf_rate: number;
  kes_to_rwf_rate: number;
  mtn_payment_number: string;
  airtel_payment_number: string;
  payment_name: string;
}

export interface SubscriptionPayment {
  id: string;
  org_id: string;
  plan: string;
  amount_usd: number;
  amount_local: number;
  method: "mtn" | "airtel";
  phone: string;
  reference: string;
  proof_url?: string;
  status: "awaiting_approval" | "approved" | "rejected";
  submitted_at: string;
  validated_at?: string;
}

// ==========================================
// V2 NO LIMIT EXTENSION INTERFACES
// ==========================================



export interface PollMessage {
  id: string;
  message_id: string;
  channel_id: string;
  question: string;
  options: string[];
  created_at: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  user_id: string;
  option_index: number;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  org_id: string;
  program_id?: string;
  title: string;
  description?: string;
  location?: string;
  activity_type?: string;
  target_metric?: string;
  present_member_ids?: string[];
  absent_member_ids?: string[];
  attendees?: string[];
  activity_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityAttendance {
  id: string;
  activity_id: string;
  member_id: string;
  recorded_by: string;
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  org_id: string;
  name: string;
  occasion?: string;
  subject?: string;
  body: string;
  variables: string[];
  is_system_template: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationSend {
  id: string;
  org_id: string;
  template_id?: string;
  sent_by: string;
  recipient_group: string;
  recipient_count: number;
  body_text?: string;
  activity_id?: string;
  event_id?: string;
  meeting_id?: string;
  created_at: string;
}

export interface EventRSVP {
  id: string;
  event_id: string;
  member_id: string;
  response: "yes" | "no" | "maybe";
  responded_at: string;
  updated_at: string;
}

export interface EventWaitlist {
  id: string;
  event_id: string;
  member_id: string;
  joined_at: string;
  notified_at?: string;
}

export interface IdentityVerification {
  id: string;
  member_id: string;
  org_id: string;
  document_type: string;
  document_url: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  review_notes?: string;
  status: "pending" | "approved" | "rejected";
}

export interface Document {
  id: string;
  org_id: string;
  name: string;
  file_url?: string;
  file_size?: string;
  uploaded_by?: string;
  uploader_name?: string;
  requires_acknowledgement: boolean;
  acknowledgement_deadline?: string;
  created_at: string;
  content?: string;
  file_type?: "word" | "excel" | "pdf" | "image" | "other";
  recipient_member_ids?: string[];
  is_letter?: boolean;
  show_header?: boolean;
  is_private?: boolean;
}

export interface DocumentAcknowledgement {
  id: string;
  document_id: string;
  member_id: string;
  org_id: string;
  document_version: number;
  acknowledged_at: string;
}

export interface Resignation {
  id: string;
  member_id: string;
  org_id: string;
  reason_category?: string;
  reason_detail?: string;
  submitted_at: string;
  finalized_at?: string;
  cancelled_at?: string;
  status: "pending" | "finalized" | "cancelled";
  admin_response?: string;
  admin_responded_at?: string;
  admin_responded_by?: string;
}

export interface AuditLog {
  id: string;
  org_id: string;
  performed_by?: string;
  action: string;
  action_label: string;
  target_table?: string;
  target_id?: string;
  target_label?: string;
  old_value?: any;
  new_value?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface SupportConversation {
  id: string;
  org_id: string;
  created_by: string;
  created_at: string;
}

export interface SupportMessage {
  id: string;
  conversation_id: string;
  sender_type: "superadmin" | "org_member";
  sender_id: string;
  message_text: string;
  created_at: string;
}

export interface MemberFee {
  id: string;
  org_id: string;
  member_id: string;
  amount: number;
  currency: string;
  payment_period: "weekly" | "monthly" | "flexible";
  period_date: string; // e.g. "2026-W22", "2026-05"
  status: "paid" | "pending" | "pending_confirmation";
  paid_at?: string;
  created_at: string;
  member_name?: string; // virtual / joined
  paid_by_method?: "MTN MoMo" | "Airtel Money" | "Bank Transfer" | "Cash";
  transaction_reference?: string;
  sender_info?: string;
  reported_at?: string;
  report_note?: string;
  admin_note?: string;
  proof_url?: string;
  due_date?: string;
  is_recurring?: boolean;
}

export interface MarketplaceProduct {
  id: string;
  org_id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  contact_info: string;
  created_by: string; // user_id
  created_at: string;
}

export interface MarketplaceLead {
  id: string;
  product_id: string;
  member_id: string;
  message?: string;
  created_at: string;
  member_name?: string; // virtual / joined
  member_email?: string; // virtual / joined
  product_title?: string; // virtual / joined
}

export interface ShareCapital {
  id: string;
  org_id: string;
  member_id: string;
  shares_count: number;
  share_value: number;
  total_paid: number;
  status: "paid" | "partially_paid" | "pending";
  last_updated: string;
  member_name?: string;
}

export interface ShareTransaction {
  id: string;
  org_id: string;
  member_id: string;
  shares_added: number;
  amount_paid: number;
  transaction_date: string;
  recorded_by: string;
}



