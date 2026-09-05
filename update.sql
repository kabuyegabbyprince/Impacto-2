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
