import marketDataService from '../services/marketDataService'
import kisService from '../services/kisService'
import { supabase } from '../services/supabaseService'

/**
 * 포트폴리오 자산의 실시간 현재가(주식, 통화, 암호화폐)를 조회하여 업데이트된 자산 목록을 반환합니다.
 * @param {Array} assets - 기존 포트폴리오 자산 배열
 * @param {Number} currentExchangeRate - 현재 사용 중인 환율 (기본값: 1340)
 * @returns {Promise<{ updatedAssets: Array, nextExchangeRate: Number, marketData: Object }>}
 */
export const fetchAndUpdateAssetPrices = async (assets, currentExchangeRate = 1340) => {
    if (!assets || assets.length === 0) {
        return { updatedAssets: [], nextExchangeRate: currentExchangeRate, marketData: null }
    }

    try {
        let nextExchangeRate = currentExchangeRate
        let marketData = null

        // 1. Supabase 캐시 테이블에서 데이터 조회 시도
        let dbPrices = {}
        if (supabase) {
            try {
                const { data } = await supabase.from('asset_prices').select('*')
                if (data && data.length > 0) {
                    data.forEach(row => {
                        dbPrices[row.symbol] = row
                    })
                }
            } catch (err) {
                console.warn('Failed to fetch from asset_prices cache, falling back to direct API', err)
            }
        }

        // 환율 업데이트 (DB 캐시에 있으면 캐시 우선, 단 너무 오래된 경우 갱신)
        let isExchangeRateStale = true
        const STALE_THRESHOLD = 2 * 60 * 1000 // 2분기록
        const now = Date.now()

        if (dbPrices['USD/KRW']) {
            const updatedAt = new Date(dbPrices['USD/KRW'].updated_at).getTime()
            if (now - updatedAt < STALE_THRESHOLD) {
                nextExchangeRate = dbPrices['USD/KRW'].price
                isExchangeRateStale = false
            }
        }

        // DB 캐시에 데이터가 없거나 수명(2분)이 지난(Stale) 종목들만 외부 API로 추출
        const missingUsdStocks = []
        const missingKrwStocks = []
        let hasMissingCrypto = false

        assets.forEach(asset => {
            const dbAsset = dbPrices[asset.symbol]
            let isStale = true

            if (dbAsset && dbAsset.updated_at) {
                const updatedAt = new Date(dbAsset.updated_at).getTime()
                if (now - updatedAt < STALE_THRESHOLD) {
                    isStale = false
                }
            }

            if (!dbAsset || isStale) {
                if ((asset.type === '주식' || asset.type === 'ETF')) {
                    if (asset.currency === 'USD') missingUsdStocks.push(asset.symbol)
                    else if (asset.currency === 'KRW') missingKrwStocks.push(asset.symbol)
                } else if (asset.type === '크립토' || asset.type === '암호화폐') {
                    hasMissingCrypto = true
                }
            }
        })

        // 2. 외부 API Fallback (캐시에 없는 데이터)

        // 코인 또는 환율 캐시 누락 시에만 전체 마켓 데이터 1회 호출
        if (hasMissingCrypto || isExchangeRateStale) {
            try {
                marketData = await marketDataService.getAllMarketData()
                if (isExchangeRateStale && marketData?.currency?.usdKrw?.rate) {
                    nextExchangeRate = marketData.currency.usdKrw.rate
                }
            } catch (err) {
                console.warn('Failed to fetch fallback market data:', err)
            }
        }

        let fallbackUsdPrices = {}
        if (missingUsdStocks.length > 0) {
            fallbackUsdPrices = await marketDataService.getMultipleStockPrices(missingUsdStocks).catch(() => ({}))
        }

        let fallbackKrwPrices = {}
        if (missingKrwStocks.length > 0) {
            fallbackKrwPrices = await kisService.getMultiplePrices(missingKrwStocks).catch(() => ({}))
        }

        // 3. 통합 업데이트
        const updatedAssets = assets.map(asset => {
            let currentPrice = asset.currentPrice
            let dailyChangePercent = asset.dailyChangePercent || 0

            // 1순위: 외부 API Fallback 데이터 검사 (방금 새로 받아온 거면 가장 최신임)
            if ((asset.type === '주식' || asset.type === 'ETF') && asset.currency === 'USD' && fallbackUsdPrices[asset.symbol]) {
                currentPrice = fallbackUsdPrices[asset.symbol].price
                if (fallbackUsdPrices[asset.symbol].changePercent !== undefined) {
                    dailyChangePercent = fallbackUsdPrices[asset.symbol].changePercent
                }
            } else if ((asset.type === '주식' || asset.type === 'ETF') && asset.currency === 'KRW' && fallbackKrwPrices[asset.symbol]) {
                currentPrice = fallbackKrwPrices[asset.symbol].price
                dailyChangePercent = fallbackKrwPrices[asset.symbol].changePercent || 0
            } else if (asset.symbol === 'BTC' && hasMissingCrypto && marketData?.crypto?.bitcoin) {
                currentPrice = marketData.crypto.bitcoin.price
                dailyChangePercent = marketData.crypto.bitcoin.change24h || 0
            } else if (asset.symbol === 'ETH' && hasMissingCrypto && marketData?.crypto?.ethereum) {
                currentPrice = marketData.crypto.ethereum.price
                dailyChangePercent = marketData.crypto.ethereum.change24h || 0
            } else if (asset.symbol === 'BNB' && hasMissingCrypto && marketData?.crypto?.binancecoin) {
                currentPrice = marketData.crypto.binancecoin.price
                dailyChangePercent = marketData.crypto.binancecoin.change24h || 0
            } else if (asset.symbol === 'SOL' && hasMissingCrypto && marketData?.crypto?.solana) {
                currentPrice = marketData.crypto.solana.price
                dailyChangePercent = marketData.crypto.solana.change24h || 0
            }
            // 2순위: 외부 API에서 못 가져왔거나 굳이 안 가져와도 되는 경우(Stale 조건 통과) 캐시 사용
            else if (dbPrices[asset.symbol]) {
                currentPrice = dbPrices[asset.symbol].price
                dailyChangePercent = dbPrices[asset.symbol].change_percent
            }

            const totalValue = asset.quantity * currentPrice
            const profit = totalValue - (asset.quantity * asset.avgPrice)
            const profitPercent = asset.avgPrice > 0 ? ((currentPrice - asset.avgPrice) / asset.avgPrice) * 100 : 0

            return {
                ...asset,
                currentPrice,
                totalValue,
                profit,
                profitPercent,
                dailyChangePercent
            }
        })

        return { updatedAssets, nextExchangeRate, marketData }
    } catch (error) {
        console.error('Failed to update asset prices:', error)
        throw error
    }
}
