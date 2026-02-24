import marketDataService from '../services/marketDataService'
import kisService from '../services/kisService'

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
        const marketData = await marketDataService.getAllMarketData()
        let nextExchangeRate = currentExchangeRate

        if (marketData?.currency?.usdKrw?.rate) {
            nextExchangeRate = marketData.currency.usdKrw.rate
        }

        const usdStockSymbols = assets
            .filter(asset => (asset.type === '주식' || asset.type === 'ETF') && asset.currency === 'USD')
            .map(asset => asset.symbol)

        const krwStockSymbols = assets
            .filter(asset => (asset.type === '주식' || asset.type === 'ETF') && asset.currency === 'KRW')
            .map(asset => asset.symbol)

        let usdStockPrices = {}
        if (usdStockSymbols.length > 0) {
            usdStockPrices = await marketDataService.getMultipleStockPrices(usdStockSymbols)
        }

        let krwStockPrices = {}
        if (krwStockSymbols.length > 0) {
            krwStockPrices = await kisService.getMultiplePrices(krwStockSymbols)
        }

        const updatedAssets = assets.map(asset => {
            let currentPrice = asset.currentPrice
            let dailyChangePercent = asset.dailyChangePercent || 0

            if ((asset.type === '주식' || asset.type === 'ETF') && asset.currency === 'USD' && usdStockPrices[asset.symbol]) {
                currentPrice = usdStockPrices[asset.symbol].price
                if (usdStockPrices[asset.symbol].changePercent !== undefined) {
                    dailyChangePercent = usdStockPrices[asset.symbol].changePercent
                }
            } else if ((asset.type === '주식' || asset.type === 'ETF') && asset.currency === 'KRW' && krwStockPrices[asset.symbol]) {
                currentPrice = krwStockPrices[asset.symbol].price
                dailyChangePercent = krwStockPrices[asset.symbol].changePercent || 0
            } else if (asset.symbol === 'BTC' && marketData.crypto?.bitcoin) {
                currentPrice = marketData.crypto.bitcoin.price
                dailyChangePercent = marketData.crypto.bitcoin.change24h || 0
            } else if (asset.symbol === 'ETH' && marketData.crypto?.ethereum) {
                currentPrice = marketData.crypto.ethereum.price
                dailyChangePercent = marketData.crypto.ethereum.change24h || 0
            } else if (asset.symbol === 'BNB' && marketData.crypto?.binancecoin) {
                currentPrice = marketData.crypto.binancecoin.price
                dailyChangePercent = marketData.crypto.binancecoin.change24h || 0
            } else if (asset.symbol === 'SOL' && marketData.crypto?.solana) {
                currentPrice = marketData.crypto.solana.price
                dailyChangePercent = marketData.crypto.solana.change24h || 0
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
