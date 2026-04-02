import { NextResponse } from "next/server";

import { getCronSecret } from "@/lib/env";
import { runDailySourcing } from "@/lib/sourcing";

async function handleAutomationRequest(request: Request) {
  const cronSecret = getCronSecret();
  const authorization = request.headers.get("authorization");

  if (cronSecret && authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await runDailySourcing();

  return NextResponse.json({
    ok: true,
    provider: snapshot.provider,
    autoAddedCount: snapshot.autoAddedCount,
    remainingToday: snapshot.remainingToday,
    threshold: snapshot.threshold
  });
}

export async function GET(request: Request) {
  return handleAutomationRequest(request);
}

export async function POST(request: Request) {
  return handleAutomationRequest(request);
}
