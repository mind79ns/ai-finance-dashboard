import MarketDataService from './src/services/marketDataService.js';

async function testFetch() {
  const service = new MarketDataService();
  const metrics = await service.getStockMetrics('005930');
  console.log('Metrics:', metrics);
}

testFetch();
