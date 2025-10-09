# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered personal finance dashboard built with React, TailwindCSS, and Netlify. The application helps users track investments, analyze markets, and get AI-powered insights for portfolio management. Supports both USD and KRW (Korean Won) assets with real-time pricing.

## Development Commands

```bash
# Development
npm run dev              # Start dev server at http://localhost:3000

# Build & Deploy
npm run build           # Production build to dist/
npm run preview         # Preview production build locally

# Code Quality
npm run lint            # ESLint check
```

## Architecture

### Core Technologies
- **React 18.2** with React Router for SPA navigation
- **Vite 5.0** for build tooling and dev server
- **TailwindCSS 3.4** for styling
- **Recharts** for data visualization
- **Netlify Functions** (serverless) for API proxying

### Application Structure

**Pages** (`src/pages/`):
- `Dashboard.jsx` - Overview with summary cards and quick stats
- `Portfolio.jsx` - Asset management with USD/KRW separation, CSV import/export
- `Market.jsx` - Real-time market data (stocks, crypto, forex, commodities)
- `AIReport.jsx` - AI-generated market analysis and portfolio insights
- `InvestmentLog.jsx` - Transaction history (buy/sell) with portfolio auto-update
- `Goals.jsx` - Financial goal tracking with portfolio integration

**Services** (`src/services/`):
- `marketDataService.js` - Aggregates market data from Finnhub, CoinGecko, ExchangeRate-API
- `aiService.js` - Dual AI strategy (OpenAI GPT-4 for deep analysis, Gemini for quick tasks)
- `kisService.js` - Korea Investment & Securities API integration via Netlify Functions

**Netlify Functions** (`netlify/functions/`):
- `kis-token.js` - OAuth token management for KIS API (24h cache)
- `kis-price.js` - Proxies Korean stock price requests to bypass CORS

### Data Flow & Integration

**Portfolio → Investment Log → Goals Integration**:
1. Portfolio stores assets in `localStorage` (`portfolio_assets`)
2. InvestmentLog reads portfolio assets for dropdown selection
3. Buy/sell transactions auto-update portfolio quantities and weighted average prices
4. Goals can link to portfolio total value for automatic progress tracking
5. AssetDetailView displays transaction history by filtering investment logs

**Real-Time Price Updates**:
- US stocks/ETFs: Finnhub API (browser-side)
- Korean stocks/ETFs: KIS API via Netlify Functions (server-side proxy to bypass CORS)
- Crypto: CoinGecko API (browser-side)
- Exchange rates: ExchangeRate-API (browser-side)
- Updates every 2 minutes with localStorage caching

**CSV Import/Export**:
- Portfolio supports CSV import with multi-encoding (UTF-8, EUC-KR) using TextDecoder
- Handles Korean brokerage CSV formats with quoted values and comma-separated prices
- Export functionality preserves all asset data including account allocation

### State Management

**LocalStorage Keys**:
- `portfolio_assets` - Array of portfolio holdings
- `investment_logs` - Array of buy/sell transactions
- `investment_goals` - Array of financial goals

**Data Persistence Pattern**:
```javascript
// Initialize with empty array
const [items, setItems] = useState([])

// Load from localStorage on mount
useEffect(() => {
  const saved = localStorage.getItem('key')
  if (saved) setItems(JSON.parse(saved))
}, [])

// Save on every change
useEffect(() => {
  localStorage.setItem('key', JSON.stringify(items))
}, [items])
```

### Currency Handling

Assets can be in USD or KRW. The app:
- Calculates totals separately for each currency
- Displays integrated totals in KRW using real-time exchange rates
- Uses `formatCurrency(value, currency)` helper for consistent formatting
- Account dashboard shows USD and KRW sections independently

### UI Design System

**Premium Card Styles**:
- Summary cards use gradient backgrounds with decorative circles
- Dynamic colors based on profit/loss (green/red gradients)
- `rounded-2xl` + `shadow-xl` for modern depth
- White text on colored backgrounds for high contrast

**Component Patterns**:
- `ChartCard` - Reusable wrapper for charts with title/subtitle
- `AssetDetailView` - Modal panel showing asset details, charts, transaction history
- Responsive grid layouts (1 col mobile → 2 col tablet → 3 col desktop)

## API Configuration

### Environment Variables

**Required for full functionality**:
```
VITE_FINNHUB_API_KEY       # US stock prices (free tier: 60 calls/min)
VITE_OPENAI_API_KEY        # AI analysis (GPT-4)
VITE_GEMINI_API_KEY        # Quick AI tasks (free tier)
```

**Optional**:
```
VITE_FRED_API_KEY          # Economic indicators
VITE_COINGECKO_API_KEY     # Not required (public API)
```

**Netlify Functions** (use without `VITE_` prefix):
```
KIS_APP_KEY                # Korea Investment & Securities
KIS_APP_SECRET             # Korea Investment & Securities
```

### API Rate Limits & Caching

- Finnhub: 60 calls/minute (free tier)
- CoinGecko: Public API, no key required
- KIS API: Token cached for 24 hours in Netlify Function
- All services implement 1-minute client-side caching

## Important Implementation Notes

### Portfolio Auto-Update from Transactions

When adding a transaction in InvestmentLog:
1. **Buy transaction**: Updates weighted average price using `(oldQty * oldAvg + newQty * newPrice) / totalQty`
2. **Sell transaction**: Reduces quantity; removes asset if fully sold
3. Portfolio state automatically syncs via localStorage

### CSV Import Multi-Encoding

```javascript
// Read as ArrayBuffer
reader.readAsArrayBuffer(file)

// Try UTF-8 first (fatal mode)
const decoder = new TextDecoder('utf-8', { fatal: true })
text = decoder.decode(arrayBuffer)

// Fallback to EUC-KR if UTF-8 fails
catch {
  const decoder = new TextDecoder('euc-kr')
  text = decoder.decode(arrayBuffer)
}
```

### Netlify Functions Deployment

Functions are automatically deployed with the site. No separate deployment needed.

**CORS Configuration**:
```javascript
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}
```

### Git Workflow

**Automatic deployment**:
1. Commit changes: `git add . && git commit -m "message"`
2. Push to GitHub: `git push`
3. Netlify auto-builds and deploys from `main` branch

**Commit message format**:
```
Brief description of changes

- Detailed point 1
- Detailed point 2

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Critical Considerations

**When modifying Portfolio or InvestmentLog**:
- Always maintain localStorage sync
- Preserve weighted average price calculations
- Test CSV import with both UTF-8 and EUC-KR files
- Verify transaction auto-update doesn't break on edge cases (zero quantity, negative values)

**When adding new pages**:
- Add route to `App.jsx`
- Add navigation link to `Layout.jsx`
- Follow existing localStorage patterns for data persistence

**When working with APIs**:
- Check if Netlify Function proxy is needed (for CORS)
- Implement caching to respect rate limits
- Handle errors gracefully with fallback UI

**UI Consistency**:
- Use gradient cards for premium look (see Portfolio summary cards)
- Maintain USD/KRW separation pattern
- Follow responsive grid patterns (1→2→3 columns)
- Use Lucide React icons consistently

## Ultra Thinking Principle

Per README.md: "중요한 수정이나 개선부분에는 Ultra Thinking 적용 확실한 오류 처리 진행"

When making important changes:
- Thoroughly analyze edge cases
- Implement robust error handling
- Test data persistence across page navigation
- Verify API rate limits aren't exceeded
- Ensure multi-currency calculations are accurate
