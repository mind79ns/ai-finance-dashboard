-- ====================================
-- 모든 Supabase 테이블/정책/트리거 완전 삭제
-- ====================================

-- 1. 트리거 삭제
DROP TRIGGER IF EXISTS update_portfolios_updated_at ON public.portfolios;
DROP TRIGGER IF EXISTS update_account_principals_updated_at ON public.account_principals;
DROP TRIGGER IF EXISTS update_goals_updated_at ON public.goals;
DROP TRIGGER IF EXISTS update_investment_logs_updated_at ON public.investment_logs;

-- 2. 정책(Policy) 삭제
DROP POLICY IF EXISTS "Enable all access for all users" ON public.portfolios;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.account_principals;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.goals;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.investment_logs;

-- 3. 테이블 삭제 (CASCADE로 관련 항목 모두 삭제)
DROP TABLE IF EXISTS public.portfolios CASCADE;
DROP TABLE IF EXISTS public.account_principals CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.investment_logs CASCADE;

-- 4. 함수 삭제
DROP FUNCTION IF EXISTS update_updated_at_column();
