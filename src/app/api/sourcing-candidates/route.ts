import { NextResponse } from "next/server";

import { getSourcingSnapshot } from "@/lib/sourcing";

export async function GET() {
  const snapshot = await getSourcingSnapshot();

  return NextResponse.json(snapshot);
}
