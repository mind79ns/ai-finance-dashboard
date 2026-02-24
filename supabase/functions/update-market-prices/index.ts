// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const FINNHUB_API_KEY = Deno.env.get('FINNHUB_API_KEY') || ''
const KIS_APP_KEY = Deno.env.get('KIS_APP_KEY') || ''
const KIS_APP_SECRET = Deno.env.get('KIS_APP_SECRET') || ''

let kisTokenCache: string | null = null
let kisTokenExpiry: number = 0

// KIS API 토큰 발급 함수
async function getKisToken() {
    const now = Date.now()
    if (kisTokenCache && now < kisTokenExpiry) {
        return kisTokenCache
    }

    const response = await fetch('https://openapi.koreainvestment.com:9443/oauth2/tokenP', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'client_credentials',
            appkey: KIS_APP_KEY,
            appsecret: KIS_APP_SECRET
        })
    })

    const data = await response.json()
    if (data.access_token) {
        kisTokenCache = data.access_token
        kisTokenExpiry = now + 23 * 60 * 60 * 1000 // 23시간 캐시
        return kisTokenCache
    }
    throw new Error('Failed to get KIS Token')
}

// KIS 현재가 조회
async function fetchKisPrice(symbol: string, token: string) {
    const response = await fetch(
        `https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${symbol.padStart(6, '0')}`,
        {
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${token}`,
                'appkey': KIS_APP_KEY,
                'appsecret': KIS_APP_SECRET,
                'tr_id': 'FHKST01010100'
            }
        }
    )

    const data = await response.json()
    if (data.rt_cd === '0') {
        return {
            symbol,
            price: parseFloat(data.output.stck_prpr),
            changePercent: parseFloat(data.output.prdy_ctrt),
            currency: 'KRW',
            type: '한국주식'
        }
    }
    return null
}

// Finnhub 현재가 조회
async function fetchFinnhubPrice(symbol: string) {
    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`)
    const data = await response.json()
    if (data && data.c !== undefined) {
        return {
            symbol,
            price: data.c,
            changePercent: data.dp || 0,
            currency: 'USD',
            type: '미국주식'
        }
    }
    return null
}

// CoinGecko 현재가 조회 (자주 요청시 rate limit 주의)
async function fetchCoinGeckoPrices(coinIds: string[]) {
    if (!coinIds.length) return []
    const ids = coinIds.join('%2C')
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`)
    const data = await response.json()

    const results = []
    const cryptoMap: Record<string, string> = {
        'bitcoin': 'BTC',
        'ethereum': 'ETH',
        'binancecoin': 'BNB',
        'solana': 'SOL',
        'ripple': 'XRP'
    }

    for (const [id, info] of Object.entries(data)) {
        const symbol = cryptoMap[id] || id.toUpperCase()
        results.push({
            symbol,
            price: (info as any).usd,
            changePercent: (info as any).usd_24h_change || 0,
            currency: 'USD',
            type: '암호화폐'
        })
    }
    return results
}

// 환율 조회 (예: ExchangeRate-API)
async function fetchExchangeRate() {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
    const data = await response.json()
    if (data && data.rates && data.rates.KRW) {
        return {
            symbol: 'USD/KRW',
            price: data.rates.KRW,
            changePercent: 0,
            currency: 'KRW',
            type: '환율'
        }
    }
    return null
}

serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. 저장된 포트폴리오에서 대상 심볼 추출
        const { data: portfolios } = await supabase.from('portfolios').select('symbol, type, currency')

        // 심볼 중복 제거 대상 분류
        const krwSymbols = new Set<string>()
        const usdSymbols = new Set<string>()
        const cryptoIds = new Set<string>()

        // 코인게코 ID 매핑용
        const symbolToCryptoId: Record<string, string> = {
            'BTC': 'bitcoin', 'ETH': 'ethereum', 'BNB': 'binancecoin', 'SOL': 'solana', 'XRP': 'ripple'
        }

        if (portfolios) {
            for (const asset of portfolios) {
                if (asset.type === '주식' || asset.type === 'ETF') {
                    if (asset.currency === 'KRW') krwSymbols.add(asset.symbol)
                    else if (asset.currency === 'USD') usdSymbols.add(asset.symbol)
                } else if (asset.type === '크립토' || asset.type === '암호화폐') {
                    const cid = symbolToCryptoId[asset.symbol] || asset.symbol.toLowerCase()
                    cryptoIds.add(cid)
                }
            }
        }

        // 2. 가격 데이터 수집 실행
        const fetchedPrices = []

        // 2.1 한국주식 수집
        if (krwSymbols.size > 0) {
            const kisToken = await getKisToken()
            for (const sym of Array.from(krwSymbols)) {
                const p = await fetchKisPrice(sym, kisToken)
                if (p) fetchedPrices.push(p)
                // Rate limit 회피 추론 지연 (100ms)
                await new Promise(r => setTimeout(r, 100))
            }
        }

        // 2.2 미국주식 수집
        if (usdSymbols.size > 0) {
            for (const sym of Array.from(usdSymbols)) {
                const p = await fetchFinnhubPrice(sym)
                if (p) fetchedPrices.push(p)
            }
        }

        // 2.3 암호화폐 수집
        if (cryptoIds.size > 0) {
            const cPrices = await fetchCoinGeckoPrices(Array.from(cryptoIds))
            fetchedPrices.push(...cPrices)
        }

        // 2.4 공통 환율 수집
        const rate = await fetchExchangeRate()
        if (rate) fetchedPrices.push(rate)

        // 3. Supabase DB (asset_prices 테이블) 갱신 (Upsert)
        if (fetchedPrices.length > 0) {
            const { error } = await supabase
                .from('asset_prices')
                .upsert(fetchedPrices, { onConflict: 'symbol' })

            if (error) throw error
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Updated ${fetchedPrices.length} symbols.`,
            updated: fetchedPrices.map(f => f.symbol)
        }), { headers: { "Content-Type": "application/json" } })

    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { "Content-Type": "application/json" },
            status: 400,
        })
    }
})
