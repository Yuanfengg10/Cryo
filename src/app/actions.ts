"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { hasSupabaseEnv } from "@/lib/env";
import { evaluateLeadHandoff } from "@/lib/handoff";
import { getDefaultFollowUpDate } from "@/lib/lead-repository";
import { runDailySourcing } from "@/lib/sourcing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { IntentScore, Lead } from "@/lib/types";

const replySchema = z.object({
  leadId: z.string().min(1),
  replySnippet: z.string().min(5, "Add at least a short reply note."),
  intentScore: z.enum(["interested", "neutral", "not_interested"])
});

const approvalSchema = z.object({
  leadId: z.string().min(1),
  message: z.string().min(5),
  draftType: z.enum(["outbound", "followup"]).default("outbound"),
  cadenceType: z.enum(["cold", "warm"]).optional(),
  nextStatus: z.enum(["contacted", "followup_due", "warm", "ready_to_close"]).optional(),
  nextFollowUpDays: z.coerce.number().int().positive().optional(),
  sequenceNumber: z.coerce.number().int().positive().optional()
});

export type ReplyActionState = {
  success: boolean;
  message: string;
};

export type LeadActionState = {
  success: boolean;
  message: string;
};

export type ResetActionState = {
  success: boolean;
  message: string;
};

export type ApprovalActionState = {
  success: boolean;
  message: string;
};

export type RevertActionState = {
  success: boolean;
  message: string;
};

export type WeeklyPulseResetState = {
  success: boolean;
  message: string;
};

export type AutomationRunState = {
  success: boolean;
  message: string;
};


const leadSchema = z.object({
  businessName: z.string().min(2, "Add a business name."),
  businessType: z.enum([
    "gym",
    "clinic",
    "spa",
    "wellness_studio",
    "sports_centre",
    "longevity_clinic",
    "biohacking_centre"
  ]),
  city: z.string().min(2, "Add a city."),
  phone: z.string().min(6, "Add a phone number."),
  contactName: z.string().optional(),
  notes: z.string().optional()
});

