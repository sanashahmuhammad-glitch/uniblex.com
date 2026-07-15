import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "The legacy server-side ZIP upload pipeline is permanently disabled." },
    { status: 410 }
  );
}
