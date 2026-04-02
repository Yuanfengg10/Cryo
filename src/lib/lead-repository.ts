import { addDays, format, isToday, parseISO, subDays } from "date-fns";

import { getDueToday, getPipelineColumns, mockLeads, segmentAngles } from "@/lib/mock-data";
import type {
  AutomationStatus,
  CityPerformance,
  DashboardData,
  IntentScore,
  Lead,
  LeadStatus,
  PipelineMetric,
  WeeklySummary
} from "@/lib/types";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LeadRow = {
  id: string;
  business_name: string;
  business_type: string;
  city: string;
  phone: string;
  contact_name: string | null;
  status: string;
  lead_type: string;
  notes: string;
  intent_score: string | null;
  probability: number | null;
  projected_commission_eur: number | null;
  first_contacted_at: string | null;
  last_contacted_at: string | null;
  follow_up_due_at: string | null;
};

type ConversationRow = {
  id: string;
  lead_id: string;
  direction: "outbound" | "inbound";
  channel: "whatsapp";
  message: string;
  occurred_at: string;
};

export async function getDashboardData(): Promise<DashboardData> {
  const leads = await getLeads();

  return {
    leads,
    dueToday: getDueToday(leads),
    activeLeads: leads.filter((lead) => lead.status !== "dead"),
    pipeline: getPipelineColumns(leads),
    pipelineMetrics: buildPipelineMetrics(leads),
    weeklySummary: buildWeeklySummary(leads),
    cityPerformance: buildCityPerformance(leads),
    segmentAngles
  };
}

