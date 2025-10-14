/**
 * ==========================================
 * Data Synchronization Utility
 * ==========================================
 *
 * localStorage와 Supabase 간의 안전한 데이터 동기화
 *
 * 전략:
 * 1. localStorage는 항상 우선순위 (Primary)
 * 2. Supabase는 보조/백업 (Secondary)
 * 3. Supabase 실패 시 localStorage만 사용 (Graceful Fallback)
 */

import supabaseService from '../services/supabaseService'

const STORAGE_KEYS = {
  portfolios: 'portfolio_assets',
  accountPrincipals: 'account_principals',
  goals: 'investment_goals',
  legacyGoals: 'goals',
  investmentLogs: 'investment_logs'
}

const readLocalJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch (error) {
    console.warn(`⚠️ Failed to parse localStorage key "${key}":`, error.message)
    return fallback
  }
}

const writeLocalJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`⚠️ Failed to write localStorage key "${key}":`, error.message)
  }
}

const cloneDeep = (value) => {
  if (value === null || value === undefined) {
    return value
  }

  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return value
  }
}

const broadcastUpdate = (eventName, detail) => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return
  }

  try {
    const event = new CustomEvent(eventName, { detail })
    window.dispatchEvent(event)
  } catch (error) {
    console.warn(`⚠️ Failed to dispatch "${eventName}" event:`, error.message)
  }
}

// Supabase 사용 가능 여부 확인
const isSupabaseAvailable = () => {
  try {
    return supabaseService.getSupabaseStatus && supabaseService.getSupabaseStatus()
  } catch {
    return false
  }
}

/**
 * ==========================================
 * Portfolio Assets 동기화
 * ==========================================
 */

// Portfolio 데이터 로드 (Supabase → localStorage)
export const loadPortfolioAssets = async () => {
  try {
    // 1. localStorage에서 먼저 로드 (기존 방식)
    const localAssets = readLocalJSON(STORAGE_KEYS.portfolios, [])

    // 2. Supabase 사용 불가능하면 로컬 데이터 반환
    if (!isSupabaseAvailable()) {
      console.log('📦 Loading from localStorage only (Supabase not configured)')
      return localAssets
    }

    // 3. Supabase에서 데이터 조회 시도
    console.log('☁️ Loading from Supabase...')
    const supabaseAssets = await supabaseService.getPortfolios()

    // 4. Supabase 데이터가 있으면 사용하고 localStorage에도 백업
    if (supabaseAssets && supabaseAssets.length > 0) {
      console.log(`✅ Loaded ${supabaseAssets.length} assets from Supabase`)

      // Supabase 데이터를 localStorage 형식으로 변환
      const convertedAssets = supabaseAssets.map(asset => ({
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        type: asset.type,
        quantity: asset.quantity,
        avgPrice: asset.avgPrice,
        currentPrice: asset.currentPrice,
        totalValue: asset.totalValue,
        profit: asset.profit,
        profitPercent: asset.profitPercent,
        currency: asset.currency,
        account: asset.account,
        category: asset.category
      }))

      // localStorage에도 백업
      writeLocalJSON(STORAGE_KEYS.portfolios, convertedAssets)
      return convertedAssets
    }

    // 5. Supabase가 비어있으면 로컬 데이터 반환
    console.log('📦 Supabase empty, using localStorage data')
    return localAssets

  } catch (error) {
    // 오류 발생 시 localStorage 데이터로 fallback
    console.warn('⚠️ Supabase load failed, using localStorage:', error.message)
    const localData = localStorage.getItem('portfolio_assets')
    return localData ? JSON.parse(localData) : []
  }
}

