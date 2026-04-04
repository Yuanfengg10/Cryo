import { NextResponse } from "next/server";
import { z } from "zod";

import { processInboundMessage } from "@/lib/inbound-workflow";

const requestSchema = z.object({
  inboundMessage: z.string().min(3),
  intentScore: z.enum(["interested", "neutral", "not_interested"]),
  customMessage: z.string().optional()
});

type RouteContext = {
  params: Promise<{
    leadId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { leadId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  try {
    const result = await processInboundMessage({
      leadId,
      inboundMessage: parsed.data.inboundMessage,
      intentScore: parsed.data.intentScore,
      customMessage: parsed.data.customMessage
    });

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not process this inbound message."
      },
      { status: 500 }
    );
  }
}
