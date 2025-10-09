import React, { useState, useEffect, useMemo } from 'react'
import {
  Plus,
  Edit,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Building,
  CreditCard,
  PiggyBank,
  Check,
  X,
  Trash2
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts'

// Icon mapper helper
const getIconComponent = (iconName) => {
  const iconMap = {
    Building,
    Wallet,
    CreditCard,
    TrendingUp,
    PiggyBank,
    DollarSign
  }
  return iconMap[iconName] || Building
}

const AssetStatus = () => {
  // State
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [statusData, setStatusData] = useState({}) // { year: { month: { category: value } } }
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingMonth, setEditingMonth] = useState(null)
  const [editingYear, setEditingYear] = useState(null)
  const [accountData, setAccountData] = useState({}) // { year: { accountType: value } }
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')

  // Default categories
  const defaultIncomeCategories = [
    { id: 'accumulated', name: '누적금액', color: '#6366f1', isAccumulated: true }, // Special: auto-calculated
    { id: 'salary', name: '아르바이트', color: '#10b981' },
    { id: 'freelance', name: '월 급여', color: '#3b82f6' },
    { id: 'sideIncome', name: '주제외 급여', color: '#8b5cf6' },
    { id: 'dividend', name: '배당/상여금', color: '#ec4899' },
    { id: 'other', name: '재테크 수입', color: '#f59e0b' }
  ]

  const defaultExpenseCategories = [
    { id: 'savings', name: '주택 담보대출', color: '#ef4444' },
    { id: 'insurance', name: '보험료 지출', color: '#f97316' },
    { id: 'living', name: '생활비용 대금', color: '#eab308' },
    { id: 'investment', name: '우리경영여금', color: '#06b6d4' },
    { id: 'loan', name: '월화 지출', color: '#8b5cf6' },
    { id: 'card', name: '카드 지출', color: '#ec4899' },
    { id: 'vnd', name: 'VND 지출', color: '#6366f1' }
  ]

  // Categories from localStorage or defaults
  const [incomeCategories, setIncomeCategories] = useState(defaultIncomeCategories)
  const [expenseCategories, setExpenseCategories] = useState(defaultExpenseCategories)

  // Default account types for breakdown
  const defaultAccountTypes = [
    { id: 'hana', name: '하나은행', icon: 'Building' },
    { id: 'shinhan', name: '신한은행', icon: 'Building' },
    { id: 'woori', name: '우리은행', icon: 'Building' },
    { id: 'kakao', name: '카카오뱅크', icon: 'Wallet' },
    { id: 'shinhanDebit', name: '신한 토스', icon: 'CreditCard' },
    { id: 'toss', name: '토스 투자', icon: 'TrendingUp' },
    { id: 'samsung', name: '삼성증권', icon: 'TrendingUp' },
    { id: 'korea', name: '한국투자증권', icon: 'TrendingUp' },
    { id: 'mirae', name: '미래에셋증권', icon: 'TrendingUp' },
    { id: 'samsung2', name: '삼성생명보험', icon: 'PiggyBank' },
    { id: 'union', name: '오리경영보험', icon: 'PiggyBank' },
    { id: 'gold', name: '골드', icon: 'DollarSign' }
  ]

  // Account types from localStorage or defaults
  const [accountTypes, setAccountTypes] = useState(defaultAccountTypes)

  const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

  // Load data from localStorage
  useEffect(() => {
    const savedStatus = localStorage.getItem('asset_status_data')
    if (savedStatus) {
      setStatusData(JSON.parse(savedStatus))
    }

    const savedAccountData = localStorage.getItem('asset_account_data')
    if (savedAccountData) {
      setAccountData(JSON.parse(savedAccountData))
    }

    const savedIncome = localStorage.getItem('asset_income_categories')
    if (savedIncome) {
      setIncomeCategories(JSON.parse(savedIncome))
    }

    const savedExpense = localStorage.getItem('asset_expense_categories')
    if (savedExpense) {
      setExpenseCategories(JSON.parse(savedExpense))
    }

    const savedAccountTypes = localStorage.getItem('asset_account_types')
    if (savedAccountTypes) {
      setAccountTypes(JSON.parse(savedAccountTypes))
    }
  }, [])

  // Save status data to localStorage
  useEffect(() => {
    if (Object.keys(statusData).length > 0) {
      localStorage.setItem('asset_status_data', JSON.stringify(statusData))
    }
  }, [statusData])

  // Save account data to localStorage
  useEffect(() => {
    if (Object.keys(accountData).length > 0) {
      localStorage.setItem('asset_account_data', JSON.stringify(accountData))
    }
  }, [accountData])

  // Save categories to localStorage
  useEffect(() => {
    if (incomeCategories.length > 0) {
      localStorage.setItem('asset_income_categories', JSON.stringify(incomeCategories))
    }
  }, [incomeCategories])

  useEffect(() => {
    if (expenseCategories.length > 0) {
      localStorage.setItem('asset_expense_categories', JSON.stringify(expenseCategories))
    }
  }, [expenseCategories])

  useEffect(() => {
    if (accountTypes.length > 0) {
      localStorage.setItem('asset_account_types', JSON.stringify(accountTypes))
    }
  }, [accountTypes])

  // Get available years
  const availableYears = useMemo(() => {
    const years = Object.keys(statusData).map(Number).sort((a, b) => b - a)
    if (years.length === 0) {
      return [new Date().getFullYear()]
    }
    return years
  }, [statusData])

  // Calculate monthly totals
  const calculateMonthlyData = useMemo(() => {
    const yearData = statusData[selectedYear] || {}
    const monthlyData = []
    let accumulatedAmount = 0 // Running accumulated amount

    for (let i = 0; i < 12; i++) {
      const monthKey = i + 1
      const monthData = yearData[monthKey] || {}

      // Calculate income total (exclude accumulated amount)
      const incomeTotal = incomeCategories.reduce((sum, cat) => {
        if (cat.isAccumulated) return sum // Exclude accumulated from income total
        return sum + (monthData[cat.id] || 0)
      }, 0)

      // Calculate expense total
      const expenseTotal = expenseCategories.reduce((sum, cat) => {
        return sum + (monthData[cat.id] || 0)
      }, 0)

      // Calculate net change for previous month
      const netChange = incomeTotal - expenseTotal

      // Update accumulated amount: previous accumulated + previous netChange
      if (i > 0) {
        const prevNetChange = monthlyData[i - 1].netChange
        accumulatedAmount = accumulatedAmount + prevNetChange
      }

      monthlyData.push({
        month: months[i],
        monthIndex: i,
        income: incomeTotal, // This excludes accumulated amount
        expense: expenseTotal,
        netChange: netChange,
        accumulated: accumulatedAmount, // Auto-calculated accumulated amount
        ...monthData
      })
    }

    return monthlyData
  }, [statusData, selectedYear, incomeCategories, expenseCategories])

  // Calculate cumulative data for chart
  const chartData = useMemo(() => {
    let cumulative = 0
    return calculateMonthlyData.map((data, index) => {
      cumulative += data.netChange
      return {
        month: data.month,
        income: data.income,
        expense: data.expense,
        netChange: data.netChange,
        cumulative: cumulative
      }
    })
  }, [calculateMonthlyData])

  // Calculate yearly totals
  const yearlyTotals = useMemo(() => {
    const totals = {
      income: {},
      expense: {},
      incomeTotal: 0,
      expenseTotal: 0,
      accumulatedTotal: 0
    }

    // Income totals (exclude accumulated from incomeTotal)
    incomeCategories.forEach(cat => {
      if (cat.id === 'accumulated') {
        // Get accumulated total from last month's accumulated value
        const lastMonth = calculateMonthlyData[11]
        totals.accumulatedTotal = lastMonth?.accumulated || 0
        totals.income[cat.id] = totals.accumulatedTotal
      } else {
        const total = calculateMonthlyData.reduce((sum, month) => sum + (month[cat.id] || 0), 0)
        totals.income[cat.id] = total
        totals.incomeTotal += total // Only add non-accumulated income
      }
    })

    // Expense totals
    expenseCategories.forEach(cat => {
      const total = calculateMonthlyData.reduce((sum, month) => sum + (month[cat.id] || 0), 0)
      totals.expense[cat.id] = total
      totals.expenseTotal += total
    })

    totals.netTotal = totals.incomeTotal - totals.expenseTotal

    return totals
  }, [calculateMonthlyData, incomeCategories, expenseCategories])

  // Calculate account percentages
  const accountBreakdown = useMemo(() => {
    const yearAccounts = accountData[selectedYear] || {}
    const total = Object.values(yearAccounts).reduce((sum, val) => sum + val, 0)

    return accountTypes.map(acc => ({
      ...acc,
      value: yearAccounts[acc.id] || 0,
      percentage: total > 0 ? ((yearAccounts[acc.id] || 0) / total * 100) : 0
    }))
  }, [accountData, selectedYear, accountTypes])

  const totalAccountValue = useMemo(() => {
    return accountBreakdown.reduce((sum, acc) => sum + acc.value, 0)
  }, [accountBreakdown])

  // Handlers
  const handleOpenEditModal = (monthIndex) => {
    setEditingMonth(monthIndex)
    setEditingYear(selectedYear)
    setShowEditModal(true)
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditingMonth(null)
    setEditingYear(null)
  }

  const handleSaveMonthData = (monthIndex, categoryId, value) => {
    setStatusData(prev => {
      const updated = { ...prev }
      if (!updated[selectedYear]) {
        updated[selectedYear] = {}
      }
      if (!updated[selectedYear][monthIndex + 1]) {
        updated[selectedYear][monthIndex + 1] = {}
      }
      updated[selectedYear][monthIndex + 1][categoryId] = parseFloat(value) || 0
      return updated
    })
  }

  const handleSaveAccountData = (accountId, value) => {
    setAccountData(prev => {
      const updated = { ...prev }
      if (!updated[selectedYear]) {
        updated[selectedYear] = {}
      }
      updated[selectedYear][accountId] = parseFloat(value) || 0
      return updated
    })
  }

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-'
    return new Intl.NumberFormat('ko-KR').format(Math.round(value))
  }

  // Category name editing handlers
  const handleStartEditCategory = (categoryId, currentName) => {
    setEditingCategoryId(categoryId)
    setEditingCategoryName(currentName)
  }

  const handleSaveCategoryName = (isIncome) => {
    if (!editingCategoryName.trim()) {
      setEditingCategoryId(null)
      return
    }

    if (isIncome) {
      setIncomeCategories(prev =>
        prev.map(cat =>
          cat.id === editingCategoryId
            ? { ...cat, name: editingCategoryName.trim() }
            : cat
        )
      )
    } else {
      setExpenseCategories(prev =>
        prev.map(cat =>
          cat.id === editingCategoryId
            ? { ...cat, name: editingCategoryName.trim() }
            : cat
        )
      )
    }

    setEditingCategoryId(null)
    setEditingCategoryName('')
  }

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null)
    setEditingCategoryName('')
  }

  // Add/Delete category handlers
  const handleAddIncomeCategory = () => {
    const newId = `income_${Date.now()}`
    setIncomeCategories(prev => [
      ...prev,
      { id: newId, name: '새 수입 항목', color: '#10b981' }
    ])
  }

  const handleAddExpenseCategory = () => {
    const newId = `expense_${Date.now()}`
    setExpenseCategories(prev => [
      ...prev,
      { id: newId, name: '새 지출 항목', color: '#ef4444' }
    ])
  }

  const handleDeleteCategory = (categoryId, isIncome) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return

    if (isIncome) {
      setIncomeCategories(prev => prev.filter(cat => cat.id !== categoryId))
    } else {
      setExpenseCategories(prev => prev.filter(cat => cat.id !== categoryId))
    }
  }

  // Add/Delete account handlers
  const handleAddAccount = () => {
    const newId = `account_${Date.now()}`
    setAccountTypes(prev => [
      ...prev,
      { id: newId, name: '새 계좌', icon: 'Building' }
    ])
  }

  const handleDeleteAccount = (accountId) => {
    if (!confirm('이 계좌를 삭제하시겠습니까?')) return
    setAccountTypes(prev => prev.filter(acc => acc.id !== accountId))
  }

  const handleSaveAccountName = () => {
    if (!editingCategoryName.trim()) {
      setEditingCategoryId(null)
      return
    }

    setAccountTypes(prev =>
      prev.map(acc =>
        acc.id === editingCategoryId
          ? { ...acc, name: editingCategoryName.trim() }
          : acc
      )
    )

    setEditingCategoryId(null)
    setEditingCategoryName('')
  }

  return (
    <div className="space-y-6">
      {/* Header with year filter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">자산 현황</h1>
          <p className="text-gray-600 mt-1">월별 수입/지출 및 계좌별 자산 현황</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              const newYear = new Date().getFullYear()
              if (!availableYears.includes(newYear)) {
                setStatusData(prev => ({ ...prev, [newYear]: {} }))
                setAccountData(prev => ({ ...prev, [newYear]: {} }))
              }
              setSelectedYear(newYear)
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            신규 연도 추가
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">연간 총 수입</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(yearlyTotals.incomeTotal)}</p>
              <p className="text-green-100 text-xs mt-1">KRW</p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-200 opacity-80" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">연간 총 지출</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(yearlyTotals.expenseTotal)}</p>
              <p className="text-red-100 text-xs mt-1">KRW</p>
            </div>
            <TrendingDown className="w-12 h-12 text-red-200 opacity-80" />
          </div>
        </div>

        <div className={`card bg-gradient-to-br ${yearlyTotals.netTotal >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`${yearlyTotals.netTotal >= 0 ? 'text-blue-100' : 'text-orange-100'} text-sm font-medium`}>연간 순변동</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(yearlyTotals.netTotal)}</p>
              <p className={`${yearlyTotals.netTotal >= 0 ? 'text-blue-100' : 'text-orange-100'} text-xs mt-1`}>KRW</p>
            </div>
            <DollarSign className={`w-12 h-12 ${yearlyTotals.netTotal >= 0 ? 'text-blue-200' : 'text-orange-200'} opacity-80`} />
          </div>
        </div>
      </div>

      {/* Monthly Income/Expense Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">월별 수입/지출 현황표</h2>
          <div className="flex gap-2">
            <button
              onClick={handleAddIncomeCategory}
              className="btn-secondary flex items-center gap-2 text-sm"
              title="수입 항목 추가"
            >
              <Plus className="w-4 h-4" />
              수입 추가
            </button>
            <button
              onClick={handleAddExpenseCategory}
              className="btn-secondary flex items-center gap-2 text-sm"
              title="지출 항목 추가"
            >
              <Plus className="w-4 h-4" />
              지출 추가
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-100 border-b border-blue-200">
                <th className="text-left py-3 px-4 font-bold text-blue-900 sticky left-0 bg-blue-100 z-10">항목</th>
                {months.map((month, idx) => (
                  <th key={idx} className="text-center py-3 px-4 font-bold text-blue-900 min-w-[120px]">
                    {month}
                  </th>
                ))}
                <th className="text-center py-3 px-4 font-bold text-blue-900 bg-blue-200 min-w-[140px]">TOTAL</th>
              </tr>
            </thead>

            <tbody>
              {/* Income Categories */}
              {incomeCategories.map((category) => (
                <tr key={category.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900 sticky left-0 bg-white z-10">
                    {editingCategoryId === category.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveCategoryName(true)
                            if (e.key === 'Escape') handleCancelEditCategory()
                          }}
                          className="flex-1 px-2 py-1 border border-primary-500 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveCategoryName(true)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="저장"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEditCategory}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="취소"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <span className={category.isAccumulated ? 'text-indigo-700 font-semibold' : ''}>
                          {category.name}
                          {category.isAccumulated && (
                            <span className="text-xs ml-2 text-indigo-500">(자동계산)</span>
                          )}
                        </span>
                        {!category.isAccumulated && (
                          <>
                            <button
                              onClick={() => handleStartEditCategory(category.id, category.name)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-opacity"
                              title="이름 수정"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id, true)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-opacity"
                              title="삭제"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  {calculateMonthlyData.map((monthData, idx) => (
                    <td
                      key={idx}
                      className={`text-right py-3 px-4 text-gray-700 ${
                        category.isAccumulated
                          ? 'bg-indigo-50 font-semibold text-indigo-700'
                          : 'cursor-pointer hover:bg-blue-50'
                      }`}
                      onClick={() => !category.isAccumulated && handleOpenEditModal(idx)}
                      title={category.isAccumulated ? '자동 계산됨 (전월 누적금액 + 전월 월지출총합)' : ''}
                    >
                      {formatCurrency(category.isAccumulated ? monthData.accumulated : monthData[category.id])}
                    </td>
                  ))}
                  <td className="text-right py-3 px-4 font-bold text-gray-900 bg-blue-50">
                    {formatCurrency(yearlyTotals.income[category.id])}
                  </td>
                </tr>
              ))}

              {/* Income Total Row */}
              <tr className="bg-blue-50 border-b-2 border-blue-300 font-bold">
                <td className="py-3 px-4 text-blue-900 sticky left-0 bg-blue-50 z-10">수입 TOTAL</td>
                {calculateMonthlyData.map((monthData, idx) => (
                  <td key={idx} className="text-right py-3 px-4 text-blue-900">
                    {formatCurrency(monthData.income)}
                  </td>
                ))}
                <td className="text-right py-3 px-4 text-blue-900 bg-blue-100">
                  {formatCurrency(yearlyTotals.incomeTotal)}
                </td>
              </tr>

              {/* Expense Categories */}
              {expenseCategories.map((category) => (
                <tr key={category.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900 sticky left-0 bg-white z-10">
                    {editingCategoryId === category.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveCategoryName(false)
                            if (e.key === 'Escape') handleCancelEditCategory()
                          }}
                          className="flex-1 px-2 py-1 border border-primary-500 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveCategoryName(false)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="저장"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEditCategory}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="취소"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <span>{category.name}</span>
                        <button
                          onClick={() => handleStartEditCategory(category.id, category.name)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-opacity"
                          title="이름 수정"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id, false)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-opacity"
                          title="삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </td>
                  {calculateMonthlyData.map((monthData, idx) => (
                    <td
                      key={idx}
                      className="text-right py-3 px-4 text-gray-700 cursor-pointer hover:bg-red-50"
                      onClick={() => handleOpenEditModal(idx)}
                    >
                      {formatCurrency(monthData[category.id])}
                    </td>
                  ))}
                  <td className="text-right py-3 px-4 font-bold text-gray-900 bg-red-50">
                    {formatCurrency(yearlyTotals.expense[category.id])}
                  </td>
                </tr>
              ))}

              {/* Expense Total Row */}
              <tr className="bg-red-50 border-b-2 border-red-300 font-bold">
                <td className="py-3 px-4 text-red-900 sticky left-0 bg-red-50 z-10">지출 TOTAL</td>
                {calculateMonthlyData.map((monthData, idx) => (
                  <td key={idx} className="text-right py-3 px-4 text-red-900">
                    {formatCurrency(monthData.expense)}
                  </td>
                ))}
                <td className="text-right py-3 px-4 text-red-900 bg-red-100">
                  {formatCurrency(yearlyTotals.expenseTotal)}
                </td>
              </tr>

              {/* Net Change Row */}
              <tr className="bg-gray-100 border-b-2 border-gray-400 font-bold text-lg">
                <td className="py-3 px-4 text-gray-900 sticky left-0 bg-gray-100 z-10">월 지출 총합</td>
                {calculateMonthlyData.map((monthData, idx) => (
                  <td
                    key={idx}
                    className={`text-right py-3 px-4 ${monthData.netChange >= 0 ? 'text-green-700' : 'text-red-700'}`}
                  >
                    {formatCurrency(monthData.netChange)}
                  </td>
                ))}
                <td className={`text-right py-3 px-4 bg-gray-200 ${yearlyTotals.netTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(yearlyTotals.netTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 gap-6">
        {/* Combined Chart */}
        <div className="card">
          <h3 className="text-xl font-bold text-gray-900 mb-6">월별 수입/지출 추이 및 누적 자산</h3>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis yAxisId="left" stroke="#6b7280" />
              <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value) => formatCurrency(value) + ' KRW'}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="netChange" fill="#3b82f6" name="수입-지출 현황" />
              <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#9ca3af" strokeWidth={3} name="TOTAL 자산가치" />
              <Line yAxisId="right" type="monotone" dataKey="income" stroke="#f97316" strokeWidth={2} name="아르바이트" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Account Breakdown Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">계좌별 자산 현황</h2>
          <div className="flex gap-2">
            <button
              onClick={handleAddAccount}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              계좌 추가
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Edit className="w-4 h-4" />
              금액 수정
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-100 border-b border-blue-200">
                <th className="text-left py-3 px-4 font-bold text-blue-900">항목</th>
                <th className="text-right py-3 px-4 font-bold text-blue-900">은행계좌</th>
                <th className="text-right py-3 px-4 font-bold text-blue-900">USD계좌</th>
                <th className="text-right py-3 px-4 font-bold text-blue-900">연금저축</th>
                <th className="text-right py-3 px-4 font-bold text-blue-900">투자전환</th>
                <th className="text-right py-3 px-4 font-bold text-blue-900">적금</th>
                <th className="text-right py-3 px-4 font-bold text-blue-900">예금</th>
                <th className="text-right py-3 px-4 font-bold text-blue-900 bg-blue-200">TOTAL</th>
                <th className="text-center py-3 px-4 font-bold text-blue-900 bg-blue-200">점유율</th>
              </tr>
            </thead>

            <tbody>
              {accountBreakdown.map((account) => {
                const Icon = getIconComponent(account.icon)
                return (
                  <tr key={account.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {editingCategoryId === account.id ? (
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-600" />
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveAccountName()
                              if (e.key === 'Escape') handleCancelEditCategory()
                            }}
                            className="flex-1 px-2 py-1 border border-primary-500 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveAccountName}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="저장"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEditCategory}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="취소"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <Icon className="w-4 h-4 text-gray-600" />
                          <span>{account.name}</span>
                          <button
                            onClick={() => handleStartEditCategory(account.id, account.name)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-opacity"
                            title="이름 수정"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(account.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-opacity"
                            title="삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="text-right py-3 px-4 text-gray-700">-</td>
                    <td className="text-right py-3 px-4 text-gray-700">-</td>
                    <td className="text-right py-3 px-4 text-gray-700">-</td>
                    <td className="text-right py-3 px-4 text-gray-700">-</td>
                    <td className="text-right py-3 px-4 text-gray-700">-</td>
                    <td className="text-right py-3 px-4 text-gray-700">-</td>
                    <td className="text-right py-3 px-4 font-bold text-gray-900 bg-blue-50">
                      {formatCurrency(account.value)}
                    </td>
                    <td className="text-center py-3 px-4 font-medium text-gray-900 bg-blue-50">
                      {account.percentage.toFixed(0)}%
                    </td>
                  </tr>
                )
              })}

              {/* Total Row */}
              <tr className="bg-blue-100 border-t-2 border-blue-300 font-bold">
                <td className="py-3 px-4 text-blue-900">TOTAL</td>
                <td className="text-right py-3 px-4 text-blue-900">-</td>
                <td className="text-right py-3 px-4 text-blue-900">-</td>
                <td className="text-right py-3 px-4 text-blue-900">-</td>
                <td className="text-right py-3 px-4 text-blue-900">-</td>
                <td className="text-right py-3 px-4 text-blue-900">-</td>
                <td className="text-right py-3 px-4 text-blue-900">-</td>
                <td className="text-right py-3 px-4 text-blue-900 bg-blue-200">
                  {formatCurrency(totalAccountValue)}
                </td>
                <td className="text-center py-3 px-4 text-blue-900 bg-blue-200">100%</td>
              </tr>

              {/* Percentage Row */}
              <tr className="bg-blue-50 font-bold">
                <td className="py-3 px-4 text-blue-900">점유율</td>
                <td className="text-center py-3 px-4 text-blue-900">-</td>
                <td className="text-center py-3 px-4 text-blue-900">-</td>
                <td className="text-center py-3 px-4 text-blue-900">-</td>
                <td className="text-center py-3 px-4 text-blue-900">-</td>
                <td className="text-center py-3 px-4 text-blue-900">-</td>
                <td className="text-center py-3 px-4 text-blue-900">-</td>
                <td className="text-center py-3 px-4 text-blue-900 bg-blue-100" colSpan="2">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingMonth !== null && (
        <EditMonthModal
          year={editingYear}
          month={editingMonth}
          monthName={months[editingMonth]}
          monthData={calculateMonthlyData[editingMonth]}
          incomeCategories={incomeCategories}
          expenseCategories={expenseCategories}
          onSave={handleSaveMonthData}
          onClose={handleCloseEditModal}
        />
      )}

      {/* Account Edit Modal */}
      {showEditModal && editingMonth === null && (
        <EditAccountModal
          year={selectedYear}
          accountTypes={accountTypes}
          accountData={accountBreakdown}
          onSave={handleSaveAccountData}
          onClose={handleCloseEditModal}
        />
      )}
    </div>
  )
}

// Edit Month Modal Component
const EditMonthModal = ({ year, month, monthName, monthData, incomeCategories, expenseCategories, onSave, onClose }) => {
  const [formData, setFormData] = useState({})

  useEffect(() => {
    const initial = {}
    incomeCategories.forEach(cat => {
      initial[cat.id] = monthData[cat.id] || 0
    })
    expenseCategories.forEach(cat => {
      initial[cat.id] = monthData[cat.id] || 0
    })
    setFormData(initial)
  }, [month, monthData])

  const handleChange = (categoryId, value) => {
    setFormData(prev => ({
      ...prev,
      [categoryId]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    Object.entries(formData).forEach(([categoryId, value]) => {
      onSave(month, categoryId, value)
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <h3 className="text-xl font-bold text-gray-900">
            {year}년 {monthName} 데이터 수정
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Income Section */}
          <div>
            <h4 className="font-bold text-green-700 mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              수입 항목
            </h4>
            <div className="space-y-3">
              {incomeCategories.map(cat => (
                <div key={cat.id} className="flex items-center gap-3">
                  <label className="w-40 text-sm font-medium text-gray-700">{cat.name}</label>
                  <input
                    type="number"
                    value={formData[cat.id] || ''}
                    onChange={(e) => handleChange(cat.id, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                  />
                  <span className="text-sm text-gray-500 w-12">KRW</span>
                </div>
              ))}
            </div>
          </div>

          {/* Expense Section */}
          <div>
            <h4 className="font-bold text-red-700 mb-3 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              지출 항목
            </h4>
            <div className="space-y-3">
              {expenseCategories.map(cat => (
                <div key={cat.id} className="flex items-center gap-3">
                  <label className="w-40 text-sm font-medium text-gray-700">{cat.name}</label>
                  <input
                    type="number"
                    value={formData[cat.id] || ''}
                    onChange={(e) => handleChange(cat.id, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                  />
                  <span className="text-sm text-gray-500 w-12">KRW</span>
                </div>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button type="submit" className="btn-primary flex-1">
              저장
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Account Modal Component
const EditAccountModal = ({ year, accountTypes, accountData, onSave, onClose }) => {
  const [formData, setFormData] = useState({})

  useEffect(() => {
    const initial = {}
    accountTypes.forEach(acc => {
      const existing = accountData.find(a => a.id === acc.id)
      initial[acc.id] = existing?.value || 0
    })
    setFormData(initial)
  }, [accountData, accountTypes])

  const handleChange = (accountId, value) => {
    setFormData(prev => ({
      ...prev,
      [accountId]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    Object.entries(formData).forEach(([accountId, value]) => {
      onSave(accountId, value)
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <h3 className="text-xl font-bold text-gray-900">
            {year}년 계좌별 자산 수정
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {accountTypes.map(acc => {
            const Icon = getIconComponent(acc.icon)
            return (
              <div key={acc.id} className="flex items-center gap-3">
                <div className="w-48 flex items-center gap-2">
                  <Icon className="w-4 h-4 text-gray-600" />
                  <label className="text-sm font-medium text-gray-700">{acc.name}</label>
                </div>
                <input
                  type="number"
                  value={formData[acc.id] || ''}
                  onChange={(e) => handleChange(acc.id, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0"
                />
                <span className="text-sm text-gray-500 w-12">KRW</span>
              </div>
            )
          })}

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button type="submit" className="btn-primary flex-1">
              저장
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AssetStatus
