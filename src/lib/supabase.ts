import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

const hasValidSupabaseConfig =
  supabaseUrl.startsWith("https://") &&
  !supabaseUrl.includes("yourproject.supabase.co") &&
  supabaseAnonKey.length > 20;

export const supabase = hasValidSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
