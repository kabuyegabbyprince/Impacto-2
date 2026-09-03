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
