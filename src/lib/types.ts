export type BusinessType =
  | "gym"
  | "clinic"
  | "spa"
  | "wellness_studio"
  | "sports_centre"
  | "longevity_clinic"
  | "biohacking_centre";

export type LeadStatus =
  | "new"
  | "contacted"
  | "followup_due"
  | "warm"
  | "ready_to_close"
  | "closed"
  | "dead";

export type IntentScore = "interested" | "neutral" | "not_interested";

export type ConversationEvent = {
  id: string;
  direction: "outbound" | "inbound";
  channel: "whatsapp";
  message: string;
  timestamp: string;
};

export type Lead = {
  id: string;
  businessName: string;
  businessType: BusinessType;
  city: string;
  phone: string;
  contactName?: string;
  status: LeadStatus;
  leadType: "cold" | "warm";
  notes: string;
  intentScore?: IntentScore;
  firstContactedAt?: string;
  lastContactedAt?: string;
  followUpDueAt?: string;
  projectedCommission: number;
  probability: number;
  generatedMessage: string;
  sendWindow: string;
  conversationHistory: ConversationEvent[];
};

export type PipelineMetric = {
  label: string;
  value: string;
  detail: string;
};

export type WeeklySummary = {
  messagesSent: number;
  repliesReceived: number;
  newWarmLeads: number;
  readyToClose: number;
};

export type CityPerformance = {
  city: string;
  replyRate: string;
  note: string;
};

export type SegmentAngle = {
  label: string;
  angle: string;
};

export type PipelineColumn = {
  key: LeadStatus;
  label: string;
  leads: Lead[];
};

export type DashboardData = {
  leads: Lead[];
  dueToday: Lead[];
  activeLeads: Lead[];
  pipeline: PipelineColumn[];
  pipelineMetrics: PipelineMetric[];
  weeklySummary: WeeklySummary;
  cityPerformance: CityPerformance[];
  segmentAngles: SegmentAngle[];
};

export type AutomationStatus = {
  liveSourcingReady: boolean;
  lastRunAt?: string;
  lastImportedCount: number;
  totalImportedToday: number;
};

export type ApprovalDraft = {
  id: string;
  type: "outbound" | "followup";
  leadId: string;
  leadName: string;
  city: string;
  businessType: string;
  reason: string;
  message: string;
  cadenceType?: "cold" | "warm";
  nextStatus?: LeadStatus;
  nextFollowUpDays?: number;
  sequenceNumber?: number;
  draftSource?: "template" | "anthropic";
};

export type SearchPlay = {
  title: string;
  description: string;
  searches: string[];
};

export type SourcingCandidate = {
  id: string;
  businessName: string;
  businessTypeKey:
    | "gym"
    | "clinic"
    | "spa"
    | "wellness_studio"
    | "sports_centre"
    | "longevity_clinic"
    | "biohacking_centre";
  businessType: string;
  leadCategory?: "end_user" | "distributor" | "reseller_platform" | "competitor_customer" | "monitor_only_competitor";
  city: string;
  source: string;
  fitScore: number;
  reason: string;
  address?: string;
  phone?: string;
  website?: string;
  mapsUrl?: string;
  autoAdded?: boolean;
  autoAddStatus?: "auto_added" | "queued" | "below_threshold";
};

export type SourcingSnapshot = {
  mode: "live" | "fallback";
  provider: string;
  candidates: SourcingCandidate[];
  searchesRun: string[];
  autoAddedCount: number;
  skippedCount: number;
  threshold: number;
  dailyTarget: number;
  remainingToday: number;
};
