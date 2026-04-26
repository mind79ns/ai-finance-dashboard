import axios from 'axios';

async function testYahooName(symbol) {
  try {
    const response = await axios.get(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    const data = response.data?.quoteResponse?.result?.[0];
    console.log("Symbol:", data.symbol);
    console.log("ShortName:", data.shortName);
    console.log("LongName:", data.longName);
  } catch (err) {
    console.error(err);
  }
}
testYahooName('263750.KQ');
