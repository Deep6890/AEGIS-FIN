import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isMissing = !SUPABASE_URL || SUPABASE_URL === "https://your-project.supabase.co"
               || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === "your_anon_key_here";

if (isMissing) {
  console.warn("⚠️  Supabase env vars not set. Edit frontend/.env with your project URL and anon key.");
}

// Use placeholder values so createClient doesn't throw — all queries will fail gracefully
export const supabase = createClient(
  isMissing ? "https://placeholder.supabase.co" : SUPABASE_URL,
  isMissing ? "placeholder-key"                 : SUPABASE_ANON_KEY
);