// Portfolio 데이터 저장 (localStorage + Supabase)
export const savePortfolioAssets = async (assets) => {
  try {
    // 1. 항상 localStorage에 먼저 저장 (기존 방식 유지)
    writeLocalJSON(STORAGE_KEYS.portfolios, assets)
    console.log('✅ Saved to localStorage')
    broadcastUpdate('portfolio_assets_updated', { assets })

    // 2. Supabase 사용 불가능하면 여기서 종료
    if (!isSupabaseAvailable()) {
      return { success: true, source: 'localStorage' }
    }

    // 3. Supabase에도 저장 시도 (비동기, 실패해도 괜찮음)
    console.log('☁️ Syncing to Supabase...')

    await supabaseService.syncPortfolios(assets)

    return { success: true, source: 'localStorage+Supabase' }

  } catch (error) {
    console.warn('⚠️ Supabase sync failed (localStorage saved successfully):', error.message)
    return { success: true, source: 'localStorage', supabaseError: error.message }
  }
}

// 단일 Asset 추가 (localStorage + Supabase)
export const addPortfolioAsset = async (asset) => {
  try {
    // 1. localStorage 업데이트
    const assets = readLocalJSON(STORAGE_KEYS.portfolios, [])
    const newAsset = { ...asset, id: asset.id || Date.now() }
    const updatedAssets = [...assets, newAsset]
    writeLocalJSON(STORAGE_KEYS.portfolios, updatedAssets)
    console.log('✅ Asset added to localStorage')
    broadcastUpdate('portfolio_assets_updated', { assets: updatedAssets })

    // 2. Supabase에도 추가 시도
    if (isSupabaseAvailable()) {
      console.log('☁️ Adding to Supabase...')
      await supabaseService.addPortfolio(newAsset)
      console.log('✅ Asset added to Supabase')
    }

    return { success: true, asset: newAsset }

  } catch (error) {
    console.warn('⚠️ Supabase add failed (localStorage saved):', error.message)
    return { success: true, asset, supabaseError: error.message }
  }
}

// 단일 Asset 삭제 (localStorage + Supabase)
export const deletePortfolioAsset = async (assetId) => {
  try {
    // 1. localStorage 업데이트
    const assets = readLocalJSON(STORAGE_KEYS.portfolios, [])
    const updatedAssets = assets.filter(a => a.id !== assetId)
    writeLocalJSON(STORAGE_KEYS.portfolios, updatedAssets)
    console.log('✅ Asset deleted from localStorage')
    broadcastUpdate('portfolio_assets_updated', { assets: updatedAssets })

    // 2. Supabase에서도 삭제 시도
    if (isSupabaseAvailable()) {
      console.log('☁️ Deleting from Supabase...')
      await supabaseService.deletePortfolio(assetId)
      console.log('✅ Asset deleted from Supabase')
    }

    return { success: true }

  } catch (error) {
    console.warn('⚠️ Supabase delete failed (localStorage updated):', error.message)
    return { success: true, supabaseError: error.message }
  }
}

// 여러 Assets 일괄 삭제 (localStorage + Supabase)
export const bulkDeletePortfolioAssets = async (assetIds) => {
  try {
    // 1. localStorage 업데이트
    const assets = readLocalJSON(STORAGE_KEYS.portfolios, [])
    const updatedAssets = assets.filter(a => !assetIds.includes(a.id))
    writeLocalJSON(STORAGE_KEYS.portfolios, updatedAssets)
    console.log(`✅ ${assetIds.length} assets deleted from localStorage`)
    broadcastUpdate('portfolio_assets_updated', { assets: updatedAssets })

    // 2. Supabase에서도 삭제 시도
    if (isSupabaseAvailable()) {
      console.log('☁️ Bulk deleting from Supabase...')
      await supabaseService.bulkDeletePortfolios(assetIds)
      console.log(`✅ ${assetIds.length} assets deleted from Supabase`)
    }

    return { success: true, count: assetIds.length }

  } catch (error) {
    console.warn('⚠️ Supabase bulk delete failed (localStorage updated):', error.message)
    return { success: true, count: assetIds.length, supabaseError: error.message }
  }
}

/**
 * ==========================================
 * Account Principals 동기화
 * ==========================================
 */

