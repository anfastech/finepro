import { createSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        console.log("[JWT Bridge] GET request received");
        const supabase = await createSupabaseClient()
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
            console.error("[JWT Bridge] Supabase session error:", error);
            return NextResponse.json({ error: 'Supabase session error' }, { status: 401 })
        }

        if (!session) {
            console.warn("[JWT Bridge] No active session found");
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        console.log(`[JWT Bridge] Session found for user: ${session.user.email} (${session.user.id})`);

        return NextResponse.json({
            jwt: session.access_token,
            user_id: session.user.id
        })
    } catch (error) {
        console.error('[JWT Bridge] Unexpected error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
