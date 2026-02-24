-- ====================================
-- AI Finance Dashboard - Supabase Schema
-- ====================================

-- 1. portfolios 테이블: 포트폴리오 자산
CREATE TABLE IF NOT EXISTS public.portfolios (
  id BIGINT PRIMARY KEY,
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
  id BIGINT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default_user',
  title TEXT DEFAULT '',
  name TEXT DEFAULT '',
  target_amount NUMERIC DEFAULT 0,
  current_amount NUMERIC DEFAULT 0,
  deadline DATE,
  category TEXT DEFAULT '저축',
  description TEXT DEFAULT '',
  completed BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active',
  linked_to_portfolio BOOLEAN DEFAULT FALSE,
  link_type TEXT DEFAULT 'total',
  currency TEXT DEFAULT 'USD',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. investment_logs 테이블: 투자 일지
CREATE TABLE IF NOT EXISTS public.investment_logs (
  id BIGINT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default_user',
  date DATE,
  title TEXT DEFAULT '',
  type TEXT DEFAULT '',
  amount NUMERIC DEFAULT 0,
  quantity NUMERIC DEFAULT 0,
  price NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  asset TEXT DEFAULT '',
  account TEXT DEFAULT '기본계좌',
  note TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. user_settings 테이블: 대시보드/설정 등 사용자 정의 데이터
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id TEXT NOT NULL DEFAULT 'default_user',
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, key)
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
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_key ON public.user_settings(key);

-- ====================================
-- Row Level Security (RLS) 설정
-- ====================================

-- RLS 활성화
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_principals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기/쓰기 가능하도록 설정 (인증 없이 사용)
-- 나중에 인증 기능 추가 시 user_id 기반으로 변경 가능
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'portfolios'
      AND policyname = 'Enable all access for all users'
  ) THEN
    CREATE POLICY "Enable all access for all users" ON public.portfolios
      FOR ALL USING (true);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'account_principals'
      AND policyname = 'Enable all access for all users'
  ) THEN
    CREATE POLICY "Enable all access for all users" ON public.account_principals
      FOR ALL USING (true);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'goals'
      AND policyname = 'Enable all access for all users'
  ) THEN
    CREATE POLICY "Enable all access for all users" ON public.goals
      FOR ALL USING (true);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'investment_logs'
      AND policyname = 'Enable all access for all users'
  ) THEN
    CREATE POLICY "Enable all access for all users" ON public.investment_logs
      FOR ALL USING (true);
  END IF;
END;
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_settings'
      AND policyname = 'Enable all access for all users'
  ) THEN
    CREATE POLICY "Enable all access for all users" ON public.user_settings
      FOR ALL USING (true);
  END IF;
END;
$$;

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

DROP TRIGGER IF EXISTS update_portfolios_updated_at ON public.portfolios;
CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_account_principals_updated_at ON public.account_principals;
CREATE TRIGGER update_account_principals_updated_at
  BEFORE UPDATE ON public.account_principals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_goals_updated_at ON public.goals;
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_investment_logs_updated_at ON public.investment_logs;
CREATE TRIGGER update_investment_logs_updated_at
  BEFORE UPDATE ON public.investment_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- 스키마 보강 (기존 프로젝트 호환용)
-- ====================================

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS linked_to_portfolio BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS link_type TEXT DEFAULT 'total',
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.investment_logs
  ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS account TEXT DEFAULT '기본계좌',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ====================================
-- 6. asset_prices 테이블: 시장 가격 실시간 캐시
-- ====================================
CREATE TABLE IF NOT EXISTS public.asset_prices (
  symbol TEXT PRIMARY KEY,
  price NUMERIC NOT NULL,
  change_percent NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL,
  type TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_asset_prices_type ON public.asset_prices(type);
CREATE INDEX IF NOT EXISTS idx_asset_prices_updated_at ON public.asset_prices(updated_at);

-- Row Level Security (RLS) 설정
ALTER TABLE public.asset_prices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'asset_prices'
      AND policyname = 'Enable all access for all users'
  ) THEN
    CREATE POLICY "Enable all access for all users" ON public.asset_prices
      FOR ALL USING (true);
  END IF;
END;
$$;

-- 업데이트 트리거 설정
DROP TRIGGER IF EXISTS update_asset_prices_updated_at ON public.asset_prices;
CREATE TRIGGER update_asset_prices_updated_at
  BEFORE UPDATE ON public.asset_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

