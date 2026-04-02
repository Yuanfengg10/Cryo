import { format, isToday, parseISO } from "date-fns";

import type { Lead, LeadStatus, PipelineColumn } from "@/lib/types";

const now = new Date();
const today = now.toISOString();

export const mockLeads: Lead[] = [
  {
    id: "lead-001",
    businessName: "Ultimate Performance Singapore",
    businessType: "gym",
    city: "Singapore",
    phone: "6598765432",
    contactName: "Operations Team",
    status: "followup_due",
    leadType: "warm",
    notes: "Premium positioning. Recovery upsell angle is strong.",
    intentScore: "interested",
    firstContactedAt: "2026-03-24T08:00:00.000Z",
    lastContactedAt: "2026-03-29T02:15:00.000Z",
    followUpDueAt: today,
    projectedCommission: 4200,
    probability: 0.65,
    sendWindow: "7:00-9:00 am or 6:00-8:00 pm",
    generatedMessage:
      "Quick one, have you seen how recovery-led gyms are using cryo to lift premium retention without changing the core training offer? Curious if that angle is on your radar this quarter.",
    conversationHistory: [
      {
        id: "evt-1",
        direction: "outbound",
        channel: "whatsapp",
        message: "Reached out with performance recovery angle.",
        timestamp: "2026-03-24T08:00:00.000Z"
      },
      {
        id: "evt-2",
        direction: "inbound",
        channel: "whatsapp",
        message: "Asked whether the equipment fits compact urban clubs.",
        timestamp: "2026-03-27T03:30:00.000Z"
      }
    ]
  },
  {
    id: "lead-002",
    businessName: "Hammam Spa Bangsar",
    businessType: "spa",
    city: "Bangsar",
    phone: "601122334455",
    contactName: "Spa Director",
    status: "new",
    leadType: "cold",
    notes: "Luxury concept and strong treatment-menu storytelling.",
    projectedCommission: 2800,
    probability: 0.25,
    sendWindow: "10:00 am-1:00 pm weekday",
    generatedMessage:
      "Noticed how premium spas are adding cold-led ritual moments to make signature treatments feel even more exclusive. Wondering if that kind of differentiator could fit your Bangsar clientele.",
    conversationHistory: []
  },
  {
    id: "lead-003",
    businessName: "Convergy Physio & Rehab",
    businessType: "clinic",
    city: "Singapore",
    phone: "6562620566",
    contactName: "Clinical Director",
    status: "ready_to_close",
    leadType: "warm",
    notes: "Reply mentioned interest in patient recovery speed and revenue per room.",
    intentScore: "interested",
    firstContactedAt: "2026-03-20T02:00:00.000Z",
    lastContactedAt: "2026-03-30T05:00:00.000Z",
    followUpDueAt: "2026-04-01T02:00:00.000Z",
    projectedCommission: 5000,
    probability: 0.82,
    sendWindow: "10:00 am-12:00 pm weekday",
    generatedMessage:
      "Seeing more sports rehab clinics use cryo as both a faster recovery conversation and a premium add-on. Curious whether you are already evaluating anything in that lane for this year.",
    conversationHistory: [
      {
        id: "evt-3",
        direction: "outbound",
        channel: "whatsapp",
        message: "Introduced clinical outcomes angle.",
        timestamp: "2026-03-20T02:00:00.000Z"
      },
      {
        id: "evt-4",
        direction: "inbound",
        channel: "whatsapp",
        message: "Asked for footprint, support, and treatment ROI.",
        timestamp: "2026-03-30T05:00:00.000Z"
      }
    ]
  },
  {
    id: "lead-004",
    businessName: "Chi Fitness KLCC",
    businessType: "gym",
    city: "Kuala Lumpur",
    phone: "60321622366",
    contactName: "General Manager",
    status: "contacted",
    leadType: "cold",
    notes: "Need a second touch on recovery zone monetisation.",
    firstContactedAt: "2026-03-28T00:00:00.000Z",
    lastContactedAt: "2026-03-28T00:00:00.000Z",
    followUpDueAt: "2026-03-31T00:00:00.000Z",
    projectedCommission: 3200,
    probability: 0.35,
    sendWindow: "7:00-9:00 am or 6:00-8:00 pm",
    generatedMessage:
      "A lot of premium clubs are using recovery services as the thing that separates them from standard memberships. Would a cryo-led recovery corner be worth exploring on your side.",
    conversationHistory: [
      {
        id: "evt-5",
        direction: "outbound",
        channel: "whatsapp",
        message: "Initial outbound sent.",
        timestamp: "2026-03-28T00:00:00.000Z"
      }
    ]
  },
  {
    id: "lead-005",
    businessName: "Porcelain Skin",
    businessType: "wellness_studio",
    city: "Singapore",
    phone: "6562279692",
    contactName: "Studio Team",
    status: "warm",
    leadType: "warm",
    notes: "Interested in premium facial and client experience differentiation.",
    intentScore: "neutral",
    firstContactedAt: "2026-03-22T02:00:00.000Z",
    lastContactedAt: "2026-03-29T06:00:00.000Z",
    followUpDueAt: "2026-04-02T03:00:00.000Z",
    projectedCommission: 2600,
    probability: 0.54,
    sendWindow: "10:00 am-1:00 pm weekday",
    generatedMessage:
      "Seeing premium studios create a more elevated post-treatment story by adding targeted cold therapy rather than another standard facial upsell. Curious whether that kind of experience play would resonate with your clients.",
    conversationHistory: [
      {
        id: "evt-6",
        direction: "inbound",
        channel: "whatsapp",
        message: "Asked if cryo facial equipment fits existing treatment rooms.",
        timestamp: "2026-03-29T06:00:00.000Z"
      }
    ]
  },
  {
    id: "lead-006",
    businessName: "Sunway Sports Centre",
    businessType: "sports_centre",
    city: "Petaling Jaya",
    phone: "60374944444",
    contactName: "Performance Unit",
    status: "dead",
    leadType: "cold",
    notes: "No response after second follow-up.",
    firstContactedAt: "2026-03-10T01:00:00.000Z",
    lastContactedAt: "2026-03-17T01:00:00.000Z",
    projectedCommission: 0,
    probability: 0,
    sendWindow: "7:00-9:00 am",
    generatedMessage:
      "Recovery-led facilities are increasingly turning cold therapy into both a performance and membership differentiator. Wondering if that is something your team is looking at this season.",
    conversationHistory: []
  },
  {
    id: "lead-007",
    businessName: "Vital Age Longevity Clinic",
    businessType: "longevity_clinic",
    city: "Singapore",
    phone: "6569001122",
    contactName: "Founder",
    status: "new",
    leadType: "cold",
    notes: "Longevity-focused clinic. HaloX capsule and Antarctica chamber could fit premium bio-optimisation offers.",
    projectedCommission: 4800,
    probability: 0.42,
    sendWindow: "10:00 am-12:00 pm weekday",
    generatedMessage:
      "Seeing a lot of longevity clinics add premium recovery and bio-optimisation equipment to deepen client retention. Curious whether that is something you are actively exploring in Singapore.",
    conversationHistory: []
  },
  {
    id: "lead-008",
    businessName: "Kuala Lumpur Biohacking Lab",
    businessType: "biohacking_centre",
    city: "Kuala Lumpur",
    phone: "60376543210",
    contactName: "Programme Director",
    status: "contacted",
    leadType: "cold",
    notes: "Strong fit for longevity and performance positioning. Likely interested in flagship hardware.",
    projectedCommission: 5300,
    probability: 0.46,
    firstContactedAt: "2026-03-30T02:00:00.000Z",
    lastContactedAt: "2026-03-30T02:00:00.000Z",
    followUpDueAt: "2026-04-02T02:00:00.000Z",
    sendWindow: "10:00 am-12:00 pm weekday",
    generatedMessage:
      "Biohacking studios are increasingly using flagship recovery hardware as both a client acquisition story and a premium upsell. Wondering whether that angle is already on your roadmap.",
    conversationHistory: [
      {
        id: "evt-7",
        direction: "outbound",
        channel: "whatsapp",
        message: "Initial longevity and flagship hardware outreach sent.",
        timestamp: "2026-03-30T02:00:00.000Z"
      }
    ]
  }
];

