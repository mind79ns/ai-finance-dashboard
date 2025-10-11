-- ====================================
-- AI Finance Dashboard - Supabase Schema
-- ====================================

-- 1. portfolios 테이블: 포트폴리오 자산
CREATE TABLE IF NOT EXISTS public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default_user',
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  avg_price NUMERIC NOT NULL,
  current_price NUMERIC NOT NULL DEFAULT 0,
  total_value NUMERIC NOT NULL DEFAULT 0,
  profit NUMERIC NOT NULL DEFAULT 0,
  profit_percent NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  account TEXT NOT NULL DEFAULT '기본계좌',
  category TEXT NOT NULL DEFAULT '해외주식',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. account_principals 테이블: 계좌별 원금/예수금
CREATE TABLE IF NOT EXISTS public.account_principals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default_user',
  account_name TEXT NOT NULL UNIQUE,
  principal NUMERIC NOT NULL DEFAULT 0,
  remaining NUMERIC NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. goals 테이블: 재무 목표
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default_user',
  title TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  deadline DATE,
  category TEXT DEFAULT '저축',
  description TEXT DEFAULT '',
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. investment_logs 테이블: 투자 일지
CREATE TABLE IF NOT EXISTS public.investment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default_user',
  date DATE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  asset TEXT DEFAULT '',
  note TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- 인덱스 생성 (쿼리 성능 향상)
-- ====================================

CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON public.portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_symbol ON public.portfolios(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolios_account ON public.portfolios(account);

CREATE INDEX IF NOT EXISTS idx_account_principals_user_id ON public.account_principals(user_id);
CREATE INDEX IF NOT EXISTS idx_account_principals_account ON public.account_principals(account_name);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_deadline ON public.goals(deadline);

CREATE INDEX IF NOT EXISTS idx_investment_logs_user_id ON public.investment_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_logs_date ON public.investment_logs(date);

-- ====================================
-- Row Level Security (RLS) 설정
-- ====================================

-- RLS 활성화
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_principals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_logs ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기/쓰기 가능하도록 설정 (인증 없이 사용)
-- 나중에 인증 기능 추가 시 user_id 기반으로 변경 가능
CREATE POLICY "Enable all access for all users" ON public.portfolios
  FOR ALL USING (true);

CREATE POLICY "Enable all access for all users" ON public.account_principals
  FOR ALL USING (true);

CREATE POLICY "Enable all access for all users" ON public.goals
  FOR ALL USING (true);

CREATE POLICY "Enable all access for all users" ON public.investment_logs
  FOR ALL USING (true);

-- ====================================
-- 자동 업데이트 트리거 (updated_at)
-- ====================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_principals_updated_at
  BEFORE UPDATE ON public.account_principals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investment_logs_updated_at
  BEFORE UPDATE ON public.investment_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