export async function logReplyAction(
  _previousState: ReplyActionState,
  formData: FormData
): Promise<ReplyActionState> {
  const result = replySchema.safeParse({
    leadId: formData.get("leadId"),
    replySnippet: formData.get("replySnippet"),
    intentScore: formData.get("intentScore")
  });

  if (!result.success) {
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Could not log the reply."
    };
  }

  if (!hasSupabaseEnv()) {
    return {
      success: false,
      message: "Mock mode is active. Connect Supabase to save replies."
    };
  }

  const { leadId, replySnippet, intentScore } = result.data;
  const supabase = createSupabaseServerClient();
  const currentLead = await loadLeadForHandoff(supabase, leadId);

  if (!currentLead) {
    return {
      success: false,
      message: "Could not load the lead for handoff evaluation."
    };
  }

  const handoffEvaluation = evaluateLeadHandoff(currentLead, replySnippet, intentScore);
  const followUpDueAt = handoffEvaluation.shouldHandoff ? addDays(new Date(), 1).toISOString() : getDefaultFollowUpDate(intentScore);

  const { error: eventError } = await supabase.from("conversation_events").insert({
    lead_id: leadId,
    direction: "inbound",
    channel: "whatsapp",
    message: replySnippet,
    occurred_at: new Date().toISOString()
  });

  if (eventError) {
    return {
      success: false,
      message: eventError.message
    };
  }

  const { error: leadError } = await supabase
    .from("leads")
    .update({
      lead_type: "warm",
      status: handoffEvaluation.status,
      intent_score: intentScore,
      last_contacted_at: new Date().toISOString(),
      follow_up_due_at: followUpDueAt,
      probability: handoffEvaluation.probability
    })
    .eq("id", leadId);

  if (leadError) {
    return {
      success: false,
      message: leadError.message
    };
  }

  await supabase.from("activity_log").insert({
    lead_id: leadId,
    activity_type: "reply_logged",
    metadata: {
      intent_score: intentScore,
      follow_up_due_at: followUpDueAt,
      handoff_ready: handoffEvaluation.shouldHandoff,
      handoff_reason: handoffEvaluation.reason
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

  revalidatePath("/");
  revalidatePath(`/leads/${leadId}`);

  return {
    success: true,
    message: handoffEvaluation.shouldHandoff
      ? "Reply logged. This lead is now marked ready for your handoff."
      : "Reply logged and follow-up timing refreshed."
  };
}

export async function createLeadAction(
  _previousState: LeadActionState,
  formData: FormData
): Promise<LeadActionState> {
  const result = leadSchema.safeParse({
    businessName: formData.get("businessName"),
    businessType: formData.get("businessType"),
    city: formData.get("city"),
    phone: formData.get("phone"),
    contactName: formData.get("contactName") ?? "",
    notes: formData.get("notes") ?? ""
  });

  if (!result.success) {
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Could not create the lead."
    };
  }

  if (!hasSupabaseEnv()) {
    return {
      success: false,
      message: "Supabase is not connected, so new leads cannot be saved yet."
    };
  }

  const supabase = createSupabaseServerClient();
  const { businessName, businessType, city, phone, contactName, notes } = result.data;

  const { data, error } = await supabase
    .from("leads")
    .insert({
      business_name: businessName,
      business_type: businessType,
      city,
      phone,
      contact_name: contactName || null,
      status: "new",
      lead_type: "cold",
      notes: notes || "",
      probability: getDefaultProbability(businessType),
      projected_commission_eur: getDefaultCommission(businessType)
    })
    .select("id")
    .single();

  if (error) {
    return {
      success: false,
      message: error.message
    };
  }

  await supabase.from("activity_log").insert({
    lead_id: data.id,
    activity_type: "lead_created",
    metadata: {
      source: "manual_dashboard_entry"
    }
  });

  revalidatePath("/");

  return {
    success: true,
    message: "Lead added successfully."
  };
}

export async function resetLeadsAction(
  _previousState: ResetActionState
): Promise<ResetActionState> {
  if (!hasSupabaseEnv()) {
    return {
      success: false,
      message: "Supabase is not connected, so there is nothing to reset."
    };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("reset_sales_workspace");

  if (error) {
    return {
      success: false,
      message: error.message
    };
  }

  revalidatePath("/");

  return {
    success: true,
    message: "All current leads and sourcing history were cleared."
  };
}

export async function approveOutboundDraftAction(
  _previousState: ApprovalActionState,
  formData: FormData
): Promise<ApprovalActionState> {
  const result = approvalSchema.safeParse({
    leadId: formData.get("leadId"),
    message: formData.get("message"),
    draftType: formData.get("draftType") ?? "outbound",
    cadenceType: formData.get("cadenceType") || undefined,
    nextStatus: formData.get("nextStatus") || undefined,
    nextFollowUpDays: formData.get("nextFollowUpDays") || undefined,
    sequenceNumber: formData.get("sequenceNumber") || undefined
  });

  if (!result.success) {
    return {
      success: false,
      message: "Could not approve this draft."
    };
  }

  if (!hasSupabaseEnv()) {
    return {
      success: false,
      message: "Supabase is not connected, so approvals cannot be saved yet."
    };
  }

  const supabase = createSupabaseServerClient();
  const { leadId, message, draftType, cadenceType, nextFollowUpDays, nextStatus, sequenceNumber } = result.data;
  const now = new Date().toISOString();
  const followUpDueAt = addDays(new Date(), draftType === "outbound" ? 3 : nextFollowUpDays ?? 4).toISOString();
  const leadUpdate: {
    status: "contacted" | "followup_due" | "warm" | "ready_to_close";
    last_contacted_at: string;
    follow_up_due_at: string;
    first_contacted_at?: string;
  } = {
    status: draftType === "outbound" ? "contacted" : nextStatus ?? "followup_due",
    last_contacted_at: now,
    follow_up_due_at: followUpDueAt
  };

  if (draftType === "outbound") {
    leadUpdate.first_contacted_at = now;
  }

  const { error: conversationError } = await supabase.from("conversation_events").insert({
    lead_id: leadId,
    direction: "outbound",
    channel: "whatsapp",
    message,
    occurred_at: now
  });

  if (conversationError) {
    return {
      success: false,
      message: conversationError.message
    };
  }

  const { error: leadError } = await supabase
    .from("leads")
    .update(leadUpdate)
    .eq("id", leadId);

  if (leadError) {
    return {
      success: false,
      message: leadError.message
    };
  }

  await supabase.from("activity_log").insert({
    lead_id: leadId,
    activity_type: "message_sent",
    metadata: {
      channel: "whatsapp",
      draft_type: draftType,
      follow_up_due_at: followUpDueAt
    }
  });

  if (draftType === "followup") {
    await supabase
      .from("follow_up_tasks")
      .update({
        status: "completed",
        completed_at: now
      })
      .eq("lead_id", leadId)
      .eq("status", "pending");
  }

  await supabase.from("follow_up_tasks").insert({
    lead_id: leadId,
    sequence_number: sequenceNumber ?? (draftType === "outbound" ? 1 : 2),
    cadence_type: cadenceType ?? "cold",
    due_at: followUpDueAt,
    status: "pending"
  });

  await supabase.from("activity_log").insert({
    lead_id: leadId,
    activity_type: "follow_up_scheduled",
    metadata: {
      draft_type: draftType,
      cadence_type: cadenceType ?? "cold",
      due_at: followUpDueAt
    }
  });

  revalidatePath("/");
  revalidatePath(`/leads/${leadId}`);

  return {
    success: true,
    message:
      draftType === "outbound"
        ? "Draft approved. Lead moved to contacted and follow-up scheduled."
        : "Follow-up approved and the next follow-up date was scheduled."
  };
}

export async function revertLeadToNewAction(
  _previousState: RevertActionState,
  formData: FormData
): Promise<RevertActionState> {
  const leadId = formData.get("leadId");

  if (typeof leadId !== "string" || !leadId) {
    return {
      success: false,
      message: "Missing lead ID."
    };
  }

  if (!hasSupabaseEnv()) {
    return {
      success: false,
      message: "Supabase is not connected, so this lead cannot be reverted."
    };
  }

  const supabase = createSupabaseServerClient();

  const { error: conversationDeleteError } = await supabase
    .from("conversation_events")
    .delete()
    .eq("lead_id", leadId)
    .eq("direction", "outbound");

  if (conversationDeleteError) {
    return {
      success: false,
      message: conversationDeleteError.message
    };
  }

  const { error: taskError } = await supabase
    .from("follow_up_tasks")
    .update({
      status: "cancelled"
    })
    .eq("lead_id", leadId)
    .eq("status", "pending");

  if (taskError) {
    return {
      success: false,
      message: taskError.message
    };
  }

  const { error: leadError } = await supabase
    .from("leads")
    .update({
      status: "new",
      first_contacted_at: null,
      last_contacted_at: null,
      follow_up_due_at: null
    })
    .eq("id", leadId);

  if (leadError) {
    return {
      success: false,
      message: leadError.message
    };
  }

  const { error: activityDeleteError } = await supabase
    .from("activity_log")
    .delete()
    .eq("lead_id", leadId)
    .eq("activity_type", "message_sent");

  if (activityDeleteError) {
    return {
      success: false,
      message: activityDeleteError.message
    };
  }

  await supabase.from("activity_log").insert({
    lead_id: leadId,
    activity_type: "status_changed",
    metadata: {
      reverted_to: "new"
    }
  });

  revalidatePath("/");
  revalidatePath(`/leads/${leadId}`);

  return {
    success: true,
    message: "Lead moved back to new."
  };
}

export async function resetWeeklyMessagesAction(
  _previousState: WeeklyPulseResetState
): Promise<WeeklyPulseResetState> {
  if (!hasSupabaseEnv()) {
    return {
      success: false,
      message: "Supabase is not connected, so weekly activity cannot be reset."
    };
  }

  const supabase = createSupabaseServerClient();
  const weekStart = addDays(new Date(), -7).toISOString();

  const { error: conversationDeleteError } = await supabase
    .from("conversation_events")
    .delete()
    .eq("direction", "outbound")
    .gte("occurred_at", weekStart);

  if (conversationDeleteError) {
    return {
      success: false,
      message: conversationDeleteError.message
    };
  }

  const { error: activityDeleteError } = await supabase
    .from("activity_log")
    .delete()
    .eq("activity_type", "message_sent")
    .gte("created_at", weekStart);

  if (activityDeleteError) {
    return {
      success: false,
      message: activityDeleteError.message
    };
  }

  revalidatePath("/");

  return {
    success: true,
    message: "Weekly sent-message activity was reset."
  };
}

export async function runDailySourcingNowAction(
  _previousState: AutomationRunState
): Promise<AutomationRunState> {
  const snapshot = await runDailySourcing();

  revalidatePath("/");

  return {
    success: true,
    message: `Daily sourcing run finished. ${snapshot.autoAddedCount} leads auto-added this run.`
  };
}

function getStatusFromIntent(intentScore: IntentScore) {
  return intentScore === "interested" ? "ready_to_close" : "warm";
}

async function loadLeadForHandoff(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  leadId: string
): Promise<Lead | null> {
  const { data: leadRow, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError || !leadRow) {
    console.error("Failed to load lead for handoff evaluation:", leadError?.message);
    return null;
  }

  const { data: conversationRows, error: conversationError } = await supabase
    .from("conversation_events")
    .select("*")
    .eq("lead_id", leadId)
    .order("occurred_at", { ascending: false });

  if (conversationError) {
    console.error("Failed to load lead conversation for handoff evaluation:", conversationError.message);
    return null;
  }

  return {
    id: String(leadRow.id),
    businessName: String(leadRow.business_name),
    businessType: normalizeBusinessTypeValue(String(leadRow.business_type)),
    city: String(leadRow.city),
    phone: String(leadRow.phone),
    contactName: leadRow.contact_name ? String(leadRow.contact_name) : undefined,
    status: normalizeLeadStatusValue(String(leadRow.status)),
    leadType: leadRow.lead_type === "warm" ? "warm" : "cold",
    notes: String(leadRow.notes ?? ""),
    intentScore:
      leadRow.intent_score === "interested" || leadRow.intent_score === "neutral" || leadRow.intent_score === "not_interested"
        ? leadRow.intent_score
        : undefined,
    firstContactedAt: leadRow.first_contacted_at ?? undefined,
    lastContactedAt: leadRow.last_contacted_at ?? undefined,
    followUpDueAt: leadRow.follow_up_due_at ?? undefined,
    projectedCommission: Number(leadRow.projected_commission_eur ?? 0),
    probability: Number(leadRow.probability ?? 0),
    generatedMessage: "",
    sendWindow: "",
    conversationHistory: ((conversationRows ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      direction: row.direction === "inbound" ? "inbound" : "outbound",
      channel: "whatsapp",
      message: String(row.message ?? ""),
      timestamp: String(row.occurred_at)
    }))
  };
}

function normalizeBusinessTypeValue(value: string): Lead["businessType"] {
  if (
    value === "gym" ||
    value === "clinic" ||
    value === "spa" ||
    value === "wellness_studio" ||
    value === "sports_centre" ||
    value === "longevity_clinic" ||
    value === "biohacking_centre"
  ) {
    return value;
  }

  return "wellness_studio";
}

function normalizeLeadStatusValue(value: string): Lead["status"] {
  if (
    value === "new" ||
    value === "contacted" ||
    value === "followup_due" ||
    value === "warm" ||
    value === "ready_to_close" ||
    value === "closed" ||
    value === "dead"
  ) {
    return value;
  }

  return "new";
}

function getDefaultCommission(businessType: string) {
  if (businessType === "longevity_clinic" || businessType === "biohacking_centre") {
    return 4800;
  }

  if (businessType === "clinic" || businessType === "sports_centre") {
    return 4200;
  }

  return 3000;
}

function getDefaultProbability(businessType: string) {
  if (businessType === "longevity_clinic" || businessType === "biohacking_centre") {
    return 0.4;
  }

  if (businessType === "clinic" || businessType === "gym") {
    return 0.32;
  }

  return 0.24;
}
