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

const ensureSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }
}

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return fallback
  }
  return Number(value)
}

const normalizePortfolioForSupabase = (asset, userId = DEFAULT_USER_ID) => ({
  id: Math.floor(toNumber(asset?.id ?? Date.now())),
  user_id: userId,
  symbol: asset?.symbol,
  name: asset?.name,
  type: asset?.type,
  quantity: toNumber(asset?.quantity),
  avg_price: toNumber(asset?.avgPrice),
  current_price: toNumber(asset?.currentPrice ?? asset?.avgPrice ?? 0),
  total_value: toNumber(asset?.totalValue ?? (asset?.quantity * asset?.avgPrice)),
  profit: toNumber(asset?.profit),
  profit_percent: toNumber(asset?.profitPercent),
  currency: asset?.currency || 'USD',
  account: asset?.account || '기본계좌',
  category: asset?.category || '해외주식'
})

const normalizeGoalForSupabase = (goal, userId = DEFAULT_USER_ID) => {
  const status = goal?.status || (goal?.completed ? 'completed' : 'active')

  return {
    id: Math.floor(toNumber(goal?.id ?? Date.now())),
    user_id: userId,
    title: goal?.title || goal?.name || '',
    name: goal?.name || goal?.title || '',
    target_amount: toNumber(goal?.targetAmount),
    current_amount: toNumber(goal?.currentAmount),
    deadline: goal?.targetDate || goal?.deadline || null,
    category: goal?.category || '장기목표',
    description: goal?.description || '',
    completed: goal?.completed ?? (status === 'completed'),
    status,
    linked_to_portfolio: !!goal?.linkedToPortfolio,
    link_type: goal?.linkType || 'total',
    currency: goal?.currency || 'USD',
    metadata: goal?.metadata && typeof goal.metadata === 'object'
      ? goal.metadata
      : {
          linkedToPortfolio: !!goal?.linkedToPortfolio,
          linkType: goal?.linkType || 'total',
          currency: goal?.currency || 'USD',
          status
        }
  }
}

const normalizeLogForSupabase = (log, userId = DEFAULT_USER_ID) => ({
  id: Math.floor(toNumber(log?.id ?? Date.now())),
  user_id: userId,
  date: log?.date,
  title: log?.title || '',
  type: log?.type || '',
  amount: toNumber(log?.total ?? log?.amount),
  quantity: toNumber(log?.quantity),
  price: toNumber(log?.price),
  total: toNumber(log?.total ?? log?.amount),
  asset: log?.asset || '',
  account: log?.account || '기본계좌',
  note: log?.note || '',
  tags: Array.isArray(log?.tags) ? log.tags : [],
  metadata: log?.metadata && typeof log.metadata === 'object' ? log.metadata : {}
})

const mapGoalFromSupabase = (item) => {
  const metadata = item?.metadata && typeof item.metadata === 'object' ? item.metadata : {}
  const status = item?.status || metadata.status || (item?.completed ? 'completed' : 'active')

  return {
    id: item?.id,
    name: item?.name || item?.title || '',
    title: item?.title || item?.name || '',
    targetAmount: toNumber(item?.target_amount),
    currentAmount: toNumber(item?.current_amount),
    targetDate: item?.deadline,
    category: item?.category || '장기목표',
    description: item?.description || metadata.description || '',
    completed: item?.completed ?? (status === 'completed'),
    status,
    linkedToPortfolio: item?.linked_to_portfolio ?? metadata.linkedToPortfolio ?? false,
    linkType: item?.link_type || metadata.linkType || 'total',
    currency: item?.currency || metadata.currency || 'USD',
    metadata,
    createdAt: item?.created_at,
    updatedAt: item?.updated_at
  }
}

const mapLogFromSupabase = (item) => {
  const metadata = item?.metadata && typeof item.metadata === 'object' ? item.metadata : {}

  const quantity = item?.quantity ?? metadata.quantity
  const price = item?.price ?? metadata.price
  const total = item?.total ?? item?.amount ?? metadata.total

  return {
    id: item?.id,
    date: item?.date,
    type: item?.type,
    asset: item?.asset,
    quantity: toNumber(quantity),
    price: toNumber(price),
    total: toNumber(total),
    note: item?.note || metadata.note || '',
    tags: Array.isArray(item?.tags) ? item.tags : [],
    account: item?.account || metadata.account || '기본계좌',
    metadata,
    createdAt: item?.created_at,
    updatedAt: item?.updated_at
  }
}

/**
 * ==========================================
 * Generic User Settings 헬퍼
 * ==========================================
 */

export const getUserSetting = async (key, userId = DEFAULT_USER_ID) => {
  ensureSupabase()

  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('value')
      .eq('user_id', userId)
      .eq('key', key)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data ? data.value : null
  } catch (error) {
    console.error(`Error fetching user setting (${key}):`, error)
    throw error
  }
}

export const setUserSetting = async (key, value, userId = DEFAULT_USER_ID) => {
  ensureSupabase()

  try {
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        key,
        value,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error(`Error saving user setting (${key}):`, error)
    throw error
  }
}

