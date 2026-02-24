-- ====================================
-- AI Finance Dashboard - Asset Prices Cache Table
-- ====================================

-- 1. asset_prices 테이블: 시장 가격 실시간 캐시
CREATE TABLE IF NOT EXISTS public.asset_prices (
  symbol TEXT PRIMARY KEY,
  price NUMERIC NOT NULL,
  change_percent NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL,
  type TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- 인덱스 생성
-- ====================================
CREATE INDEX IF NOT EXISTS idx_asset_prices_type ON public.asset_prices(type);
CREATE INDEX IF NOT EXISTS idx_asset_prices_updated_at ON public.asset_prices(updated_at);

-- ====================================
-- Row Level Security (RLS) 설정
-- ====================================
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

-- ====================================
-- 자동 업데이트 트리거 (updated_at)
-- ====================================
DROP TRIGGER IF EXISTS update_asset_prices_updated_at ON public.asset_prices;
CREATE TRIGGER update_asset_prices_updated_at
  BEFORE UPDATE ON public.asset_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
