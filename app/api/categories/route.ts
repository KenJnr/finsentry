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
// GET: Fetch user's categories
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

    // Get user's categories + system defaults
    const { data: categories, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('name')

    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Categories GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    // Check if category already exists for this user
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('name', name)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 409 })
    }

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

    return NextResponse.json({ category })
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