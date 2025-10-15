import { useState, useEffect, useCallback } from 'react'
import {
  Receipt,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Wallet,
  FileText,
  Save,
  X
} from 'lucide-react'
import dataSync from '../utils/dataSync'

const MONTHS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월'
]

const TransactionHistory = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [transactionData, setTransactionData] = useState({})
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')

  // Load transaction data from localStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        const loaded = await dataSync.loadUserSetting('transaction_history')
        if (loaded && typeof loaded === 'object') {
          setTransactionData(loaded)
        }
      } catch (error) {
        console.error('Failed to load transaction history:', error)
      }
    }
    loadData()
  }, [])

  // Save transaction data to localStorage
  const saveData = useCallback((data) => {
    setTransactionData(data)
    dataSync.saveUserSetting('transaction_history', data).catch(error => {
      console.error('Failed to save transaction history:', error)
    })
  }, [])

  // Get or initialize year data
  const getYearData = useCallback(() => {
    if (!transactionData[selectedYear]) {
      return {
        shinhanVietnam: {
          depositUSD: Array(12).fill(0),
          depositVND: Array(12).fill(0),
          withdrawalUSD: Array(12).fill(0),
          withdrawalVND: Array(12).fill(0),
          monthlyExpenseVND: Array(12).fill(0)
        },
        investmentIncome: Array(12).fill(0),
        krwExpense: Array(12).fill(0),
        otherExpense: Array(12).fill(0),
        memos: Array(12).fill('')
      }
    }
    return transactionData[selectedYear]
  }, [transactionData, selectedYear])

  const yearData = getYearData()

  // Calculate cumulative values
  const calculateCumulative = (values) => {
    let cumulative = 0
    return values.map(val => {
      cumulative += Number(val || 0)
      return cumulative
    })
  }

  // Handle cell edit
  const handleCellClick = (section, field, monthIndex) => {
    setEditingCell({ section, field, monthIndex })

    let currentValue = 0
    if (section === 'shinhanVietnam') {
      currentValue = yearData.shinhanVietnam[field][monthIndex] || 0
    } else if (section === 'memos') {
      currentValue = yearData.memos[monthIndex] || ''
    } else {
      currentValue = yearData[section][monthIndex] || 0
    }

    setEditValue(currentValue.toString())
  }

  // Handle cell save
  const handleCellSave = () => {
    if (!editingCell) return

    const { section, field, monthIndex } = editingCell
    const newData = { ...transactionData }

    if (!newData[selectedYear]) {
      newData[selectedYear] = getYearData()
    }

    if (section === 'shinhanVietnam') {
      if (!newData[selectedYear].shinhanVietnam[field]) {
        newData[selectedYear].shinhanVietnam[field] = Array(12).fill(0)
      }
      newData[selectedYear].shinhanVietnam[field][monthIndex] = section === 'memos' ? editValue : Number(editValue || 0)
    } else if (section === 'memos') {
      if (!Array.isArray(newData[selectedYear].memos)) {
        newData[selectedYear].memos = Array(12).fill('')
      }
      newData[selectedYear].memos[monthIndex] = editValue
    } else {
      if (!Array.isArray(newData[selectedYear][section])) {
        newData[selectedYear][section] = Array(12).fill(0)
      }
      newData[selectedYear][section][monthIndex] = Number(editValue || 0)
    }

    saveData(newData)
    setEditingCell(null)
    setEditValue('')
  }

  // Handle cell cancel
  const handleCellCancel = () => {
    setEditingCell(null)
    setEditValue('')
  }

  // Format currency
  const formatCurrency = (value, currency = 'KRW') => {
    if (value === null || value === undefined) return '-'
    const num = Number(value)
    if (!Number.isFinite(num)) return '-'

    if (currency === 'USD') {
      return `$${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    } else if (currency === 'VND') {
      return `₫${num.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}`
    }
    return `₩${num.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`
  }

  // Calculate totals
  const shinhanVietnamTotals = {
    depositUSD: yearData.shinhanVietnam.depositUSD.reduce((sum, val) => sum + Number(val || 0), 0),
    depositVND: yearData.shinhanVietnam.depositVND.reduce((sum, val) => sum + Number(val || 0), 0),
    withdrawalUSD: yearData.shinhanVietnam.withdrawalUSD.reduce((sum, val) => sum + Number(val || 0), 0),
    withdrawalVND: yearData.shinhanVietnam.withdrawalVND.reduce((sum, val) => sum + Number(val || 0), 0),
    monthlyExpenseVND: yearData.shinhanVietnam.monthlyExpenseVND.reduce((sum, val) => sum + Number(val || 0), 0)
  }

  const investmentIncomeTotal = yearData.investmentIncome.reduce((sum, val) => sum + Number(val || 0), 0)
  const krwExpenseTotal = yearData.krwExpense.reduce((sum, val) => sum + Number(val || 0), 0)
  const otherExpenseTotal = yearData.otherExpense.reduce((sum, val) => sum + Number(val || 0), 0)

  // Cumulative values
  const shinhanVietnamCumulative = {
    monthlyExpenseVND: calculateCumulative(yearData.shinhanVietnam.monthlyExpenseVND)
  }
  const investmentIncomeCumulative = calculateCumulative(yearData.investmentIncome)
  const krwExpenseCumulative = calculateCumulative(yearData.krwExpense)
  const otherExpenseCumulative = calculateCumulative(yearData.otherExpense)

  // Cell renderer
  const renderCell = (section, field, monthIndex, currency = 'KRW') => {
    const isEditing = editingCell?.section === section &&
                      editingCell?.field === field &&
                      editingCell?.monthIndex === monthIndex

    let value = 0
    if (section === 'shinhanVietnam') {
      value = yearData.shinhanVietnam[field][monthIndex] || 0
    } else if (section === 'memos') {
      value = yearData.memos[monthIndex] || ''
    } else {
      value = yearData[section][monthIndex] || 0
    }

    if (isEditing) {
      return (
        <td key={monthIndex} className="py-2 px-3 bg-blue-50">
          <div className="flex items-center gap-1">
            <input
              type={section === 'memos' ? 'text' : 'number'}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCellSave()
                if (e.key === 'Escape') handleCellCancel()
              }}
              className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleCellSave}
              className="p-1 text-green-600 hover:bg-green-100 rounded"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={handleCellCancel}
              className="p-1 text-red-600 hover:bg-red-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </td>
      )
    }

    return (
      <td
        key={monthIndex}
        onClick={() => handleCellClick(section, field, monthIndex)}
        className="py-2 px-3 text-right text-sm cursor-pointer hover:bg-gray-100 transition-colors"
      >
        {section === 'memos' ? (
          <span className="text-gray-700">{value || '-'}</span>
        ) : (
          formatCurrency(value, currency)
        )}
      </td>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-lg">
            <Receipt className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">입출금 이력</h2>
            <p className="text-sm text-gray-600">월별 입출금 내역 및 누적 관리</p>
          </div>
        </div>

        {/* Year Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
              <option key={year} value={year}>{year}년</option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. 신한은행 베트남 자산 */}
      <div className="card overflow-x-auto">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
          <Wallet className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">신한은행 베트남 자산</h3>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left py-3 px-3 font-semibold text-gray-700">구분</th>
              {MONTHS.map((month, idx) => (
                <th key={idx} className="text-center py-3 px-3 font-semibold text-gray-700">{month}</th>
              ))}
              <th className="text-center py-3 px-3 font-semibold text-blue-700 bg-blue-50">합계</th>
            </tr>
          </thead>
          <tbody>
            {/* 입금 USD */}
            <tr className="border-b border-gray-200">
              <td className="py-2 px-3 font-medium text-gray-900">입금 (USD)</td>
              {Array.from({ length: 12 }, (_, i) => renderCell('shinhanVietnam', 'depositUSD', i, 'USD'))}
              <td className="py-2 px-3 text-right font-bold text-blue-700 bg-blue-50">
                {formatCurrency(shinhanVietnamTotals.depositUSD, 'USD')}
              </td>
            </tr>

            {/* 입금 VND */}
            <tr className="border-b border-gray-200">
              <td className="py-2 px-3 font-medium text-gray-900">입금 (VND)</td>
              {Array.from({ length: 12 }, (_, i) => renderCell('shinhanVietnam', 'depositVND', i, 'VND'))}
              <td className="py-2 px-3 text-right font-bold text-blue-700 bg-blue-50">
                {formatCurrency(shinhanVietnamTotals.depositVND, 'VND')}
              </td>
            </tr>

            {/* 출금 USD */}
            <tr className="border-b border-gray-200">
              <td className="py-2 px-3 font-medium text-gray-900">출금 (USD)</td>
              {Array.from({ length: 12 }, (_, i) => renderCell('shinhanVietnam', 'withdrawalUSD', i, 'USD'))}
              <td className="py-2 px-3 text-right font-bold text-red-700 bg-red-50">
                {formatCurrency(shinhanVietnamTotals.withdrawalUSD, 'USD')}
              </td>
            </tr>

            {/* 출금 VND */}
            <tr className="border-b border-gray-200">
              <td className="py-2 px-3 font-medium text-gray-900">출금 (VND)</td>
              {Array.from({ length: 12 }, (_, i) => renderCell('shinhanVietnam', 'withdrawalVND', i, 'VND'))}
              <td className="py-2 px-3 text-right font-bold text-red-700 bg-red-50">
                {formatCurrency(shinhanVietnamTotals.withdrawalVND, 'VND')}
              </td>
            </tr>

            {/* 월 사용비용 VND */}
            <tr className="border-b-2 border-gray-300 bg-yellow-50">
              <td className="py-2 px-3 font-medium text-gray-900">월 사용비용 (VND)</td>
              {Array.from({ length: 12 }, (_, i) => renderCell('shinhanVietnam', 'monthlyExpenseVND', i, 'VND'))}
              <td className="py-2 px-3 text-right font-bold text-orange-700 bg-orange-50">
                {formatCurrency(shinhanVietnamTotals.monthlyExpenseVND, 'VND')}
              </td>
            </tr>

            {/* 월 사용비용 누적 */}
            <tr className="bg-yellow-100">
              <td className="py-2 px-3 font-bold text-gray-900">월 사용비용 누적 (VND)</td>
              {shinhanVietnamCumulative.monthlyExpenseVND.map((cumVal, idx) => (
                <td key={idx} className="py-2 px-3 text-right font-semibold text-orange-700">
                  {formatCurrency(cumVal, 'VND')}
                </td>
              ))}
              <td className="py-2 px-3 text-right font-bold text-orange-700 bg-orange-100">
                {formatCurrency(shinhanVietnamTotals.monthlyExpenseVND, 'VND')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 2. 수익재테크 금액 */}
      <div className="card overflow-x-auto">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-bold text-gray-900">수익재테크 금액</h3>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left py-3 px-3 font-semibold text-gray-700">구분</th>
              {MONTHS.map((month, idx) => (
                <th key={idx} className="text-center py-3 px-3 font-semibold text-gray-700">{month}</th>
              ))}
              <th className="text-center py-3 px-3 font-semibold text-green-700 bg-green-50">합계</th>
            </tr>
          </thead>
          <tbody>
            {/* 월별 수익 */}
            <tr className="border-b-2 border-gray-300">
              <td className="py-2 px-3 font-medium text-gray-900">월별 수익 (₩)</td>
              {Array.from({ length: 12 }, (_, i) => renderCell('investmentIncome', null, i, 'KRW'))}
              <td className="py-2 px-3 text-right font-bold text-green-700 bg-green-50">
                {formatCurrency(investmentIncomeTotal, 'KRW')}
              </td>
            </tr>

            {/* 누적 수익 */}
            <tr className="bg-green-100">
              <td className="py-2 px-3 font-bold text-gray-900">누적 수익 (₩)</td>
              {investmentIncomeCumulative.map((cumVal, idx) => (
                <td key={idx} className="py-2 px-3 text-right font-semibold text-green-700">
                  {formatCurrency(cumVal, 'KRW')}
                </td>
              ))}
              <td className="py-2 px-3 text-right font-bold text-green-700 bg-green-100">
                {formatCurrency(investmentIncomeTotal, 'KRW')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 3. 원화 사용금액 지출 */}
      <div className="card overflow-x-auto">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
          <DollarSign className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-bold text-gray-900">원화 사용금액 지출</h3>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left py-3 px-3 font-semibold text-gray-700">구분</th>
              {MONTHS.map((month, idx) => (
                <th key={idx} className="text-center py-3 px-3 font-semibold text-gray-700">{month}</th>
              ))}
              <th className="text-center py-3 px-3 font-semibold text-red-700 bg-red-50">합계</th>
            </tr>
          </thead>
          <tbody>
            {/* 월별 지출 */}
            <tr className="border-b-2 border-gray-300">
              <td className="py-2 px-3 font-medium text-gray-900">월별 지출 (₩)</td>
              {Array.from({ length: 12 }, (_, i) => renderCell('krwExpense', null, i, 'KRW'))}
              <td className="py-2 px-3 text-right font-bold text-red-700 bg-red-50">
                {formatCurrency(krwExpenseTotal, 'KRW')}
              </td>
            </tr>

            {/* 누적 지출 */}
            <tr className="bg-red-100">
              <td className="py-2 px-3 font-bold text-gray-900">누적 지출 (₩)</td>
              {krwExpenseCumulative.map((cumVal, idx) => (
                <td key={idx} className="py-2 px-3 text-right font-semibold text-red-700">
                  {formatCurrency(cumVal, 'KRW')}
                </td>
              ))}
              <td className="py-2 px-3 text-right font-bold text-red-700 bg-red-100">
                {formatCurrency(krwExpenseTotal, 'KRW')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. 기타 사용 비용 */}
      <div className="card overflow-x-auto">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
          <FileText className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-bold text-gray-900">기타 사용 비용</h3>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left py-3 px-3 font-semibold text-gray-700">구분</th>
              {MONTHS.map((month, idx) => (
                <th key={idx} className="text-center py-3 px-3 font-semibold text-gray-700">{month}</th>
              ))}
              <th className="text-center py-3 px-3 font-semibold text-purple-700 bg-purple-50">합계</th>
            </tr>
          </thead>
          <tbody>
            {/* 월별 비용 */}
            <tr className="border-b border-gray-300">
              <td className="py-2 px-3 font-medium text-gray-900">월별 비용 (₩)</td>
              {Array.from({ length: 12 }, (_, i) => renderCell('otherExpense', null, i, 'KRW'))}
              <td className="py-2 px-3 text-right font-bold text-purple-700 bg-purple-50">
                {formatCurrency(otherExpenseTotal, 'KRW')}
              </td>
            </tr>

            {/* 누적 비용 */}
            <tr className="border-b-2 border-gray-300 bg-purple-100">
              <td className="py-2 px-3 font-bold text-gray-900">누적 비용 (₩)</td>
              {otherExpenseCumulative.map((cumVal, idx) => (
                <td key={idx} className="py-2 px-3 text-right font-semibold text-purple-700">
                  {formatCurrency(cumVal, 'KRW')}
                </td>
              ))}
              <td className="py-2 px-3 text-right font-bold text-purple-700 bg-purple-100">
                {formatCurrency(otherExpenseTotal, 'KRW')}
              </td>
            </tr>

            {/* 메모 */}
            <tr className="bg-purple-50">
              <td className="py-2 px-3 font-medium text-gray-900">메모</td>
              {Array.from({ length: 12 }, (_, i) => renderCell('memos', null, i))}
              <td className="py-2 px-3 text-center text-gray-500 bg-purple-50">-</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Usage Guide */}
      <div className="card bg-blue-50 border border-blue-200">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-2">사용 방법:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>각 셀을 클릭하여 값을 입력하거나 수정할 수 있습니다</li>
              <li>Enter 키를 눌러 저장하고, Esc 키를 눌러 취소합니다</li>
              <li>누적 값은 월별 입력 값을 자동으로 합산하여 표시됩니다</li>
              <li>합계 열은 연간 총합을 보여줍니다</li>
              <li>기타 비용 메모 항목에는 각 월의 비용 내역을 기록할 수 있습니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TransactionHistory
