import { createSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createSupabaseClient()
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Return the session tokens
        // We provide both the Supabase token and a structured response for the bridge
        return NextResponse.json({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            jwt: session.access_token, // Compatibility with api.ts expecting 'jwt'
            expires_at: session.expires_at,
            user: session.user
        })
    } catch (error) {
        console.error('Session bridge error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