// Account Principals 로드
export const loadAccountPrincipals = async () => {
  try {
    // 1. localStorage에서 먼저 로드
    const localPrincipals = readLocalJSON(STORAGE_KEYS.accountPrincipals, {})

    // 2. Supabase 사용 불가능하면 로컬 데이터 반환
    if (!isSupabaseAvailable()) {
      console.log('📦 Loading account principals from localStorage only')
      return localPrincipals
    }

    // 3. Supabase에서 데이터 조회 시도
    console.log('☁️ Loading account principals from Supabase...')
    const supabasePrincipals = await supabaseService.getAccountPrincipals()

    // 4. Supabase 데이터가 있으면 사용
    if (supabasePrincipals && Object.keys(supabasePrincipals).length > 0) {
      console.log('✅ Loaded account principals from Supabase')
      writeLocalJSON(STORAGE_KEYS.accountPrincipals, supabasePrincipals)
      return supabasePrincipals
    }

    // 5. Supabase가 비어있으면 로컬 데이터 반환
    return localPrincipals

  } catch (error) {
    console.warn('⚠️ Supabase load failed, using localStorage:', error.message)
    return readLocalJSON(STORAGE_KEYS.accountPrincipals, {})
  }
}

// Account Principal 저장
export const saveAccountPrincipal = async (accountName, principalData) => {
  try {
    // 1. localStorage 업데이트
    const principals = readLocalJSON(STORAGE_KEYS.accountPrincipals, {})
    principals[accountName] = principalData
    writeLocalJSON(STORAGE_KEYS.accountPrincipals, principals)
    console.log('✅ Account principal saved to localStorage')
    broadcastUpdate('account_principals_updated', { accountName, principalData })

    // 2. Supabase에도 저장 시도
    if (isSupabaseAvailable()) {
      console.log('☁️ Saving to Supabase...')
      await supabaseService.saveAccountPrincipal(accountName, principalData)
      console.log('✅ Account principal saved to Supabase')
    }

    return { success: true }

  } catch (error) {
    console.warn('⚠️ Supabase save failed (localStorage saved):', error.message)
    return { success: true, supabaseError: error.message }
  }
}

/**
 * ==========================================
 * Goals 동기화
 * ==========================================
 */

export const loadGoals = async () => {
  try {
    let localGoals = readLocalJSON(STORAGE_KEYS.goals, null)

    if (!Array.isArray(localGoals)) {
      const legacyGoals = readLocalJSON(STORAGE_KEYS.legacyGoals, [])
      if (legacyGoals.length > 0) {
        console.log(`🔁 Migrating legacy goals (${legacyGoals.length}) to new storage key`)
        writeLocalJSON(STORAGE_KEYS.goals, legacyGoals)
        localStorage.removeItem(STORAGE_KEYS.legacyGoals)
        localGoals = legacyGoals
      } else {
        localGoals = []
      }
    }

    if (!isSupabaseAvailable()) {
      return localGoals
    }

    console.log('☁️ Loading goals from Supabase...')
    const supabaseGoals = await supabaseService.getGoals()

    if (Array.isArray(supabaseGoals) && supabaseGoals.length > 0) {
      writeLocalJSON(STORAGE_KEYS.goals, supabaseGoals)
      localStorage.removeItem(STORAGE_KEYS.legacyGoals)
      return supabaseGoals
    }

    return localGoals
  } catch (error) {
    console.warn('⚠️ Supabase load failed, using local goals:', error.message)
    return readLocalJSON(STORAGE_KEYS.goals, [])
  }
}

export const saveGoals = async (goals) => {
  try {
    writeLocalJSON(STORAGE_KEYS.goals, goals)
    localStorage.removeItem(STORAGE_KEYS.legacyGoals)
    console.log('✅ Goals saved to localStorage')

    if (!isSupabaseAvailable()) {
      return { success: true, source: 'localStorage' }
    }

    console.log('☁️ Syncing goals to Supabase...')
    await supabaseService.syncGoals(goals)
    return { success: true, source: 'localStorage+Supabase' }
  } catch (error) {
    console.warn('⚠️ Supabase goal sync failed (local copy saved):', error.message)
    return { success: true, source: 'localStorage', supabaseError: error.message }
  }
}

/**
 * ==========================================
 * Investment Logs 동기화
 * ==========================================
 */

