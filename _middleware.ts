// middleware.ts

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  /*
   * IMPORTANT:
   * Use getUser() rather than relying only on getSession()
   * when protecting server-side routes.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  /*
   * Routes that require authentication
   */
  const protectedRoutes = [
    '/dashboard',
    '/upload',
    '/categories',
    '/budget',
    '/insights',
    '/settings',
  ]

  /*
   * Routes that are specifically for authentication.
   * These MUST remain accessible when logged out.
   */
  const authRoutes = [
    '/auth/login',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/auth/resend-verification',
    '/auth/callback',
  ]

  const isProtectedRoute = protectedRoutes.some(
    (route) =>
      path === route ||
      path.startsWith(`${route}/`)
  )

  const isAuthRoute = authRoutes.some(
    (route) =>
      path === route ||
      path.startsWith(`${route}/`)
  )

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔐 AUTH MIDDLEWARE')
  console.log('Path:', path)
  console.log('User:', user?.email ?? 'NOT AUTHENTICATED')
  console.log('Auth route:', isAuthRoute)
  console.log('Protected route:', isProtectedRoute)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  /*
   * 1. NOT LOGGED IN + PROTECTED PAGE
   *
   * Send them to login.
   */
  if (!user && isProtectedRoute) {
    const loginUrl = new URL('/auth/login', request.url)

    /*
     * Optional:
     * remember where they wanted to go.
     */
    loginUrl.searchParams.set('redirectTo', path)

    return NextResponse.redirect(loginUrl)
  }

  /*
   * 2. LOGGED IN + AUTH PAGE
   *
   * Don't allow authenticated users to go back to
   * login/signup/forgot password.
   */
  if (user && isAuthRoute) {
    return NextResponse.redirect(
      new URL('/dashboard', request.url)
    )
  }

  /*
   * 3. Everything else is allowed.
   */
  return response
}

export const config = {
  matcher: [
    /*
     * Run middleware on application pages,
     * but not static files or API routes.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|api).*)',
  ],
}