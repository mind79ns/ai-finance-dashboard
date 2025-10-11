import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트 초기화
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Supabase 설정 여부 확인
const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase not configured. App will use localStorage only.')
  console.info('ℹ️ To enable cloud sync, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file')
}

// Supabase 클라이언트 생성 (설정되지 않았으면 null)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// 기본 사용자 ID (향후 인증 기능 추가 시 변경)
const DEFAULT_USER_ID = 'default_user'

/**
 * ==========================================
 * Portfolio 관련 함수
 * ==========================================
 */

// 모든 포트폴리오 자산 가져오기
export const getPortfolios = async (userId = DEFAULT_USER_ID) => {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  try {
    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Supabase의 snake_case를 camelCase로 변환
    return data.map(item => ({
      id: item.id,
      symbol: item.symbol,
      name: item.name,
      type: item.type,
      quantity: parseFloat(item.quantity),
      avgPrice: parseFloat(item.avg_price),
      currentPrice: parseFloat(item.current_price),
      totalValue: parseFloat(item.total_value),
      profit: parseFloat(item.profit),
      profitPercent: parseFloat(item.profit_percent),
      currency: item.currency,
      account: item.account,
      category: item.category,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }))
  } catch (error) {
    console.error('Error fetching portfolios:', error)
    throw error
  }
}