export const cityPerformance = [
  { city: "Singapore", replyRate: "38%", note: "Strong clinic and wellness responsiveness." },
  { city: "Kuala Lumpur", replyRate: "29%", note: "Gym angle is promising but slower." },
  { city: "Petaling Jaya", replyRate: "25%", note: "Needs better local proof points." },
  { city: "Bangsar", replyRate: "31%", note: "Premium spa positioning looks viable." }
];

export const segmentAngles = [
  { label: "Gym", angle: "Performance recovery + member retention" },
  { label: "Clinic", angle: "Patient outcomes + add-on revenue" },
  { label: "Spa", angle: "Premium differentiation + treatment story" },
  { label: "Wellness", angle: "Elevated client experience + exclusivity" },
  { label: "Longevity", angle: "Bio-optimisation + premium lifetime value" },
  { label: "Biohacking", angle: "Flagship hardware + experiential differentiation" }
];

export function getDueToday(leads: Lead[]) {
  return leads.filter((lead) => lead.followUpDueAt && isToday(parseISO(lead.followUpDueAt)));
}

export function getPipelineColumns(leads: Lead[]): PipelineColumn[] {
  const columns: Array<{ key: LeadStatus; label: string }> = [
    { key: "new", label: "New" },
    { key: "contacted", label: "Contacted" },
    { key: "followup_due", label: "Follow-up Due" },
    { key: "warm", label: "Warm" },
    { key: "ready_to_close", label: "Ready To Close" },
    { key: "closed", label: "Closed" },
    { key: "dead", label: "Dead" }
  ];

  return columns.map((column) => ({
    ...column,
    leads: leads.filter((lead) => lead.status === column.key)
  }));
}

export function getLastTouchLabel(value?: string) {
  if (!value) {
    return "No outreach yet";
  }

  return format(parseISO(value), "d MMM, h:mm a");
}

export function getWhatsappHref(phone: string, message: string) {
  const sanitizedPhone = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;
}
