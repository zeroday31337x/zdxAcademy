import { createClient } from "@supabase/supabase-js";

let client: any = null;

export function supabaseBrowser(): any {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  return client;
}