// 포트폴리오 자산 추가
export const addPortfolio = async (asset, userId = DEFAULT_USER_ID) => {
  try {
    const { data, error } = await supabase
      .from('portfolios')
      .insert([{
        user_id: userId,
        symbol: asset.symbol,
        name: asset.name,
        type: asset.type,
        quantity: asset.quantity,
        avg_price: asset.avgPrice,
        current_price: asset.currentPrice || asset.avgPrice,
        total_value: asset.totalValue || (asset.quantity * asset.avgPrice),
        profit: asset.profit || 0,
        profit_percent: asset.profitPercent || 0,
        currency: asset.currency || 'USD',
        account: asset.account || '기본계좌',
        category: asset.category || '해외주식'
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding portfolio:', error)
    throw error
  }
}

// 포트폴리오 자산 업데이트
export const updatePortfolio = async (id, updates) => {
  try {
    const updateData = {}

    if (updates.currentPrice !== undefined) updateData.current_price = updates.currentPrice
    if (updates.totalValue !== undefined) updateData.total_value = updates.totalValue
    if (updates.profit !== undefined) updateData.profit = updates.profit
    if (updates.profitPercent !== undefined) updateData.profit_percent = updates.profitPercent
    if (updates.quantity !== undefined) updateData.quantity = updates.quantity
    if (updates.avgPrice !== undefined) updateData.avg_price = updates.avgPrice

    const { data, error } = await supabase
      .from('portfolios')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating portfolio:', error)
    throw error
  }
}

// 포트폴리오 자산 삭제
export const deletePortfolio = async (id) => {
  try {
    const { error } = await supabase
      .from('portfolios')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting portfolio:', error)
    throw error
  }
}

// 여러 자산 일괄 추가 (CSV 가져오기용)
export const bulkAddPortfolios = async (assets, userId = DEFAULT_USER_ID) => {
  try {
    const insertData = assets.map(asset => ({
      user_id: userId,
      symbol: asset.symbol,
      name: asset.name,
      type: asset.type,
      quantity: asset.quantity,
      avg_price: asset.avgPrice,
      current_price: asset.currentPrice || asset.avgPrice,
      total_value: asset.totalValue || (asset.quantity * asset.avgPrice),
      profit: asset.profit || 0,
      profit_percent: asset.profitPercent || 0,
      currency: asset.currency || 'USD',
      account: asset.account || '기본계좌',
      category: asset.category || '해외주식'
    }))

    const { data, error } = await supabase
      .from('portfolios')
      .insert(insertData)
      .select()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error bulk adding portfolios:', error)
    throw error
  }
}

// 여러 자산 일괄 삭제
export const bulkDeletePortfolios = async (ids) => {
  try {
    const { error } = await supabase
      .from('portfolios')
      .delete()
      .in('id', ids)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error bulk deleting portfolios:', error)
    throw error
  }
}

/**
 * ==========================================
 * Account Principals 관련 함수
 * ==========================================
 */

// 모든 계좌 원금/예수금 가져오기
export const getAccountPrincipals = async (userId = DEFAULT_USER_ID) => {
  try {
    const { data, error } = await supabase
      .from('account_principals')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error

    // 객체 형태로 변환 { accountName: { principal, remaining, note } }
    const principals = {}
    data.forEach(item => {
      principals[item.account_name] = {
        principal: parseFloat(item.principal),
        remaining: parseFloat(item.remaining),
        note: item.note || ''
      }
    })

    return principals
  } catch (error) {
    console.error('Error fetching account principals:', error)
    throw error
  }
}

// 계좌 원금/예수금 저장 또는 업데이트
export const saveAccountPrincipal = async (accountName, principalData, userId = DEFAULT_USER_ID) => {
  try {
    const { data, error } = await supabase
      .from('account_principals')
      .upsert({
        user_id: userId,
        account_name: accountName,
        principal: principalData.principal || 0,
        remaining: principalData.remaining || 0,
        note: principalData.note || ''
      }, {
        onConflict: 'account_name'
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error saving account principal:', error)
    throw error
  }
}

/**
 * ==========================================
 * Goals 관련 함수
 * ==========================================
 */

// 모든 재무 목표 가져오기
export const getGoals = async (userId = DEFAULT_USER_ID) => {
  try {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data.map(item => ({
      id: item.id,
      title: item.title,
      targetAmount: parseFloat(item.target_amount),
      currentAmount: parseFloat(item.current_amount),
      deadline: item.deadline,
      category: item.category,
      description: item.description || '',
      completed: item.completed,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }))
  } catch (error) {
    console.error('Error fetching goals:', error)
    throw error
  }
}

// 재무 목표 추가
export const addGoal = async (goal, userId = DEFAULT_USER_ID) => {
  try {
    const { data, error } = await supabase
      .from('goals')
      .insert([{
        user_id: userId,
        title: goal.title,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount || 0,
        deadline: goal.deadline,
        category: goal.category || '저축',
        description: goal.description || '',
        completed: goal.completed || false
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding goal:', error)
    throw error
  }
}

// 재무 목표 업데이트
export const updateGoal = async (id, updates) => {
  try {
    const updateData = {}

    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.targetAmount !== undefined) updateData.target_amount = updates.targetAmount
    if (updates.currentAmount !== undefined) updateData.current_amount = updates.currentAmount
    if (updates.deadline !== undefined) updateData.deadline = updates.deadline
    if (updates.category !== undefined) updateData.category = updates.category
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.completed !== undefined) updateData.completed = updates.completed

    const { data, error } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating goal:', error)
    throw error
  }
}

// 재무 목표 삭제
export const deleteGoal = async (id) => {
  try {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting goal:', error)
    throw error
  }
}

/**
 * ==========================================
 * Investment Logs 관련 함수
 * ==========================================
 */

// 모든 투자 일지 가져오기
export const getInvestmentLogs = async (userId = DEFAULT_USER_ID) => {
  try {
    const { data, error } = await supabase
      .from('investment_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (error) throw error

    return data.map(item => ({
      id: item.id,
      date: item.date,
      title: item.title,
      type: item.type,
      amount: parseFloat(item.amount),
      asset: item.asset || '',
      note: item.note || '',
      tags: item.tags || [],
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }))
  } catch (error) {
    console.error('Error fetching investment logs:', error)
    throw error
  }
}

// 투자 일지 추가
export const addInvestmentLog = async (log, userId = DEFAULT_USER_ID) => {
  try {
    const { data, error } = await supabase
      .from('investment_logs')
      .insert([{
        user_id: userId,
        date: log.date,
        title: log.title,
        type: log.type,
        amount: log.amount || 0,
        asset: log.asset || '',
        note: log.note || '',
        tags: log.tags || []
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding investment log:', error)
    throw error
  }
}

// 투자 일지 업데이트
export const updateInvestmentLog = async (id, updates) => {
  try {
    const updateData = {}

    if (updates.date !== undefined) updateData.date = updates.date
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.type !== undefined) updateData.type = updates.type
    if (updates.amount !== undefined) updateData.amount = updates.amount
    if (updates.asset !== undefined) updateData.asset = updates.asset
    if (updates.note !== undefined) updateData.note = updates.note
    if (updates.tags !== undefined) updateData.tags = updates.tags

    const { data, error } = await supabase
      .from('investment_logs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating investment log:', error)
    throw error
  }
}

// 투자 일지 삭제
export const deleteInvestmentLog = async (id) => {
  try {
    const { error } = await supabase
      .from('investment_logs')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting investment log:', error)
    throw error
  }
}

/**
 * ==========================================
 * 마이그레이션 헬퍼 함수
 * ==========================================
 */

// localStorage에서 Supabase로 데이터 마이그레이션
export const migrateFromLocalStorage = async (userId = DEFAULT_USER_ID) => {
  try {
    console.log('🔄 Starting data migration from localStorage to Supabase...')

    // 1. Portfolio 자산 마이그레이션
    const portfolioAssets = localStorage.getItem('portfolio_assets')
    if (portfolioAssets) {
      const assets = JSON.parse(portfolioAssets)
      if (assets.length > 0) {
        console.log(`📦 Migrating ${assets.length} portfolio assets...`)
        await bulkAddPortfolios(assets, userId)
        console.log('✅ Portfolio assets migrated successfully')
      }
    }

    // 2. Account Principals 마이그레이션
    const accountPrincipals = localStorage.getItem('account_principals')
    if (accountPrincipals) {
      const principals = JSON.parse(accountPrincipals)
      const accountNames = Object.keys(principals)
      if (accountNames.length > 0) {
        console.log(`📦 Migrating ${accountNames.length} account principals...`)
        for (const accountName of accountNames) {
          await saveAccountPrincipal(accountName, principals[accountName], userId)
        }
        console.log('✅ Account principals migrated successfully')
      }
    }

    // 3. Goals 마이그레이션
    const goals = localStorage.getItem('goals')
    if (goals) {
      const goalsData = JSON.parse(goals)
      if (goalsData.length > 0) {
        console.log(`📦 Migrating ${goalsData.length} goals...`)
        for (const goal of goalsData) {
          await addGoal(goal, userId)
        }
        console.log('✅ Goals migrated successfully')
      }
    }

    // 4. Investment Logs 마이그레이션
    const logs = localStorage.getItem('investment_logs')
    if (logs) {
      const logsData = JSON.parse(logs)
      if (logsData.length > 0) {
        console.log(`📦 Migrating ${logsData.length} investment logs...`)
        for (const log of logsData) {
          await addInvestmentLog(log, userId)
        }
        console.log('✅ Investment logs migrated successfully')
      }
    }

    console.log('🎉 Migration completed successfully!')
    return { success: true, message: 'Data migration completed' }
  } catch (error) {
    console.error('❌ Migration failed:', error)
    return { success: false, error: error.message }
  }
}

// Supabase 연결 상태 확인
export const checkSupabaseConnection = async () => {
  if (!supabase) {
    return {
      connected: false,
      error: 'Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file'
    }
  }

  try {
    const { data, error } = await supabase
      .from('portfolios')
      .select('count')
      .limit(1)

    if (error) throw error
    return { connected: true, message: 'Supabase connection successful' }
  } catch (error) {
    console.error('Supabase connection failed:', error)
    return { connected: false, error: error.message }
  }
}

// Supabase 설정 여부 확인
export const isSupabaseConfigured = () => {
  return !!supabase
}

export default {
  // Portfolio
  getPortfolios,
  addPortfolio,
  updatePortfolio,
  deletePortfolio,
  bulkAddPortfolios,
  bulkDeletePortfolios,

  // Account Principals
  getAccountPrincipals,
  saveAccountPrincipal,

  // Goals
  getGoals,
  addGoal,
  updateGoal,
  deleteGoal,

  // Investment Logs
  getInvestmentLogs,
  addInvestmentLog,
  updateInvestmentLog,
  deleteInvestmentLog,

  // Utilities
  migrateFromLocalStorage,
  checkSupabaseConnection
}
