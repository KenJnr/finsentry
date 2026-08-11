// lib/services/category-service.ts

import { createClient } from '@supabase/supabase-js'

export interface CategoryRule {
  id: string
  name: string
  color: string
  keywords: string[]
  is_system: boolean
}

export interface CategoryMatch {
  category: string
  color: string
  matchedBy: string
  categoryId?: string
}

// Cache for categories to avoid frequent DB calls
let categoriesCache: CategoryRule[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Supabase client (for server-side)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// ============================================================
// FETCH CATEGORIES FROM SUPABASE
// ============================================================

export async function fetchCategories(userId?: string): Promise<CategoryRule[]> {
  // Check cache
  const now = Date.now()
  if (categoriesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return categoriesCache
  }

  try {
    let query = supabaseAdmin
      .from('categories')
      .select('*')
      .order('name')

    // If userId provided, get user's custom categories + system defaults
    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`)
    } else {
      // Only system categories
      query = query.is('user_id', null)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching categories:', error)
      throw error
    }

    categoriesCache = data || []
    cacheTimestamp = now

    console.log(`📊 Loaded ${categoriesCache.length} categories from database`)
    return categoriesCache
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    // Return empty array as fallback
    return []
  }
}

// ============================================================
// BUILD KEYWORD LOOKUP MAP
// ============================================================

function buildKeywordMap(categories: CategoryRule[]): Map<string, CategoryRule> {
  const map = new Map<string, CategoryRule>()
  
  for (const cat of categories) {
    for (const keyword of cat.keywords) {
      // Store the category rule for each keyword
      map.set(keyword.toLowerCase(), cat)
    }
  }
  
  return map
}

// ============================================================
// CATEGORIZE A TRANSACTION - ONLY REFERENCE
// ============================================================

export async function categorizeTransaction(
  transaction: { reference: string },
  userId?: string
): Promise<CategoryMatch> {
  
  const reference = (transaction.reference || '').toLowerCase().trim()

  console.log('\n🔎 CATEGORIZING TRANSACTION')
  console.log('  Reference:', reference || '(empty)')

  // Fetch categories from database
  const categories = await fetchCategories(userId)
  
  if (categories.length === 0) {
    console.warn('⚠️ No categories found in database')
    return {
      category: 'Miscellaneous',
      color: '#6B7280',
      matchedBy: 'no_match'
    }
  }

  // Build keyword map
  const keywordMap = buildKeywordMap(categories)

  // ==========================================================
  // STEP 1: Check REFERENCE against keywords
  // ==========================================================

  if (reference) {
    // Check exact match first
    if (keywordMap.has(reference)) {
      const cat = keywordMap.get(reference)!
      console.log(`  ✅ REFERENCE EXACT MATCH: "${reference}" → ${cat.name}`)
      return {
        category: cat.name,
        color: cat.color,
        matchedBy: `reference_exact: "${reference}"`,
        categoryId: cat.id
      }
    }

    // Then check partial match
    for (const [keyword, cat] of keywordMap) {
      if (reference.includes(keyword) && keyword.length > 2) {
        console.log(`  ✅ REFERENCE PARTIAL MATCH: "${keyword}" → ${cat.name}`)
        return {
          category: cat.name,
          color: cat.color,
          matchedBy: `reference_partial: "${keyword}"`,
          categoryId: cat.id
        }
      }
    }
  }

  // ==========================================================
  // STEP 2: NO MATCH → MISCELLANEOUS
  // ==========================================================

  console.log(`  📌 NO MATCH → Miscellaneous`)
  return {
    category: 'Miscellaneous',
    color: '#6B7280',
    matchedBy: 'no_match'
  }
}

// ============================================================
// BATCH CATEGORIZE TRANSACTIONS
// ============================================================

export async function categorizeTransactions(
  transactions: { reference: string }[],
  userId?: string
): Promise<Array<{ 
  category: string
  color: string
  matchedBy: string
  categoryId?: string
}>> {
  // Fetch categories once for all transactions
  const categories = await fetchCategories(userId)
  const keywordMap = buildKeywordMap(categories)

  return transactions.map(t => {
    const reference = (t.reference || '').toLowerCase().trim()

    if (reference) {
      // Exact match
      if (keywordMap.has(reference)) {
        const cat = keywordMap.get(reference)!
        return {
          category: cat.name,
          color: cat.color,
          matchedBy: `reference_exact: "${reference}"`,
          categoryId: cat.id
        }
      }

      // Partial match
      for (const [keyword, cat] of keywordMap) {
        if (reference.includes(keyword) && keyword.length > 2) {
          return {
            category: cat.name,
            color: cat.color,
            matchedBy: `reference_partial: "${keyword}"`,
            categoryId: cat.id
          }
        }
      }
    }

    // No match
    return {
      category: 'Miscellaneous',
      color: '#6B7280',
      matchedBy: 'no_match'
    }
  })
}

// ============================================================
// GET CATEGORY COLOR
// ============================================================

export async function getCategoryColor(categoryName: string, userId?: string): Promise<string> {
  const categories = await fetchCategories(userId)
  const found = categories.find(c => c.name === categoryName)
  return found?.color || '#6B7280'
}

// ============================================================
// GET ALL CATEGORIES
// ============================================================

export async function getAllCategories(userId?: string): Promise<string[]> {
  const categories = await fetchCategories(userId)
  return categories.map(c => c.name)
}

// ============================================================
// ADD NEW KEYWORDS
// ============================================================

export async function addKeywordsToCategory(
  categoryName: string,
  newKeywords: string[],
  userId: string
): Promise<boolean> {
  try {
    // First, get the current category
    const { data: category, error: fetchError } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('name', categoryName)
      .eq('user_id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching category:', fetchError)
      return false
    }

    let currentKeywords = category?.keywords || []
    const updatedKeywords = [...new Set([...currentKeywords, ...newKeywords])]

    // Update the category
    const { error: updateError } = await supabaseAdmin
      .from('categories')
      .update({ 
        keywords: updatedKeywords,
        updated_at: new Date().toISOString()
      })
      .eq('name', categoryName)
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error updating category:', updateError)
      return false
    }

    // Clear cache
    categoriesCache = null
    cacheTimestamp = 0

    return true
  } catch (error) {
    console.error('Error adding keywords:', error)
    return false
  }
}