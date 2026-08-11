// app/api/upload/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parsePDF, ParsedTransaction } from '@/lib/parsers/pdf-parser'
import { categorizeTransactions } from '@/lib/services/category-service'

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
    // Get the authorization header
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No Bearer token in request')
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    if (!token || token.length < 10) {
      console.error('Invalid token format')
      return NextResponse.json({ error: 'Invalid token format' }, { status: 401 })
    }

    console.log('Token received, verifying...')

    // Verify the user with the token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError) {
      console.error('Token verification error:', userError.message)
      return NextResponse.json({ 
        error: `Invalid token: ${userError.message}` 
      }, { status: 401 })
    }

    if (!user) {
      console.error('No user found for token')
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    console.log('✅ User authenticated:', user.email)

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Check file type
    const fileType = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'csv'].includes(fileType || '')) {
      return NextResponse.json({ error: 'Only PDF and CSV files are supported' }, { status: 400 })
    }

    // Read file content
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Parse based on file type
    let transactions: ParsedTransaction[] = []
    try {
      if (fileType === 'pdf') {
        transactions = await parsePDF(buffer)
      } else if (fileType === 'csv') {
        // You'll need to implement CSV parsing
        // transactions = await parseCSV(buffer)
        console.warn('CSV parsing not yet implemented')
      }
    } catch (parseError) {
      console.error('Parse error:', parseError)
      return NextResponse.json({ 
        error: 'Failed to parse file. Please ensure it\'s a valid statement.' 
      }, { status: 400 })
    }

    if (!transactions || transactions.length === 0) {
      console.error('No transactions parsed from file')
      return NextResponse.json({ 
        error: 'No transactions found in file. Please check the format.' 
      }, { status: 400 })
    }

    console.log(`✅ Parsed ${transactions.length} transactions`)

    // ============================================
    // STEP 1: Upload file to Supabase Storage
    // ============================================
    const fileName = `${user.id}/${Date.now()}_${file.name}`
    const fileBuffer = await file.arrayBuffer()
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('statements')
      .upload(fileName, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
    } else {
      console.log('✅ File uploaded to storage:', uploadData?.path)
    }

    const fileUrl = uploadData?.path 
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/statements/${uploadData.path}`
      : ''

    // ============================================
    // STEP 2: Categorize all transactions (ONLY Reference)
    // ============================================
    
    // Prepare transactions for categorization
    const transactionsForCategorization = transactions.map(t => ({
      reference: t.reference || ''
    }))

    // Categorize all transactions at once
    const categorizedResults = await categorizeTransactions(
      transactionsForCategorization,
      user.id
    )

    const categorizedTransactions = transactions.map((t, index) => ({
      ...t,
      category: categorizedResults[index].category,
      matchedBy: categorizedResults[index].matchedBy,
      categoryId: categorizedResults[index].categoryId,
    }))

    // Track category counts
    const categoryCounts: Record<string, number> = {}
    for (const result of categorizedResults) {
      categoryCounts[result.category] = (categoryCounts[result.category] || 0) + 1
    }

    // ============================================
    // STEP 3: Log category distribution
    // ============================================
    console.log('\n' + '='.repeat(80))
    console.log('📊 CATEGORY DISTRIBUTION')
    console.log('='.repeat(80))
    const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])
    sortedCategories.forEach(([category, count]) => {
      const percentage = ((count / transactions.length) * 100).toFixed(1)
      console.log(`  ${category}: ${count} (${percentage}%)`)
    })
    console.log('='.repeat(80) + '\n')

    // ============================================
    // STEP 4: Generate CSV with Category column
    // ============================================
    
    // Define CSV headers
    const headers = [
      'Date',
      'Description',
      'Amount',
      'Type (credit/debit)',
      'Balance After',
      'Reference',
      'From Name',
      'To Name',
      'Transaction Type (TRANSFER/DEBIT/etc)',
      'Category',
      'Matched By'
    ]

    // Build CSV rows with category and match info
    const rows = categorizedTransactions.map((t: any) => [
      t.date || '',
      t.description || '',
      t.amount || 0,
      t.type || '',
      t.balanceAfter || 0,
      t.reference || '',
      t.fromName || '',
      t.toName || '',
      t.transactionType || '',
      t.category || '',
      t.matchedBy || '',
    ])

    // Create CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => {
          // Handle cells with commas or quotes
          if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
            return `"${cell.replace(/"/g, '""')}"`
          }
          return cell
        }).join(',')
      )
    ].join('\n')

    // ============================================
    // STEP 5: Log CSV to console
    // ============================================
    console.log('\n' + '='.repeat(80))
    console.log('📊 TRANSACTION CSV EXPORT (WITH CATEGORIES)')
    console.log('='.repeat(80))
    console.log(`Total Transactions: ${transactions.length}`)
    console.log('\n' + csvContent)
    console.log('\n' + '='.repeat(80))
    console.log('✅ CSV export complete! Copy the above CSV to use in Excel/Google Sheets')
    console.log('='.repeat(80) + '\n')

    // ============================================
    // STEP 6: Save to uploads table
    // ============================================
    try {
      await supabaseAdmin
        .from('uploads')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_url: fileUrl,
          status: 'completed',
          transaction_count: transactions.length,
          completed_at: new Date().toISOString(),
        })
    } catch (uploadError) {
      console.error('Error saving to uploads:', uploadError)
    }

    // ============================================
    // STEP 7: Save transactions to database
    // ============================================
    try {
      // Prepare transactions for insertion
      const transactionsToInsert = categorizedTransactions.map((t: any) => ({
        user_id: user.id,
        date: t.date,
        description: t.description || '',
        amount: t.amount,
        type: t.type || 'debit',
        balance_after: t.balanceAfter || 0,
        reference: t.reference || '',
        from_name: t.fromName || '',
        to_name: t.toName || '',
        category: t.category || 'Uncategorized',
        matched_by: t.matchedBy || 'no_match',
        statement_name: file.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      console.log(`📝 Preparing to insert ${transactionsToInsert.length} transactions...`)

      // Insert in batches to avoid hitting limits
      const batchSize = 100
      let insertedCount = 0
      
      for (let i = 0; i < transactionsToInsert.length; i += batchSize) {
        const batch = transactionsToInsert.slice(i, i + batchSize)
        const { error: insertError } = await supabaseAdmin
          .from('transactions')
          .insert(batch)

        if (insertError) {
          console.error('Error inserting transactions batch:', insertError)
          // Continue with next batch instead of failing completely
        } else {
          insertedCount += batch.length
          console.log(`✅ Inserted ${batch.length} transactions (batch ${Math.floor(i / batchSize) + 1})`)
        }
      }

      console.log(`✅ Total ${insertedCount} transactions saved to database`)

      // Log first few transactions for verification
      if (transactionsToInsert.length > 0) {
        console.log('\n📋 Sample transactions saved:')
        transactionsToInsert.slice(0, 3).forEach((t: any, idx: number) => {
          console.log(`  ${idx + 1}. ${t.date} | ${t.description} | ${t.category} | ${t.matched_by}`)
        })
      }

    } catch (dbError) {
      console.error('❌ Error saving transactions to database:', dbError)
      // Continue - don't fail the whole upload if DB insert fails
      // The CSV and file upload still succeeded
    }

    return NextResponse.json({
      success: true,
      count: transactions.length,
      statement_name: file.name,
      file_url: fileUrl,
      csv: csvContent,
      transactions: categorizedTransactions,
      category_distribution: categoryCounts,
    })

  } catch (error: unknown) {
    console.error('Upload error:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return NextResponse.json({ 
      error: errorMessage
    }, { status: 500 })
  }
}