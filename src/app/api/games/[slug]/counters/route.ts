import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  try {
    const { type } = await request.json();
    if (type !== "view" && type !== "play") {
      return NextResponse.json({ ok: true });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ ok: true });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });
    const column = type === "view" ? "view_count" : "play_count";
    const { data, error: readError } = await admin
      .from("games")
      .select(column)
      .eq("slug", params.slug)
      .maybeSingle();

    if (readError || !data) {
      return NextResponse.json({ ok: true });
    }

    const current = typeof data[column as keyof typeof data] === "number" ? Number(data[column as keyof typeof data]) : 0;
    await admin
      .from("games")
      .update({ [column]: current + 1 })
      .eq("slug", params.slug);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
