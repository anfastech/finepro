// OAuth handlers using Supabase instead of Supabase
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/config'

// Create Supabase admin client
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function signUpWithGithub() {
  const origin = (await headers()).get('origin')
  console.log("[OAuth] Initiating GitHub sign up/in...");

  const { data, error } = await supabaseAdmin.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${origin}/auth/callback`,
    }
  })

  if (data?.url) {
    console.log(`[OAuth] Redirecting to GitHub: ${data.url}`);
  }

  if (error) {
    console.error("[OAuth] GitHub OAuth error:", error);
    throw new Error(`GitHub OAuth error: ${error.message}`)
  }

  // The redirect will be handled by Supabase
}

export async function signUpWithGoogle() {
  const origin = (await headers()).get('origin')
  console.log("[OAuth] Initiating Google sign up...");

  const { data, error } = await supabaseAdmin.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    }
  })

  if (data?.url) {
    console.log(`[OAuth] Redirecting to Google: ${data.url}`);
  }

  if (error) {
    console.error("[OAuth] Google OAuth error:", error);
    throw new Error(`Google OAuth error: ${error.message}`)
  }

  // The redirect will be handled by Supabase
}

export async function signInWithGoogle() {
  const origin = (await headers()).get('origin')
  console.log("[OAuth] Initiating Google sign in...");

  const { data, error } = await supabaseAdmin.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    }
  })

  if (data?.url) {
    console.log(`[OAuth] Redirecting to Google: ${data.url}`);
  }

  if (error) {
    console.error("[OAuth] Google OAuth error:", error);
    throw new Error(`Google OAuth error: ${error.message}`)
  }

  // The redirect will be handled by Supabase
}

export async function signInWithGithub() {
  const origin = (await headers()).get('origin')
  console.log("[OAuth] Initiating GitHub sign in...");

  const { data, error } = await supabaseAdmin.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${origin}/auth/callback`,
    }
  })

  if (data?.url) {
    console.log(`[OAuth] Redirecting to GitHub: ${data.url}`);
  }

  if (error) {
    console.error("[OAuth] GitHub OAuth error:", error);
    throw new Error(`GitHub OAuth error: ${error.message}`)
  }

  // The redirect will be handled by Supabase
}