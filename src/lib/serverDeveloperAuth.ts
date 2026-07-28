import { createClient, type User } from "@supabase/supabase-js";
import { createUserSupabaseClient } from "@/lib/serverSupabase";

type PortalRole = "owner" | "admin" | "reviewer" | "developer";

export type PortalAuthResult =
  | { authorized: true; user: User; role: PortalRole }
  | { authorized: false; error: string };

export async function verifyDeveloperRequest(request: Request): Promise<PortalAuthResult> {
  const identity = await verifyBearerUser(request);
  if (!identity) return { authorized: false, error: "A valid developer session is required." };
  const service = createUserSupabaseClient(request.headers.get("authorization") || "");
  const [{ data: admin }, { data: developer }] = await Promise.all([
    service.from("admins").select("role,is_active").eq("id", identity.id).eq("is_active", true).maybeSingle(),
    service.from("developer_profiles").select("account_status").eq("id", identity.id).maybeSingle()
  ]);
  if (admin?.role === "owner" || admin?.role === "admin" || admin?.role === "reviewer") {
    return { authorized: true, user: identity, role: admin.role };
  }
  if (!developer || developer.account_status === "active" || developer.account_status === "pending") {
    return { authorized: true, user: identity, role: "developer" };
  }
  return { authorized: false, error: "Developer access is not active." };
}

export async function verifyReviewerRequest(request: Request): Promise<PortalAuthResult> {
  const identity = await verifyBearerUser(request);
  if (!identity) return { authorized: false, error: "A valid reviewer session is required." };
  const service = createUserSupabaseClient(request.headers.get("authorization") || "");
  const { data } = await service.from("admins").select("role,is_active").eq("id", identity.id).eq("is_active", true).maybeSingle();
  if (data && ["owner", "admin", "reviewer"].includes(data.role)) {
    return { authorized: true, user: identity, role: data.role as PortalRole };
  }
  return { authorized: false, error: "Reviewer access is required." };
}

async function verifyBearerUser(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
  const authorization = request.headers.get("authorization") || "";
  if (!supabaseUrl || !supabaseAnonKey || !authorization.startsWith("Bearer ")) return null;
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
}

