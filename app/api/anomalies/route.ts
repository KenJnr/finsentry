// app/api/anomalies/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

interface CategoryData {
  total: number
  count: number
}

interface MonthlyCategoryData {
  [category: string]: CategoryData
}

interface MonthlyData {
  [month: string]: MonthlyCategoryData
}

// ============================================================
// GET: Fetch anomalies for the user
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get anomalies from database
    const { data: anomalies, error } = await supabaseAdmin
      .from('category_anomalies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching anomalies:', error)
      return NextResponse.json({ error: 'Failed to fetch anomalies' }, { status: 500 })
    }

    return NextResponse.json({ anomalies })
  } catch (error) {
    console.error('Anomalies GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================
// POST: Detect and create anomalies
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 1. Get all transactions for the user
    const { data: transactions, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('category, amount, date')
      .eq('user_id', user.id)
      .eq('type', 'debit')
      .order('date', { ascending: true })

    if (txError) {
      console.error('Error fetching transactions:', txError)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ 
        anomalies: [], 
        message: 'No transactions found to analyze' 
      })
    }

    // 2. Group transactions by month and category
    const monthlyData: MonthlyData = {}
    
    transactions.forEach((t: any) => {
      const date = new Date(t.date)
      const monthKey = date.toISOString().slice(0, 7) // YYYY-MM
      const category = t.category || 'Uncategorized'
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {}
      }
      
      if (!monthlyData[monthKey][category]) {
        monthlyData[monthKey][category] = { total: 0, count: 0 }
      }
      
      monthlyData[monthKey][category].total += t.amount
      monthlyData[monthKey][category].count += 1
    })

    // 3. Get month keys sorted
    const monthKeys = Object.keys(monthlyData).sort()
    
    if (monthKeys.length < 2) {
      return NextResponse.json({ 
        anomalies: [], 
        message: 'Need at least 2 months of data to detect anomalies' 
      })
    }

    // 4. Delete existing anomalies for this user
    await supabaseAdmin
      .from('category_anomalies')
      .delete()
      .eq('user_id', user.id)

    // 5. Detect anomalies by comparing consecutive months
    const detectedAnomalies = []
    const severityColors = {
      low: '#F59E0B',
      medium: '#F97316',
      high: '#EF4444'
    }

    for (let i = 1; i < monthKeys.length; i++) {
      const currentMonth = monthKeys[i]
      const previousMonth = monthKeys[i - 1]
      
      const currentData = monthlyData[currentMonth]
      const previousData = monthlyData[previousMonth]

      // Get all categories from both months
      const allCategories = new Set([
        ...Object.keys(currentData),
        ...Object.keys(previousData)
      ])

      for (const category of allCategories) {
        // Skip if category is 'Miscellaneous' (optional)
        if (category === 'Miscellaneous') continue

        const current = currentData[category] || { total: 0, count: 0 }
        const previous = previousData[category] || { total: 0, count: 0 }

        // Skip if there's no spending in either month
        if (current.total === 0 && previous.total === 0) continue
        // Skip if previous month had no spending (can't calculate percentage)
        if (previous.total === 0) continue

        // Calculate changes
        const percentageChange = ((current.total - previous.total) / previous.total) * 100
        const absoluteChange = current.total - previous.total

        // Only detect anomalies for increases over 30%
        if (percentageChange < 30 || absoluteChange < 0) continue

        // Determine severity
        let severity: 'low' | 'medium' | 'high' = 'low'
        let message = ''

        if (percentageChange > 200 || absoluteChange > 500) {
          severity = 'high'
          message = `🚨 Critical: ${category} spending increased by ${percentageChange.toFixed(0)}% (GH₵${absoluteChange.toFixed(2)})`
        } else if (percentageChange > 100 || absoluteChange > 300) {
          severity = 'medium'
          message = `⚠️ Significant: ${category} spending increased by ${percentageChange.toFixed(0)}% (GH₵${absoluteChange.toFixed(2)})`
        } else if (percentageChange > 50 || absoluteChange > 150) {
          severity = 'low'
          message = `ℹ️ Notice: ${category} spending increased by ${percentageChange.toFixed(0)}% (GH₵${absoluteChange.toFixed(2)})`
        } else {
          continue // Skip if below thresholds
        }

        // Add more detail to message
        const currentMonthDisplay = new Date(currentMonth + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        const previousMonthDisplay = new Date(previousMonth + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

        const fullMessage = `${message}\n${currentMonthDisplay}: GH₵${current.total.toFixed(2)} (${current.count} txns) | ${previousMonthDisplay}: GH₵${previous.total.toFixed(2)} (${previous.count} txns)`

        detectedAnomalies.push({
          user_id: user.id,
          category,
          current_month: new Date(currentMonth + '-01').toISOString(),
          previous_month: new Date(previousMonth + '-01').toISOString(),
          current_amount: current.total,
          previous_amount: previous.total,
          current_count: current.count,
          previous_count: previous.count,
          percentage_change: percentageChange,
          absolute_change: absoluteChange,
          severity,
          message: fullMessage,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    }

    // 6. Insert anomalies into database
    let insertedAnomalies = []
    if (detectedAnomalies.length > 0) {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('category_anomalies')
        .insert(detectedAnomalies)
        .select()

      if (insertError) {
        console.error('Error inserting anomalies:', insertError)
        return NextResponse.json({ error: 'Failed to save anomalies' }, { status: 500 })
      }

      insertedAnomalies = inserted || []
    }

    return NextResponse.json({
      anomalies: insertedAnomalies,
      count: insertedAnomalies.length,
      message: insertedAnomalies.length > 0 
        ? `Found ${insertedAnomalies.length} anomalies` 
        : 'No anomalies detected in your spending patterns'
    })

  } catch (error: any) {
    console.error('Anomalies detection error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}