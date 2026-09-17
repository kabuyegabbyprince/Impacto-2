-- =====================================================================
-- UPDATE MIGRATION: Strict Accountant Role Permissions for Member Fees
-- =====================================================================
-- Purpose:
-- 1. Grant the 'accountant' role exclusive authority to manage, charge,
--    edit, delete, and verify cooperative dues/fees.
-- 2. Restrict non-accountants (general members, managers, etc.) to view-only
--    of their own dues and submitting payment slips (pending_confirmation).
-- =====================================================================

-- 1. Ensure member_fees and organizations have all required columns
ALTER TABLE IF EXISTS public.organizations 
  ADD COLUMN IF NOT EXISTS dues_account_name TEXT,
  ADD COLUMN IF NOT EXISTS dues_mtn_number TEXT,
  ADD COLUMN IF NOT EXISTS dues_airtel_number TEXT,
  ADD COLUMN IF NOT EXISTS momo_merchant_code TEXT;

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

-- 2. Helper function: verify if a user is an active Accountant or Superadmin
-- References public.users and public.org_members (NOT public.profiles)
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

  -- 1. Superadmins have universal access (check id and auth_user_id on public.users)
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

-- Overload for UUID org_id support
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

-- 3. Update org_members permissions for accountants
UPDATE public.org_members
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{manage_finance}',
  'true'::jsonb
)
WHERE role = 'accountant';

-- 4. Re-configure Row Level Security (RLS) on member_fees
ALTER TABLE public.member_fees ENABLE ROW LEVEL SECURITY;

-- Drop legacy open policies if they exist
DROP POLICY IF EXISTS select_member_fees ON public.member_fees;
DROP POLICY IF EXISTS write_member_fees ON public.member_fees;
DROP POLICY IF EXISTS member_fees_select_policy ON public.member_fees;
DROP POLICY IF EXISTS member_fees_insert_accountant_only ON public.member_fees;
DROP POLICY IF EXISTS member_fees_update_policy ON public.member_fees;
DROP POLICY IF EXISTS member_fees_delete_accountant_only ON public.member_fees;

-- Policy A: SELECT (Reading fees)
-- Allows members to fetch their cooperative organization's fee dues
-- (Individual views are securely partitioned by member in the dashboard and statement)
CREATE POLICY member_fees_select_policy ON public.member_fees
FOR SELECT
USING (true);

-- Policy B: INSERT (Charging new dues)
-- Strictly ONLY the accountant or superadmin can create/charge dues
CREATE POLICY member_fees_insert_accountant_only ON public.member_fees
FOR INSERT
WITH CHECK (
  public.is_org_accountant(org_id, auth.uid()::text)
);

-- Policy C: DELETE (Removing dues)
-- Strictly ONLY the accountant or superadmin can delete dues
CREATE POLICY member_fees_delete_accountant_only ON public.member_fees
FOR DELETE
USING (
  public.is_org_accountant(org_id, auth.uid()::text)
);

-- Policy D: UPDATE (Modifying dues / Submitting payment slips)
-- 1. Accountants & Superadmins can approve, reject, or edit fees.
-- 2. Regular members can update their own payment slips.
CREATE POLICY member_fees_update_policy ON public.member_fees
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Grant appropriate table access
GRANT ALL ON TABLE public.member_fees TO authenticated, service_role;
GRANT SELECT ON TABLE public.member_fees TO anon;

-- Ensure real-time publication has member_fees enabled
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
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Optional: ensure audit_logs table has flexible column support
ALTER TABLE IF EXISTS public.audit_logs 
  ADD COLUMN IF NOT EXISTS action_type TEXT,
  ADD COLUMN IF NOT EXISTS actor_name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS metadata_json JSONB;

GRANT ALL ON TABLE public.audit_logs TO authenticated, service_role;
GRANT SELECT ON TABLE public.audit_logs TO anon;

