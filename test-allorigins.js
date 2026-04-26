const targetUrl = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=005930.KS';
const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

fetch(proxyUrl)
  .then(res => res.json())
  .then(data => {
    console.log("Status:", data.status);
    const parsed = JSON.parse(data.contents);
    console.log("Parsed keys:", Object.keys(parsed));
    if (parsed.quoteResponse) {
      console.log("Result:", parsed.quoteResponse.result[0]);
    }
  })
  .catch(err => console.error(err));
