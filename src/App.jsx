import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Portfolio from './pages/Portfolio'
import Market from './pages/Market'
import AIReport from './pages/AIReport'
import InvestmentLog from './pages/InvestmentLog'
import Goals from './pages/Goals'
import AssetStatus from './pages/AssetStatus'
import TransactionHistory from './pages/TransactionHistory'
import Settings from './pages/Settings'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/market" element={<Market />} />
          <Route path="/ai-report" element={<AIReport />} />
          <Route path="/log" element={<InvestmentLog />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/asset-status" element={<AssetStatus />} />
          <Route path="/transaction-history" element={<TransactionHistory />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
