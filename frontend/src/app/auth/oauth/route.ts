import { createSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { type Provider } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const provider = searchParams.get('provider')

  console.log(`[OAuth Route] Received request for provider: ${provider}`);

  if (!provider || !['google', 'github'].includes(provider)) {
    console.warn(`[OAuth Route] Invalid provider: ${provider}`);
    return NextResponse.redirect('/signin?error=invalid_provider')
  }

  try {
    const supabase = await createSupabaseClient()
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`;

    console.log(`[OAuth Route] Initiating Supabase OAuth with redirect to: ${redirectTo}`);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as Provider,
      options: {
        redirectTo: redirectTo,
      },
    })

    if (error) {
      console.error('[OAuth Route] Supabase OAuth error:', error)
      return NextResponse.redirect('/signin?error=oauth_failed')
    }

    if (data?.url) {
      console.log(`[OAuth Route] Redirecting user to: ${data.url}`);
      return NextResponse.redirect(data.url)
    }

    console.warn('[OAuth Route] No URL returned from signInWithOAuth');
    return NextResponse.redirect('/signin?error=oauth_failed')
  } catch (err) {
    console.error('[OAuth Route] Unexpected error:', err);
    return NextResponse.redirect('/signin?error=internal_error')
  }
}