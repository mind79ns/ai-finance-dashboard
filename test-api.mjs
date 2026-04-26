import axios from 'axios';

async function testYahooQuoteProxy() {
  try {
    const symbol = '005930.KS';
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    console.log('Fetching quote from', proxyUrl);
    const res = await axios.get(proxyUrl);
    
    // allorigins /get returns { contents: "..."(string) }
    const rawContents = res.data.contents;
    const parsed = JSON.parse(rawContents);
    
    if (parsed.quoteResponse) {
      const data = parsed.quoteResponse.result[0];
      console.log('Yahoo Quote Success:');
      console.log('- 52w High:', data.fiftyTwoWeekHigh);
      console.log('- MarketCap:', data.marketCap);
      console.log('- PE:', data.trailingPE);
      console.log('- PBR:', data.priceToBook);
    } else {
      console.log(parsed);
    }
  } catch (e) {
    if (e.response) {
      console.error('Yahoo Error Status:', e.response.status, e.response.data);
    } else {
      console.error('Yahoo Error:', e.message);
    }
  }
}

testYahooQuoteProxy();
