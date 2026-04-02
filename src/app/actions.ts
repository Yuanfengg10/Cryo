"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { hasSupabaseEnv } from "@/lib/env";
import { getDefaultFollowUpDate } from "@/lib/lead-repository";
import { runDailySourcing } from "@/lib/sourcing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { IntentScore } from "@/lib/types";

const replySchema = z.object({
  leadId: z.string().min(1),
  replySnippet: z.string().min(5, "Add at least a short reply note."),
  intentScore: z.enum(["interested", "neutral", "not_interested"])
});

const approvalSchema = z.object({
  leadId: z.string().min(1),
  message: z.string().min(5)
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
  const status = getStatusFromIntent(intentScore);
  const followUpDueAt = getDefaultFollowUpDate(intentScore);

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
      status,
      intent_score: intentScore,
      last_contacted_at: new Date().toISOString(),
      follow_up_due_at: followUpDueAt
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
      follow_up_due_at: followUpDueAt
    }
  });

  revalidatePath("/");
  revalidatePath(`/leads/${leadId}`);

  return {
    success: true,
    message: "Reply logged and follow-up timing refreshed."
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
    message: formData.get("message")
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
  const { leadId, message } = result.data;
  const now = new Date().toISOString();
  const followUpDueAt = addDays(new Date(), 3).toISOString();

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
    .update({
      status: "contacted",
      first_contacted_at: now,
      last_contacted_at: now,
      follow_up_due_at: followUpDueAt
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
    activity_type: "message_sent",
    metadata: {
      channel: "whatsapp",
      follow_up_due_at: followUpDueAt
    }
  });

  await supabase.from("follow_up_tasks").insert({
    lead_id: leadId,
    sequence_number: 1,
    cadence_type: "cold",
    due_at: followUpDueAt,
    status: "pending"
  });

  revalidatePath("/");
  revalidatePath(`/leads/${leadId}`);

  return {
    success: true,
    message: "Draft approved. Lead moved to contacted and follow-up scheduled."
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
