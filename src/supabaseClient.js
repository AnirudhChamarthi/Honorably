// === SUPABASE CLIENT CONFIGURATION ===
// Configuration file for initializing the Supabase client
import { createClient } from '@supabase/supabase-js'

// Supabase project URL and anonymous key - ONLY from environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// Create supabase client or dummy client based on environment variables
let supabase

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables: REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY must be set')
  // Create a dummy client that will show appropriate error messages
  supabase = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: { message: 'Supabase not configured' } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ error: { message: 'Supabase not configured. Please check environment variables.' } }),
      signUp: async () => ({ error: { message: 'Supabase not configured. Please check environment variables.' } }),
      signOut: async () => ({ error: { message: 'Supabase not configured. Please check environment variables.' } })
    }
  }
} else {
  // Create the real Supabase client only if environment variables are present
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

// Export the supabase client
export { supabase }
