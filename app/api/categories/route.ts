// app/api/categories/route.ts

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

// ============================================================
// GET: Fetch system categories + user's custom categories
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      console.error('Authentication error:', userError)
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    console.log('👤 Loading categories for:', user.id)

    // ============================================================
    // 1. FETCH ALL SYSTEM CATEGORIES
    //    System category = user_id IS NULL
    // ============================================================
    const {
      data: systemCategories,
      error: systemError,
    } = await supabaseAdmin
      .from('categories')
      .select('*')
      .is('user_id', null)
      .order('name', { ascending: true })

    if (systemError) {
      console.error('❌ System categories error:', systemError)

      return NextResponse.json(
        {
          error: 'Failed to fetch system categories',
          details: systemError.message,
        },
        { status: 500 }
      )
    }

    // ============================================================
    // 2. FETCH USER'S CUSTOM CATEGORIES
    // ============================================================
    const {
      data: userCategories,
      error: userCategoriesError,
    } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true })

    if (userCategoriesError) {
      console.error(
        '❌ User categories error:',
        userCategoriesError
      )

      return NextResponse.json(
        {
          error: 'Failed to fetch user categories',
          details: userCategoriesError.message,
        },
        { status: 500 }
      )
    }

    console.log(
      `📊 System categories found: ${systemCategories?.length ?? 0}`
    )

    console.log(
      `👤 User categories found: ${userCategories?.length ?? 0}`
    )

    console.log(
      '🏷️ System category names:',
      systemCategories?.map(c => c.name)
    )

    console.log(
      '🏷️ User category names:',
      userCategories?.map(c => c.name)
    )

    // ============================================================
    // 3. MERGE CATEGORIES
    //
    // System categories are included for everyone.
    //
    // If the user created a category with the same name as a
    // system category, the user's version overrides it.
    // ============================================================
    const categoryMap = new Map<string, any>()

    // Add system categories first
    for (const category of systemCategories ?? []) {
      categoryMap.set(category.name.toLowerCase(), {
        ...category,
        is_system: true,
      })
    }

    // Add user's categories second
    // User categories override system categories with same name
    for (const category of userCategories ?? []) {
      categoryMap.set(category.name.toLowerCase(), {
        ...category,
        is_system: false,
      })
    }

    const mergedCategories = Array.from(categoryMap.values()).sort(
      (a, b) => a.name.localeCompare(b.name)
    )

    console.log(
      `✅ Returning ${mergedCategories.length} categories`
    )

    console.log(
      '📋 Final categories:',
      mergedCategories.map(c => ({
        name: c.name,
        is_system: c.is_system,
        user_id: c.user_id,
      }))
    )

    return NextResponse.json({
      categories: mergedCategories,

      // Useful for debugging / frontend
      counts: {
        system: systemCategories?.length ?? 0,
        user: userCategories?.length ?? 0,
        total: mergedCategories.length,
      },
    })
  } catch (error) {
    console.error('❌ Categories GET error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}

// ============================================================
// POST: Create a new category
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

    const body = await req.json()
    const { name, color, keywords } = body

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    // Check if user already has a custom category with this name
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('name', name)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'You already have a category with this name' }, { status: 409 })
    }

    // Check if this is a system category (user can override it)
    const { data: systemCategory } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('name', name)
      .is('user_id', null)
      .maybeSingle()

    // If it's a system category, we'll create a user-specific override
    const { data: category, error } = await supabaseAdmin
      .from('categories')
      .insert({
        user_id: user.id,
        name,
        color: color || '#6B7280',
        keywords: keywords || [],
        is_system: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating category:', error)
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
    }

    return NextResponse.json({ category, is_override: !!systemCategory })
  } catch (error) {
    console.error('Categories POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================
// PUT: Update an existing category
// ============================================================
export async function PUT(req: NextRequest) {
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

    const body = await req.json()
    const { id, name, color, keywords } = body

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    // First, check if this category belongs to the user
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('categories')
      .select('id, user_id, is_system')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Prevent updating system categories
    if (existing.is_system && existing.user_id === null) {
      return NextResponse.json({ 
        error: 'Cannot modify system categories. Create a custom category instead.' 
      }, { status: 403 })
    }

    // Build update object
    const updates: any = { updated_at: new Date().toISOString() }
    if (name) updates.name = name
    if (color) updates.color = color
    if (keywords) updates.keywords = keywords

    const { data: category, error } = await supabaseAdmin
      .from('categories')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating category:', error)
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Categories PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================
// DELETE: Delete a category
// ============================================================
export async function DELETE(req: NextRequest) {
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

    // Get category ID from query params
    const url = new URL(req.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    // Check if category exists and belongs to user
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('categories')
      .select('id, user_id, is_system')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Prevent deleting system categories
    if (existing.is_system && existing.user_id === null) {
      return NextResponse.json({ 
        error: 'Cannot delete system categories' 
      }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting category:', error)
      return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Categories DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}