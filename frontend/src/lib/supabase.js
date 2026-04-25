import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Missing Supabase environment variables!");
  console.error("Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
  console.error("For Vercel: Add them in Dashboard → Settings → Environment Variables");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
