import { NextResponse } from "next/server";
import { z } from "zod";

import { generateSalesReplyDraft } from "@/lib/ai-reply-engine";
import { getLeadById } from "@/lib/lead-repository";

const requestSchema = z.object({
  inboundMessage: z.string().min(3),
  customMessage: z.string().optional()
});

type RouteContext = {
  params: Promise<{
    leadId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { leadId } = await context.params;
  const lead = await getLeadById(leadId);

  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const result = await generateSalesReplyDraft({
    lead,
    inboundMessage: parsed.data.inboundMessage,
    customMessage: parsed.data.customMessage
  });

  return NextResponse.json(result);
}