/**
 * ==========================================
 * Portfolio 관련 함수
 * ==========================================
 */

// 모든 포트폴리오 자산 가져오기
export const getPortfolios = async (userId = DEFAULT_USER_ID) => {
  ensureSupabase()

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
      quantity: toNumber(item.quantity),
      avgPrice: toNumber(item.avg_price),
      currentPrice: toNumber(item.current_price),
      totalValue: toNumber(item.total_value),
      profit: toNumber(item.profit),
      profitPercent: toNumber(item.profit_percent),
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
  ensureSupabase()

  try {
    const payload = normalizePortfolioForSupabase(asset, userId)

    const { data, error } = await supabase
      .from('portfolios')
      .upsert(payload, { onConflict: 'id' })
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
  ensureSupabase()

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
  ensureSupabase()

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
  ensureSupabase()

  try {
    const insertData = assets.map(asset => normalizePortfolioForSupabase(asset, userId))

    const { data, error } = await supabase
      .from('portfolios')
      .upsert(insertData, { onConflict: 'id' })
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
  ensureSupabase()

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

export const syncPortfolios = async (assets = [], userId = DEFAULT_USER_ID) => {
  ensureSupabase()

  try {
    const payload = assets.map(asset => normalizePortfolioForSupabase(asset, userId))

    if (payload.length === 0) {
      const { error: deleteAllError } = await supabase
        .from('portfolios')
        .delete()
        .eq('user_id', userId)

      if (deleteAllError) throw deleteAllError
      return { success: true }
    }

    const { error: upsertError } = await supabase
      .from('portfolios')
      .upsert(payload, { onConflict: 'id' })

    if (upsertError) throw upsertError

    const { data: existingRows, error: fetchError } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', userId)

    if (fetchError) throw fetchError

    const incomingIds = new Set(payload.map(item => String(item.id)))
    const staleIds = (existingRows || [])
      .map(row => String(row.id))
      .filter(id => !incomingIds.has(id))

    if (staleIds.length > 0) {
      const deleteIds = staleIds.map(id => Number(id))
      const { error: deleteError } = await supabase
        .from('portfolios')
        .delete()
        .in('id', deleteIds)

      if (deleteError) throw deleteError
    }

    return { success: true }
  } catch (error) {
    console.error('Error syncing portfolios:', error)
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
  ensureSupabase()

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
  ensureSupabase()

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
  ensureSupabase()

  try {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data.map(mapGoalFromSupabase)
  } catch (error) {
    console.error('Error fetching goals:', error)
    throw error
  }
}

// 재무 목표 추가
export const addGoal = async (goal, userId = DEFAULT_USER_ID) => {
  ensureSupabase()

  try {
    const payload = normalizeGoalForSupabase(goal, userId)

    const { data, error } = await supabase
      .from('goals')
      .upsert(payload, { onConflict: 'id' })
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
  ensureSupabase()

  try {
    const updateData = {}

    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.targetAmount !== undefined) updateData.target_amount = toNumber(updates.targetAmount)
    if (updates.currentAmount !== undefined) updateData.current_amount = toNumber(updates.currentAmount)
    if (updates.deadline !== undefined) updateData.deadline = updates.deadline
    if (updates.category !== undefined) updateData.category = updates.category
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.completed !== undefined) updateData.completed = updates.completed
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.linkedToPortfolio !== undefined) updateData.linked_to_portfolio = updates.linkedToPortfolio
    if (updates.linkType !== undefined) updateData.link_type = updates.linkType
    if (updates.currency !== undefined) updateData.currency = updates.currency
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata

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
  ensureSupabase()

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

export const syncGoals = async (goals = [], userId = DEFAULT_USER_ID) => {
  ensureSupabase()

  try {
    const payload = goals.map(goal => normalizeGoalForSupabase(goal, userId))

    if (payload.length === 0) {
      const { error: deleteAllError } = await supabase
        .from('goals')
        .delete()
        .eq('user_id', userId)

      if (deleteAllError) throw deleteAllError
      return { success: true }
    }

    const { error: upsertError } = await supabase
      .from('goals')
      .upsert(payload, { onConflict: 'id' })

    if (upsertError) throw upsertError

    const { data: existingRows, error: fetchError } = await supabase
      .from('goals')
      .select('id')
      .eq('user_id', userId)

    if (fetchError) throw fetchError

    const incomingIds = new Set(payload.map(item => String(item.id)))
    const staleIds = (existingRows || [])
      .map(row => String(row.id))
      .filter(id => !incomingIds.has(id))

    if (staleIds.length > 0) {
      const deleteIds = staleIds.map(id => Number(id))
      const { error: deleteError } = await supabase
        .from('goals')
        .delete()
        .in('id', deleteIds)

      if (deleteError) throw deleteError
    }

    return { success: true }
  } catch (error) {
    console.error('Error syncing goals:', error)
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
  ensureSupabase()

  try {
    const { data, error } = await supabase
      .from('investment_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (error) throw error

    return data.map(mapLogFromSupabase)
  } catch (error) {
    console.error('Error fetching investment logs:', error)
    throw error
  }
}

// 투자 일지 추가
export const addInvestmentLog = async (log, userId = DEFAULT_USER_ID) => {
  ensureSupabase()

  try {
    const payload = normalizeLogForSupabase(log, userId)

    const { data, error } = await supabase
      .from('investment_logs')
      .upsert(payload, { onConflict: 'id' })
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
  ensureSupabase()

  try {
    const updateData = {}

    if (updates.date !== undefined) updateData.date = updates.date
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.type !== undefined) updateData.type = updates.type
    if (updates.amount !== undefined) updateData.amount = toNumber(updates.amount)
    if (updates.quantity !== undefined) updateData.quantity = toNumber(updates.quantity)
    if (updates.price !== undefined) updateData.price = toNumber(updates.price)
    if (updates.total !== undefined) updateData.total = toNumber(updates.total)
    if (updates.asset !== undefined) updateData.asset = updates.asset
    if (updates.account !== undefined) updateData.account = updates.account
    if (updates.note !== undefined) updateData.note = updates.note
    if (updates.tags !== undefined) updateData.tags = updates.tags
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata

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
  ensureSupabase()

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

export const syncInvestmentLogs = async (logs = [], userId = DEFAULT_USER_ID) => {
  ensureSupabase()

  try {
    const payload = logs.map(log => normalizeLogForSupabase(log, userId))

    if (payload.length === 0) {
      const { error: deleteAllError } = await supabase
        .from('investment_logs')
        .delete()
        .eq('user_id', userId)

      if (deleteAllError) throw deleteAllError
      return { success: true }
    }

    const { error: upsertError } = await supabase
      .from('investment_logs')
      .upsert(payload, { onConflict: 'id' })

    if (upsertError) throw upsertError

    const { data: existingRows, error: fetchError } = await supabase
      .from('investment_logs')
      .select('id')
      .eq('user_id', userId)

    if (fetchError) throw fetchError

    const incomingIds = new Set(payload.map(item => String(item.id)))
    const staleIds = (existingRows || [])
      .map(row => String(row.id))
      .filter(id => !incomingIds.has(id))

    if (staleIds.length > 0) {
      const deleteIds = staleIds.map(id => Number(id))
      const { error: deleteError } = await supabase
        .from('investment_logs')
        .delete()
        .in('id', deleteIds)

      if (deleteError) throw deleteError
    }

    return { success: true }
  } catch (error) {
    console.error('Error syncing investment logs:', error)
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
  ensureSupabase()

  try {
    console.log('🔄 Starting data migration from localStorage to Supabase...')

    // 1. Portfolio 자산 마이그레이션
    const portfolioAssets = localStorage.getItem('portfolio_assets')
    if (portfolioAssets) {
      const assets = JSON.parse(portfolioAssets)
      if (assets.length > 0) {
        console.log(`📦 Migrating ${assets.length} portfolio assets...`)
        await syncPortfolios(assets, userId)
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
    const goals = localStorage.getItem('investment_goals') || localStorage.getItem('goals')
    if (goals) {
      const goalsData = JSON.parse(goals)
      if (goalsData.length > 0) {
        console.log(`📦 Migrating ${goalsData.length} goals...`)
        await syncGoals(goalsData, userId)
        console.log('✅ Goals migrated successfully')
      }
    }

    // 4. Investment Logs 마이그레이션
    const logs = localStorage.getItem('investment_logs')
    if (logs) {
      const logsData = JSON.parse(logs)
      if (logsData.length > 0) {
        console.log(`📦 Migrating ${logsData.length} investment logs...`)
        await syncInvestmentLogs(logsData, userId)
        console.log('✅ Investment logs migrated successfully')
      }
    }

    // 5. Asset status / account settings 마이그레이션
    const migrateSetting = async (storageKey) => {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      try {
        const parsed = JSON.parse(raw)
        await setUserSetting(storageKey, parsed, userId)
        console.log(`✅ Setting "${storageKey}" migrated successfully`)
      } catch (error) {
        console.warn(`⚠️ Failed to migrate setting "${storageKey}":`, error)
      }
    }

    await migrateSetting('asset_status_data')
    await migrateSetting('asset_account_data')
    await migrateSetting('asset_income_categories')
    await migrateSetting('asset_expense_categories')
    await migrateSetting('asset_account_types')

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
export const getSupabaseStatus = () => {
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
  syncPortfolios,

  // Account Principals
  getAccountPrincipals,
  saveAccountPrincipal,

  // Goals
  getGoals,
  addGoal,
  updateGoal,
  deleteGoal,
  syncGoals,

  // Investment Logs
  getInvestmentLogs,
  addInvestmentLog,
  updateInvestmentLog,
  deleteInvestmentLog,
  syncInvestmentLogs,

  // Utilities
  migrateFromLocalStorage,
  checkSupabaseConnection,
  getSupabaseStatus,
  getUserSetting,
  setUserSetting
}
