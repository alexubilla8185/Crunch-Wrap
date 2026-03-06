import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_DATABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      'Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_DATABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set. Supabase features will be disabled.'
    );
    // Return a dummy client to prevent crashes
    return createBrowserClient('https://placeholder.supabase.co', 'placeholder');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