export async function getLeads(): Promise<Lead[]> {
  if (!hasSupabaseEnv()) {
    return mockLeads;
  }

  const supabase = createSupabaseServerClient();
  const { data: leadRows, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (leadError) {
    console.error("Failed to load leads from Supabase:", leadError.message);
    return mockLeads;
  }

  if (!leadRows?.length) {
    return [];
  }

  const leadIds = leadRows.map((lead) => lead.id);
  const { data: conversationRows, error: conversationError } = await supabase
    .from("conversation_events")
    .select("*")
    .in("lead_id", leadIds)
    .order("occurred_at", { ascending: false });

  if (conversationError) {
    console.error("Failed to load conversation history:", conversationError.message);
  }

  return mapLeadRows(leadRows as LeadRow[], (conversationRows as ConversationRow[] | null) ?? []);
}

export async function getLeadById(leadId: string): Promise<Lead | null> {
  const leads = await getLeads();

  return leads.find((lead) => lead.id === leadId) ?? null;
}

export async function getAutomationStatus(): Promise<AutomationStatus> {
  if (!hasSupabaseEnv()) {
    return {
      liveSourcingReady: false,
      lastImportedCount: 0,
      totalImportedToday: 0
    };
  }

  const supabase = createSupabaseServerClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [{ data: latestRun, error: latestError }, { data: todayRuns, error: todayError }] = await Promise.all([
    supabase
      .from("lead_import_runs")
      .select("created_at, imported_count")
      .eq("source", "google_places_auto")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("lead_import_runs")
      .select("imported_count")
      .eq("source", "google_places_auto")
      .gte("created_at", todayStart.toISOString())
  ]);

  if (latestError) {
    console.error("Failed to load latest automation run:", latestError.message);
  }

  if (todayError) {
    console.error("Failed to load today's automation runs:", todayError.message);
  }

  return {
    liveSourcingReady: true,
    lastRunAt: latestRun?.created_at ?? undefined,
    lastImportedCount: Number(latestRun?.imported_count ?? 0),
    totalImportedToday: (todayRuns ?? []).reduce((sum, row) => sum + Number(row.imported_count ?? 0), 0)
  };
}

export function getDefaultFollowUpDate(intentScore?: IntentScore) {
  return addDays(new Date(), intentScore === "interested" ? 2 : 5).toISOString();
}

function mapLeadRows(rows: LeadRow[], conversations: ConversationRow[]) {
  const conversationMap = new Map<string, Lead["conversationHistory"]>();

  for (const conversation of conversations) {
    const existing = conversationMap.get(conversation.lead_id) ?? [];
    existing.push({
      id: conversation.id,
      direction: conversation.direction,
      channel: conversation.channel,
      message: conversation.message,
      timestamp: conversation.occurred_at
    });
    conversationMap.set(conversation.lead_id, existing);
  }

  return rows.map((row) => ({
    id: row.id,
    businessName: row.business_name,
    businessType: normalizeBusinessType(row.business_type),
    city: row.city,
    phone: row.phone,
    contactName: row.contact_name ?? undefined,
    status: normalizeLeadStatus(row.status),
    leadType: row.lead_type === "warm" ? ("warm" as const) : ("cold" as const),
    notes: row.notes,
    intentScore: normalizeIntentScore(row.intent_score),
    firstContactedAt: row.first_contacted_at ?? undefined,
    lastContactedAt: row.last_contacted_at ?? undefined,
    followUpDueAt: row.follow_up_due_at ?? undefined,
    projectedCommission: Number(row.projected_commission_eur ?? 0),
    probability: Number(row.probability ?? 0),
    generatedMessage: buildPlaceholderMessage(row.business_name, row.business_type, row.city),
    sendWindow: getSuggestedSendWindow(row.business_type),
    conversationHistory: conversationMap.get(row.id) ?? []
  }));
}

function buildPipelineMetrics(leads: Lead[]): PipelineMetric[] {
  const outboundLeads = leads.filter(
    (lead) => lead.status !== "new" || lead.conversationHistory.some((entry) => entry.direction === "outbound")
  );
  const repliedLeads = leads.filter((lead) => lead.conversationHistory.some((entry) => entry.direction === "inbound"));
  const warmLeads = leads.filter((lead) => ["warm", "ready_to_close"].includes(lead.status));
  const readyToClose = leads.filter((lead) => lead.status === "ready_to_close");
  const weightedCommission = leads.reduce((total, lead) => total + lead.projectedCommission * lead.probability, 0);
  const replyRate = outboundLeads.length ? Math.round((repliedLeads.length / outboundLeads.length) * 100) : 0;

  return [
    {
      label: "Reply rate",
      value: `${replyRate}%`,
      detail: `${repliedLeads.length} of ${outboundLeads.length || 0} contacted leads have replied.`
    },
    {
      label: "Warm leads",
      value: String(warmLeads.length),
      detail: `${getDueToday(warmLeads).length} warm leads need attention today.`
    },
    {
      label: "Ready to close",
      value: String(readyToClose.length),
      detail: readyToClose.length ? "These leads are showing strong buying intent." : "No strong close signals yet."
    },
    {
      label: "Projected commission",
      value: `EUR ${Math.round(weightedCommission).toLocaleString()}`,
      detail: "Weighted by current stage probability."
    }
  ];
}

function buildWeeklySummary(leads: Lead[]): WeeklySummary {
  const weekStart = subDays(new Date(), 7);
  const outboundMessages = leads.flatMap((lead) => lead.conversationHistory).filter((entry) => parseISO(entry.timestamp) >= weekStart);

  return {
    messagesSent: outboundMessages.filter((entry) => entry.direction === "outbound").length,
    repliesReceived: outboundMessages.filter((entry) => entry.direction === "inbound").length,
    newWarmLeads: leads.filter((lead) => lead.leadType === "warm" && lead.lastContactedAt && parseISO(lead.lastContactedAt) >= weekStart).length,
    readyToClose: leads.filter((lead) => lead.status === "ready_to_close").length
  };
}

function buildCityPerformance(leads: Lead[]): CityPerformance[] {
  const cityMap = new Map<string, { contacted: number; replied: number }>();

  for (const lead of leads) {
    const entry = cityMap.get(lead.city) ?? { contacted: 0, replied: 0 };
    if (lead.status !== "new") {
      entry.contacted += 1;
    }
    if (lead.conversationHistory.some((event) => event.direction === "inbound")) {
      entry.replied += 1;
    }
    cityMap.set(lead.city, entry);
  }

  return Array.from(cityMap.entries())
    .map(([city, stats]) => {
      const replyRate = stats.contacted ? Math.round((stats.replied / stats.contacted) * 100) : 0;

      return {
        city,
        replyRate: `${replyRate}%`,
        note: buildCityNote(replyRate)
      };
    })
    .sort((left, right) => right.city.localeCompare(left.city));
}

function buildCityNote(replyRate: number) {
  if (replyRate >= 40) {
    return "Strong local traction. Keep the angle tight and specific.";
  }

  if (replyRate >= 25) {
    return "Promising enough to keep testing message variants.";
  }

  return "Needs sharper proof points or better-fit targets.";
}

function buildPlaceholderMessage(businessName: string, businessType: string, city: string) {
  const angleByType: Record<string, string> = {
    gym: "performance recovery and member retention",
    clinic: "patient outcomes and treatment revenue",
    spa: "premium treatment differentiation",
    wellness_studio: "elevated client experience",
    sports_centre: "athlete recovery and facility advantage",
    longevity_clinic: "bio-optimisation and high-ticket retention",
    biohacking_centre: "flagship longevity hardware and member experience",
    other: "a premium recovery offer"
  };

  return `Quick question for ${businessName}: are you already exploring how ${angleByType[businessType] ?? "a premium recovery offer"} could land with clients in ${city}?`;
}

function getSuggestedSendWindow(businessType: string) {
  const windows: Record<string, string> = {
    gym: "7:00-9:00 am or 6:00-8:00 pm",
    clinic: "10:00 am-12:00 pm weekday",
    spa: "10:00 am-1:00 pm weekday",
    wellness_studio: "10:00 am-1:00 pm weekday",
    sports_centre: "7:00-9:00 am or 6:00-8:00 pm",
    longevity_clinic: "10:00 am-12:00 pm weekday",
    biohacking_centre: "10:00 am-12:00 pm weekday",
    other: "10:00 am-12:00 pm weekday"
  };

  return windows[businessType] ?? windows.other;
}

function normalizeBusinessType(value: string): Lead["businessType"] {
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

function normalizeLeadStatus(value: string): LeadStatus {
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

function normalizeIntentScore(value: string | null): IntentScore | undefined {
  if (value === "interested" || value === "neutral" || value === "not_interested") {
    return value;
  }

  return undefined;
}

export function formatFollowUpLabel(value?: string) {
  if (!value) {
    return "No follow-up scheduled";
  }

  if (isToday(parseISO(value))) {
    return `Due today at ${format(parseISO(value), "h:mm a")}`;
  }

  return `Due ${format(parseISO(value), "d MMM, h:mm a")}`;
}
