import { createClient } from "@supabase/supabase-js";
import { allowedAdminRoles } from "@/lib/adminAuth";

export async function verifyAdminRequest(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
  const authorization = request.headers.get("authorization") || "";

  if (!supabaseUrl || !supabaseAnonKey || !authorization.startsWith("Bearer ")) {
    return { authorized: false, error: "Missing admin authentication." };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false }
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;

  if (userError || !user) {
    return { authorized: false, error: "Invalid admin session." };
  }

  const { data, error } = await supabase
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .eq("is_active", true)
    .in("role", allowedAdminRoles)
    .maybeSingle();

  if (error || !data) {
    return { authorized: false, error: "Admin access required." };
  }

  return { authorized: true, user };
}
