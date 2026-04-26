import axios from 'axios';

async function testNaver() {
  try {
    const res = await axios.get('https://m.stock.naver.com/api/stock/263750/integration', {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    console.log(res.data.stockName); // 펄어비스
  } catch(e) {
    console.error(e.message);
  }
}
testNaver();
