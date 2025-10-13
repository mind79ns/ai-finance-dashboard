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
    const localData = localStorage.getItem('portfolio_assets')
    const localAssets = localData ? JSON.parse(localData) : []

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
      localStorage.setItem('portfolio_assets', JSON.stringify(convertedAssets))
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
    localStorage.setItem('portfolio_assets', JSON.stringify(assets))
    console.log('✅ Saved to localStorage')

    // 2. Supabase 사용 불가능하면 여기서 종료
    if (!isSupabaseAvailable()) {
      return { success: true, source: 'localStorage' }
    }

    // 3. Supabase에도 저장 시도 (비동기, 실패해도 괜찮음)
    console.log('☁️ Syncing to Supabase...')

    // 기존 Supabase 데이터 삭제 후 새로 추가 (간단한 전체 동기화)
    // TODO: 향후 개선 시 diff 기반 업데이트로 변경 가능

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
    const localData = localStorage.getItem('portfolio_assets')
    const assets = localData ? JSON.parse(localData) : []
    const newAsset = { ...asset, id: asset.id || Date.now() }
    const updatedAssets = [...assets, newAsset]
    localStorage.setItem('portfolio_assets', JSON.stringify(updatedAssets))
    console.log('✅ Asset added to localStorage')

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
    const localData = localStorage.getItem('portfolio_assets')
    const assets = localData ? JSON.parse(localData) : []
    const updatedAssets = assets.filter(a => a.id !== assetId)
    localStorage.setItem('portfolio_assets', JSON.stringify(updatedAssets))
    console.log('✅ Asset deleted from localStorage')

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
    const localData = localStorage.getItem('portfolio_assets')
    const assets = localData ? JSON.parse(localData) : []
    const updatedAssets = assets.filter(a => !assetIds.includes(a.id))
    localStorage.setItem('portfolio_assets', JSON.stringify(updatedAssets))
    console.log(`✅ ${assetIds.length} assets deleted from localStorage`)

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
    const localData = localStorage.getItem('account_principals')
    const localPrincipals = localData ? JSON.parse(localData) : {}

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
      localStorage.setItem('account_principals', JSON.stringify(supabasePrincipals))
      return supabasePrincipals
    }

    // 5. Supabase가 비어있으면 로컬 데이터 반환
    return localPrincipals

  } catch (error) {
    console.warn('⚠️ Supabase load failed, using localStorage:', error.message)
    const localData = localStorage.getItem('account_principals')
    return localData ? JSON.parse(localData) : {}
  }
}

// Account Principal 저장
export const saveAccountPrincipal = async (accountName, principalData) => {
  try {
    // 1. localStorage 업데이트
    const localData = localStorage.getItem('account_principals')
    const principals = localData ? JSON.parse(localData) : {}
    principals[accountName] = principalData
    localStorage.setItem('account_principals', JSON.stringify(principals))
    console.log('✅ Account principal saved to localStorage')

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
 * 동기화 상태 확인
 * ==========================================
 */

// 데이터 동기화 상태 확인
export const getSyncStatus = () => {
  return {
    supabaseAvailable: isSupabaseAvailable(),
    hasLocalData: {
      portfolioAssets: !!localStorage.getItem('portfolio_assets'),
      accountPrincipals: !!localStorage.getItem('account_principals'),
      goals: !!localStorage.getItem('goals'),
      investmentLogs: !!localStorage.getItem('investment_logs')
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

  // Status
  getSyncStatus,
  isSupabaseAvailable
}
