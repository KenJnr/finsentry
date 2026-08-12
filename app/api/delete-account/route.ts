// app/api/delete-account/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key for admin operations
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

export async function DELETE(req: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify the user with the token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = user.id
    console.log('🗑️ Starting account deletion for user:', userId)

    // 1. Delete transactions
    console.log('📊 Deleting transactions...')
    const { error: txError } = await supabaseAdmin
      .from('transactions')
      .delete()
      .eq('user_id', userId)

    if (txError) {
      console.error('Error deleting transactions:', txError)
    } else {
      console.log('✅ Transactions deleted')
    }

    // 2. Delete budgets
    console.log('💰 Deleting budgets...')
    const { error: budgetError } = await supabaseAdmin
      .from('budgets')
      .delete()
      .eq('user_id', userId)

    if (budgetError) {
      console.error('Error deleting budgets:', budgetError)
    } else {
      console.log('✅ Budgets deleted')
    }

    // 3. Delete budget notifications
    console.log('🔔 Deleting budget notifications...')
    const { error: notifError } = await supabaseAdmin
      .from('budget_notifications')
      .delete()
      .eq('user_id', userId)

    if (notifError) {
      console.error('Error deleting budget notifications:', notifError)
    } else {
      console.log('✅ Budget notifications deleted')
    }

    // 4. Delete category rules
    console.log('📋 Deleting category rules...')
    const { error: rulesError } = await supabaseAdmin
      .from('category_rules')
      .delete()
      .eq('user_id', userId)

    if (rulesError) {
      console.error('Error deleting category rules:', rulesError)
    } else {
      console.log('✅ Category rules deleted')
    }

    // 5. Delete custom categories
    console.log('🏷️ Deleting custom categories...')
    const { error: catError } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('user_id', userId)

    if (catError) {
      console.error('Error deleting categories:', catError)
    } else {
      console.log('✅ Custom categories deleted')
    }

    // 6. Delete uploads
    console.log('📁 Deleting uploads...')
    const { error: uploadError } = await supabaseAdmin
      .from('uploads')
      .delete()
      .eq('user_id', userId)

    if (uploadError) {
      console.error('Error deleting uploads:', uploadError)
    } else {
      console.log('✅ Uploads deleted')
    }

  

// 7. Delete files from storage bucket
console.log('🗂️ Deleting files from storage...')
try {
  const folderPath = userId
  
  // First, list all files in the folder
  const { data: files, error: listError } = await supabaseAdmin
    .storage
    .from('statements')
    .list(folderPath)

  if (listError) {
    console.error('Error listing files:', listError)
  } else if (files && files.length > 0) {
    // Delete all files in the folder
    const filePaths = files.map((file: any) => `${folderPath}/${file.name}`)
    const { error: deleteFilesError } = await supabaseAdmin
      .storage
      .from('statements')
      .remove(filePaths)

    if (deleteFilesError) {
      console.error('Error deleting files:', deleteFilesError)
    } else {
      console.log(`✅ ${filePaths.length} files deleted from storage`)
    }
    
    // Note: Supabase Storage doesn't support deleting empty folders
    // The folder will remain but will be empty
  } else {
    console.log('📭 No files found in storage folder')
  }
} catch (storageError) {
  console.error('Error with storage operations:', storageError)
}

    // 8. Delete user from auth
    console.log('👤 Deleting user account...')
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteUserError) {
      console.error('Error deleting user:', deleteUserError)
      return NextResponse.json(
        { error: 'Failed to delete user account: ' + deleteUserError.message },
        { status: 500 }
      )
    }

    console.log('✅ User account deleted successfully')

    return NextResponse.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    })

  } catch (error: any) {
    console.error('❌ Error during account deletion:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete account' },
      { status: 500 }
    )
  }
}