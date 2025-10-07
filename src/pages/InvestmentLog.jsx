import React, { useState } from 'react'
import { Calendar, Plus, Filter, X } from 'lucide-react'
import ChartCard from '../components/ChartCard'

const InvestmentLog = () => {
  const [logs, setLogs] = useState([
    {
      id: 1,
      date: '2025-10-05',
      type: 'buy',
      asset: 'AAPL',
      quantity: 5,
      price: 185.23,
      total: 926.15,
      note: '기술주 추가 매수'
    },
    {
      id: 2,
      date: '2025-10-03',
      type: 'sell',
      asset: 'TSLA',
      quantity: 2,
      price: 242.15,
      total: 484.30,
      note: '수익 실현'
    },
    {
      id: 3,
      date: '2025-10-01',
      type: 'buy',
      asset: 'BTC',
      quantity: 0.05,
      price: 67234,
      total: 3361.70,
      note: '비트코인 추가 매수'
    },
  ])

  const [filterType, setFilterType] = useState('all')
  const [filterMonth, setFilterMonth] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'buy',
    asset: '',
    quantity: '',
    price: '',
    note: ''
  })

  const filteredLogs = logs.filter(log => {
    if (filterType !== 'all' && log.type !== filterType) return false
    if (filterMonth !== 'all') {
      const logMonth = new Date(log.date).getMonth()
      if (logMonth !== parseInt(filterMonth)) return false
    }
    return true
  })

  const monthlyStats = {
    totalBuy: logs.filter(l => l.type === 'buy').reduce((sum, l) => sum + l.total, 0),
    totalSell: logs.filter(l => l.type === 'sell').reduce((sum, l) => sum + l.total, 0),
    transactions: logs.length
  }

  const handleAddTransaction = () => {
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setFormData({
      date: new Date().toISOString().split('T')[0],
      type: 'buy',
      asset: '',
      quantity: '',
      price: '',
      note: ''
    })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const quantity = parseFloat(formData.quantity)
    const price = parseFloat(formData.price)
    const total = quantity * price

    const newLog = {
      id: Date.now(),
      date: formData.date,
      type: formData.type,
      asset: formData.asset.toUpperCase(),
      quantity,
      price,
      total,
      note: formData.note
    }

    setLogs(prev => [newLog, ...prev])
    handleCloseModal()
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">총 매수금액</p>
          <p className="text-2xl font-bold text-primary-600">
            ${monthlyStats.totalBuy.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">총 매도금액</p>
          <p className="text-2xl font-bold text-success">
            ${monthlyStats.totalSell.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">총 거래 건수</p>
          <p className="text-2xl font-bold text-gray-900">
            {monthlyStats.transactions}건
          </p>
        </div>
      </div>

      {/* Filters and Add Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">전체</option>
              <option value="buy">매수</option>
              <option value="sell">매도</option>
            </select>
          </div>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">전체 기간</option>
            <option value="0">1월</option>
            <option value="1">2월</option>
            <option value="2">3월</option>
            <option value="3">4월</option>
            <option value="4">5월</option>
            <option value="5">6월</option>
            <option value="6">7월</option>
            <option value="7">8월</option>
            <option value="8">9월</option>
            <option value="9">10월</option>
            <option value="10">11월</option>
            <option value="11">12월</option>
          </select>
        </div>
        <button onClick={handleAddTransaction} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          거래 추가
        </button>
      </div>

      {/* Investment Log Table */}
      <ChartCard
        title="투자 거래 내역"
        subtitle={`${filteredLogs.length}건의 거래`}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">날짜</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">유형</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">자산</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">수량</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">가격</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">총액</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">메모</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {log.date}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                      log.type === 'buy'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-success/10 text-success'
                    }`}>
                      {log.type === 'buy' ? '매수' : '매도'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">
                    {log.asset}
                  </td>
                  <td className="py-4 px-4 text-right text-sm text-gray-700">
                    {log.quantity}
                  </td>
                  <td className="py-4 px-4 text-right text-sm text-gray-700">
                    ${log.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-4 text-right text-sm font-medium text-gray-900">
                    ${log.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600">
                    {log.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">거래 내역이 없습니다</p>
          </div>
        )}
      </ChartCard>

      {/* Add Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">거래 추가</h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  날짜
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  거래 유형
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="buy">매수</option>
                  <option value="sell">매도</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  자산명 (예: AAPL, BTC, TSLA)
                </label>
                <input
                  type="text"
                  name="asset"
                  value={formData.asset}
                  onChange={handleInputChange}
                  required
                  placeholder="AAPL"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    수량
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                    step="0.000001"
                    min="0"
                    placeholder="1.0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    가격 ($)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    min="0"
                    placeholder="100.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  메모 (선택)
                </label>
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="거래에 대한 메모를 입력하세요..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default InvestmentLog
