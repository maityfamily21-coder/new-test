import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // 1. Define protected routes
  const isStudentProtected = path.startsWith('/student') || path.startsWith('/api/student')
  const isAccountsProtected = path.startsWith('/accounts-personnel') || path.startsWith('/api/accounts-personnel')
  
  // 2. Exclude paths that don't require authentication
  if (path.includes('/login') || path.includes('/forgot-password')) {
    return NextResponse.next()
  }

  // 3. Student routes check
  if (isStudentProtected) {
    const session = request.cookies.get('session')?.value || 
                    request.cookies.get('token')?.value || 
                    request.cookies.get('student_token')?.value

    if (!session) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ success: false, message: 'Auth Required' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/student/login', request.url))
    }
  }

  // 4. Accounts personnel routes check
  if (isAccountsProtected) {
    const accountsToken = request.cookies.get('accounts_personnel_token')?.value

    if (!accountsToken) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ success: false, message: 'Auth Required' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/accounts-personnel/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/student/:path*',
    '/api/student/:path*',
    '/accounts-personnel/:path*',
    '/api/accounts-personnel/:path*',
  ],
}
