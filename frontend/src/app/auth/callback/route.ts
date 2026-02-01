import { NextRequest, NextResponse } from 'next/server'

console.log("[Auth Callback Handler] Module loaded");

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  console.log(`[Auth Callback] Received request at ${request.url}`);

  if (!code) {
    console.error('[Auth Callback] No code provided in query params');
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }

  try {
    const { createSupabaseClient } = await import('@/lib/supabase-server')
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    console.log(`[Auth Callback] Total cookies: ${allCookies.length}`);
    console.log(`[Auth Callback] Cookie names: ${allCookies.map((c: any) => c.name).join(', ')}`);

    console.log('[Auth Callback] Exchanging code for session...');
    const supabase = await createSupabaseClient()

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[Auth Callback] Supabase session exchange error:', error)
      return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }

    console.log(`[Auth Callback] Session obtained for user: ${data.session?.user?.email} (${data.session?.user?.id})`);

    // Notify backend and get FastAPI tokens (for backend API access)
    try {
      // NEXT_PUBLIC_API_URL should be the base URL, e.g., http://localhost:8000/api/v1
      // The endpoint is /auth/exchange
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      const exchangeUrl = `${apiUrl}/auth/exchange`

      console.log(`[Auth Callback] Notifying backend at: ${exchangeUrl}`);

      const backendResponse = await fetch(exchangeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabase_token: data.session.access_token })
      })

      let accessToken: string | undefined
      let refreshToken: string | undefined

      if (backendResponse.ok) {
        const tokens = await backendResponse.json()
        accessToken = tokens.access_token
        refreshToken = tokens.refresh_token

        // Handle backend-driven redirection
        if (tokens.redirect_url) {
          console.log(`[Auth Callback] Backend requested redirect to: ${tokens.redirect_url}`);
          // Use the backend provided URL
          const response = NextResponse.redirect(`${origin}${tokens.redirect_url}`)
          // Set FastAPI tokens as HTTP-only cookies for backend API (if we got them)
          if (accessToken && refreshToken) {
            console.log('[Auth Callback] Setting FastAPI token cookies');
            response.cookies.set('access_token', accessToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 // 1 day
            })
            response.cookies.set('refresh_token', refreshToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 7 // 7 days
            })
          }
          return response;
        }

        console.log('[Auth Callback] ✅ Backend notified, FastAPI tokens received');
      } else {
        const errorText = await backendResponse.text();
        console.error(`[Auth Callback] ❌ Backend auth/exchange failed (${backendResponse.status}):`, errorText);
      }

      // Default fallback if no specific redirect instruction or error
      console.log('[Auth Callback] Redirecting to home...');
      const response = NextResponse.redirect(`${origin}/?auth=success`)

      // Set FastAPI tokens as HTTP-only cookies for backend API (if we got them)
      if (accessToken && refreshToken) {
        console.log('[Auth Callback] Setting FastAPI token cookies');
        response.cookies.set('access_token', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 // 1 day
        })
        response.cookies.set('refresh_token', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 // 7 days
        })
      }

      return response

    } catch (error) {
      console.error('[Auth Callback] Unexpected error notifying backend:', error)
      return NextResponse.redirect(`${origin}/?auth=success`)
    }

  } catch (error) {
    console.error('[Auth Callback] Fatal error in callback route:', error)
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }
}
