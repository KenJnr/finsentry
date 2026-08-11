// app/api/re-categorize/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCategoryLookups, fastCategorize, invalidateCategoryCache } from '@/lib/services/category-service'

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

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('🔄 Starting re-categorization for user:', user.email)

    // Get all uncategorized transactions
    const { data: transactions, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .in('category', ['Uncategorized', 'Other', ''])
    
    if (txError) throw txError

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No uncategorized transactions found',
        updated: 0,
        total: 0,
      })
    }

    console.log(`📊 Found ${transactions.length} uncategorized transactions`)

    // Load category lookups (with caching)
    const lookups = await getCategoryLookups(user.id)
    console.log(`📚 Loaded ${lookups.categories.length} categories, ${lookups.merchantRuleMap.size} merchant rules, ${lookups.keywordRuleMap.size} keyword rules`)

    let updated = 0
    let learned = 0

    // Process in batches to avoid timeout
    const batchSize = 50
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize)
      
      for (const tx of batch) {
        // Build transaction object for categorization
        const txObj = {
          description: tx.description || '',
          reference: tx.reference || '',
          to_name: tx.to_name || '',
          from_name: tx.from_name || '',
          type: tx.type || 'debit',
          transType: tx.trans_type || '',
        }
        
        const result = fastCategorize(txObj, lookups)
        
        if (result.category !== tx.category) {
          const { error: updateError } = await supabaseAdmin
            .from('transactions')
            .update({ category: result.category })
            .eq('id', tx.id)
          
          if (!updateError) {
            updated++
            if (result.isLearned) learned++
          }
        }
      }
      
      // Log progress
      console.log(`📈 Processed ${Math.min(i + batchSize, transactions.length)}/${transactions.length} transactions`)
    }

    // Invalidate cache since categories might have changed
    invalidateCategoryCache(user.id)

    return NextResponse.json({
      success: true,
      updated,
      learned,
      total: transactions.length,
      message: `Re-categorized ${updated} transactions (${learned} learned)`,
    })

  } catch (error: any) {
    console.error('Re-categorize error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to re-categorize transactions' 
    }, { status: 500 })
  }
}