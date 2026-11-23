-- =====================================================================
-- INCREMENTAL DATABASE MIGRATION: PARTIAL DUES PAYMENTS & DUE NAME
-- =====================================================================
-- Adds support for multi-installment / partial member_fees payments
-- (paid_amount vs total_due_amount, pending_installment_amount,
-- payment_history, and due_name for filtering by payment purpose).
-- Safe and idempotent to run on existing Supabase / PostgreSQL instances.try really damn 
-- =====================================================================

ALTER TABLE public.member_fees
  ADD COLUMN IF NOT EXISTS due_name TEXT,
  ADD COLUMN IF NOT EXISTS total_due_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_installment_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_history JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill total_due_amount from existing amount column
UPDATE public.member_fees
SET total_due_amount = amount
WHERE total_due_amount IS NULL;

-- Backfill paid_amount for already-settled fees
UPDATE public.member_fees
SET paid_amount = COALESCE(total_due_amount, amount)
WHERE status = 'paid' AND COALESCE(paid_amount, 0) = 0;

-- Backfill due_name from period_date for legacy rows
UPDATE public.member_fees
SET due_name = COALESCE(NULLIF(TRIM(due_name), ''), NULLIF(TRIM(period_date), ''), 'Standard Due')
WHERE due_name IS NULL OR TRIM(due_name) = '';

-- Index for filtering by due_name
CREATE INDEX IF NOT EXISTS idx_member_fees_due_name ON public.member_fees(due_name);

-- MoMo Carrier Portal Display Preferences (default to Merchant Code only)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS momo_display_methods TEXT[] DEFAULT ARRAY['merchant_code']::text[];

UPDATE public.organizations
SET momo_display_methods = ARRAY['merchant_code']::text[]
WHERE momo_display_methods IS NULL OR array_length(momo_display_methods, 1) IS NULL;

-- =====================================================================
-- INCREMENTAL DATABASE MIGRATION: ORGANIZATION PROFILE, SEO/GEO & FAQ
-- =====================================================================
-- Adds fields for public organization search optimization (SEO/GEO),
-- official contact channels, activities, membership guide, and FAQs.
-- Safe and idempotent to run manually on existing Supabase / PostgreSQL instances.
-- =====================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS alternate_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS service_area TEXT,
  ADD COLUMN IF NOT EXISTS key_activities TEXT,
  ADD COLUMN IF NOT EXISTS target_beneficiaries TEXT,
  ADD COLUMN IF NOT EXISTS membership_info TEXT,
  ADD COLUMN IF NOT EXISTS registration_authority TEXT,
  ADD COLUMN IF NOT EXISTS seo_keywords TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS faq_items JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS sector TEXT,
  ADD COLUMN IF NOT EXISTS founded_date TEXT,
  ADD COLUMN IF NOT EXISTS founders TEXT,
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS employee_count TEXT;

