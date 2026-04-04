import { addDays } from "date-fns";

import { generateSalesReplyDraft } from "@/lib/ai-reply-engine";
import { hasSupabaseEnv } from "@/lib/env";
import { evaluateLeadHandoff } from "@/lib/handoff";
import { getDefaultFollowUpDate, getLeadById } from "@/lib/lead-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { IntentScore } from "@/lib/types";

type ProcessInboundMessageParams = {
  leadId: string;
  inboundMessage: string;
  intentScore: IntentScore;
  customMessage?: string;
};

export async function processInboundMessage({
  leadId,
  inboundMessage,
  intentScore,
  customMessage
}: ProcessInboundMessageParams) {
  if (!hasSupabaseEnv()) {
    throw new Error("Mock mode is active. Connect Supabase to save replies.");
  }

  const trimmedInboundMessage = inboundMessage.trim();

  if (!trimmedInboundMessage) {
    throw new Error("Add at least a short reply note.");
  }

  const lead = await getLeadById(leadId);

  if (!lead) {
    throw new Error("Lead not found.");
  }

  const supabase = createSupabaseServerClient();
  const handoffEvaluation = evaluateLeadHandoff(lead, trimmedInboundMessage, intentScore);
  const followUpDueAt = handoffEvaluation.shouldHandoff ? addDays(new Date(), 1).toISOString() : getDefaultFollowUpDate(intentScore);
  const generatedReply = await generateSalesReplyDraft({
    lead,
    inboundMessage: trimmedInboundMessage,
    customMessage
  });
  const now = new Date().toISOString();

  const { error: eventError } = await supabase.from("conversation_events").insert({
    lead_id: leadId,
    direction: "inbound",
    channel: "whatsapp",
    message: trimmedInboundMessage,
    occurred_at: now
  });

  if (eventError) {
    throw new Error(eventError.message);
  }

  const { error: leadError } = await supabase
    .from("leads")
    .update({
      lead_type: "warm",
      status: handoffEvaluation.status,
      intent_score: intentScore,
      last_contacted_at: now,
      follow_up_due_at: followUpDueAt,
      probability: handoffEvaluation.probability
    })
    .eq("id", leadId);

  if (leadError) {
    throw new Error(leadError.message);
  }

  const { data: generationRow, error: generationError } = await supabase
    .from("message_generations")
    .insert({
      lead_id: leadId,
      message_kind: "reply_assist",
      model_name: generatedReply.source === "anthropic" ? "claude-sonnet-4-20250514" : "rule_fallback",
      prompt_snapshot: JSON.stringify({
        inbound_message: trimmedInboundMessage,
        intent_score: intentScore,
        custom_message: customMessage?.trim() || null,
        source: generatedReply.source
      }),
      generated_message: generatedReply.draft,
      edited_message: null
    })
    .select("id")
    .single();

  if (generationError) {
    console.error("Failed to persist reply generation:", generationError.message);
  }

  await supabase.from("activity_log").insert({
    lead_id: leadId,
    activity_type: "reply_logged",
    metadata: {
      intent_score: intentScore,
      follow_up_due_at: followUpDueAt,
      handoff_ready: handoffEvaluation.shouldHandoff,
      handoff_reason: handoffEvaluation.reason,
      reply_generation_id: generationRow?.id ?? null
    }
  });

  if (handoffEvaluation.shouldHandoff) {
    await supabase.from("activity_log").insert({
      lead_id: leadId,
      activity_type: "status_changed",
      metadata: {
        moved_to: "ready_to_close",
        reason: handoffEvaluation.reason
      }
    });
  }

  return {
    draft: generatedReply.draft,
    source: generatedReply.source,
    handoffReady: handoffEvaluation.shouldHandoff,
    handoffReason: handoffEvaluation.reason,
    status: handoffEvaluation.status,
    followUpDueAt
  };
}
