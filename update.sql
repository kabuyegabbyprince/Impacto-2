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

-- =========================================================================
-- GRANT PERMISSIONS & ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Grant full table permissions to anon, authenticated, and service_role
GRANT ALL ON TABLE public.ledger_entries TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.events TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.event_attendance TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.donations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.grants TO anon, authenticated, service_role;

-- -------------------------------------------------------------------------
-- DIRECTLY CONNECTED TO MEMBER FEES & DUES SYSTEM
-- Table: public.member_fees
-- Purpose: Stores monthly/annual dues assigned to members across all roles.
-- Allows members to submit MoMo transaction references / proof, and enables
-- the Accountant role to verify, approve, and record paid dues into the Ledger.
-- -------------------------------------------------------------------------
GRANT ALL ON TABLE public.member_fees TO anon, authenticated, service_role;

DROP POLICY IF EXISTS write_member_fees ON public.member_fees;
DROP POLICY IF EXISTS select_member_fees ON public.member_fees;
CREATE POLICY select_member_fees ON public.member_fees FOR SELECT USING (true);
CREATE POLICY write_member_fees ON public.member_fees FOR ALL USING (true) WITH CHECK (true);

-- Accounting Ledger Entries Policy (Linked to Dues & Donations Income)
DROP POLICY IF EXISTS write_ledger_entries ON public.ledger_entries;
DROP POLICY IF EXISTS select_ledger_entries ON public.ledger_entries;
CREATE POLICY select_ledger_entries ON public.ledger_entries FOR SELECT USING (true);
CREATE POLICY write_ledger_entries ON public.ledger_entries FOR ALL USING (true) WITH CHECK (true);

-- Events & Attendance Policies
DROP POLICY IF EXISTS write_events ON public.events;
DROP POLICY IF EXISTS select_events ON public.events;
CREATE POLICY select_events ON public.events FOR SELECT USING (true);
CREATE POLICY write_events ON public.events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS write_event_attendance ON public.event_attendance;
DROP POLICY IF EXISTS select_event_attendance ON public.event_attendance;
CREATE POLICY select_event_attendance ON public.event_attendance FOR SELECT USING (true);
CREATE POLICY write_event_attendance ON public.event_attendance FOR ALL USING (true) WITH CHECK (true);

-- Donations Policies
DROP POLICY IF EXISTS write_donations ON public.donations;
DROP POLICY IF EXISTS select_donations ON public.donations;
CREATE POLICY select_donations ON public.donations FOR SELECT USING (true);
CREATE POLICY write_donations ON public.donations FOR ALL USING (true) WITH CHECK (true);

-- Grants Policies
DROP POLICY IF EXISTS write_grants ON public.grants;
DROP POLICY IF EXISTS select_grants ON public.grants;
CREATE POLICY select_grants ON public.grants FOR SELECT USING (true);
CREATE POLICY write_grants ON public.grants FOR ALL USING (true) WITH CHECK (true);
