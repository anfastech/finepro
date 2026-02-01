// Auth server routes - disabled during Supabase migration
// OAuth and authentication are now handled by Supabase client-side

export async function GET() {
  return new Response('Auth server routes migrated to Supabase', { status: 200 })
}

export async function POST() {
  return new Response('Auth server routes migrated to Supabase', { status: 200 })
}