export const loadInvestmentLogs = async () => {
  try {
    const localLogs = readLocalJSON(STORAGE_KEYS.investmentLogs, [])

    if (!isSupabaseAvailable()) {
      return localLogs
    }

    console.log('☁️ Loading investment logs from Supabase...')
    const supabaseLogs = await supabaseService.getInvestmentLogs()

    if (Array.isArray(supabaseLogs) && supabaseLogs.length > 0) {
      writeLocalJSON(STORAGE_KEYS.investmentLogs, supabaseLogs)
      return supabaseLogs
    }

    return localLogs
  } catch (error) {
    console.warn('⚠️ Supabase log load failed, using local data:', error.message)
    return readLocalJSON(STORAGE_KEYS.investmentLogs, [])
  }
}

export const saveInvestmentLogs = async (logs) => {
  try {
    writeLocalJSON(STORAGE_KEYS.investmentLogs, logs)
    console.log('✅ Investment logs saved to localStorage')

    if (!isSupabaseAvailable()) {
      return { success: true, source: 'localStorage' }
    }

    console.log('☁️ Syncing investment logs to Supabase...')
    await supabaseService.syncInvestmentLogs(logs)
    return { success: true, source: 'localStorage+Supabase' }
  } catch (error) {
    console.warn('⚠️ Supabase log sync failed (local copy saved):', error.message)
    return { success: true, source: 'localStorage', supabaseError: error.message }
  }
}

/**
 * ==========================================
 * Generic User Setting 동기화
 * ==========================================
 */

export const loadUserSetting = async (storageKey, fallback) => {
  const localValue = readLocalJSON(storageKey, cloneDeep(fallback))

  if (!isSupabaseAvailable()) {
    return cloneDeep(localValue)
  }

  try {
    const remoteValue = await supabaseService.getUserSetting(storageKey)
    if (remoteValue !== null && remoteValue !== undefined) {
      writeLocalJSON(storageKey, remoteValue)
      return cloneDeep(remoteValue)
    }
    return cloneDeep(localValue)
  } catch (error) {
    console.warn(`⚠️ Supabase setting load failed (${storageKey}), using local data:`, error.message)
    return cloneDeep(localValue)
  }
}

export const saveUserSetting = async (storageKey, value) => {
  writeLocalJSON(storageKey, value)

  if (!isSupabaseAvailable()) {
    return { success: true, source: 'localStorage' }
  }

  try {
    await supabaseService.setUserSetting(storageKey, value)
    return { success: true, source: 'localStorage+Supabase' }
  } catch (error) {
    console.warn(`⚠️ Supabase setting save failed (${storageKey}) (local copy saved):`, error.message)
    return { success: true, source: 'localStorage', supabaseError: error.message }
  }
}

/**
 * ==========================================
 * 동기화 상태 확인
 * ==========================================
 */

// 데이터 동기화 상태 확인
export const getSyncStatus = () => {
  return {
    supabaseAvailable: isSupabaseAvailable(),
    hasLocalData: {
      portfolioAssets: !!localStorage.getItem(STORAGE_KEYS.portfolios),
      accountPrincipals: !!localStorage.getItem(STORAGE_KEYS.accountPrincipals),
      goals: !!localStorage.getItem(STORAGE_KEYS.goals) || !!localStorage.getItem(STORAGE_KEYS.legacyGoals),
      investmentLogs: !!localStorage.getItem(STORAGE_KEYS.investmentLogs)
    }
  }
}

export default {
  // Portfolio
  loadPortfolioAssets,
  savePortfolioAssets,
  addPortfolioAsset,
  deletePortfolioAsset,
  bulkDeletePortfolioAssets,

  // Account Principals
  loadAccountPrincipals,
  saveAccountPrincipal,

  // Goals
  loadGoals,
  saveGoals,

  // Investment Logs
  loadInvestmentLogs,
  saveInvestmentLogs,

  // Generic Settings
  loadUserSetting,
  saveUserSetting,

  // Status
  getSyncStatus,
  isSupabaseAvailable
}
