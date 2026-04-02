import type { IntentScore, Lead, LeadStatus } from "@/lib/types";

type HandoffEvaluation = {
  shouldHandoff: boolean;
  status: LeadStatus;
  reason: string;
  probability: number;
};

const materialsKeywords = ["catalog", "brochure", "deck", "details", "spec", "specs"];
const pricingKeywords = ["price", "pricing", "quote", "quotation", "cost", "budget"];
const demoKeywords = ["demo", "video", "youtube", "sample"];
const meetingKeywords = ["call", "meeting", "zoom", "speak", "talk", "discuss"];
const commercialKeywords = ["shipping", "delivery", "lead time", "availability", "payment", "deposit", "install", "installation"];
const positiveKeywords = ["interested", "keen", "sounds good", "yes", "okay", "great", "let's", "let us"];

export function evaluateLeadHandoff(lead: Lead, inboundMessage: string, intentScore: IntentScore): HandoffEvaluation {
  if (intentScore === "not_interested") {
    return {
      shouldHandoff: false,
      status: "warm",
      reason: "Lead replied, but there is no meaningful buying signal yet.",
      probability: Math.max(lead.probability, 0.2)
    };
  }

  const lower = inboundMessage.toLowerCase();
  const signals = {
    askedForMaterials: containsAny(lower, materialsKeywords),
    askedForPricing: containsAny(lower, pricingKeywords),
    askedForDemo: containsAny(lower, demoKeywords),
    askedForNextStep: containsAny(lower, meetingKeywords),
    askedForCommercials: containsAny(lower, commercialKeywords),
    positiveLanguage: containsAny(lower, positiveKeywords)
  };

  const previousInboundCount = lead.conversationHistory.filter((event) => event.direction === "inbound").length;
  const continuedEngagement = previousInboundCount >= 1 || Boolean(lead.firstContactedAt);
  const strongCommercialInterest = signals.askedForPricing || signals.askedForNextStep || signals.askedForCommercials;
  const handoffTriggered =
    intentScore === "interested" &&
    (signals.askedForNextStep ||
      strongCommercialInterest ||
      (signals.askedForMaterials && (signals.askedForDemo || continuedEngagement)) ||
      (signals.positiveLanguage && continuedEngagement && (signals.askedForDemo || signals.askedForPricing)));

  if (handoffTriggered) {
    return {
      shouldHandoff: true,
      status: "ready_to_close",
      reason: buildHandoffReason(signals),
      probability: Math.max(lead.probability, 0.78)
    };
  }

  return {
    shouldHandoff: false,
    status: "warm",
    reason: "Lead is engaged, but the conversation can stay with the agent for now.",
    probability: Math.max(lead.probability, 0.56)
  };
}

export function getLeadHandoffReason(lead: Lead) {
  const latestInbound = lead.conversationHistory.find((event) => event.direction === "inbound");

  if (!latestInbound) {
    return "No inbound buying signal recorded yet.";
  }

  return evaluateLeadHandoff(lead, latestInbound.message, lead.intentScore ?? "neutral").reason;
}

function buildHandoffReason(signals: {
  askedForMaterials: boolean;
  askedForPricing: boolean;
  askedForDemo: boolean;
  askedForNextStep: boolean;
  askedForCommercials: boolean;
  positiveLanguage: boolean;
}) {
  if (signals.askedForNextStep) {
    return "Lead is asking for a direct next step like a call or discussion.";
  }

  if (signals.askedForPricing && signals.askedForDemo) {
    return "Lead asked about both pricing and demo material, which is a strong handoff signal.";
  }

  if (signals.askedForPricing) {
    return "Lead is asking commercial pricing questions and is ready for closer-level handling.";
  }

  if (signals.askedForCommercials) {
    return "Lead is asking operational or commercial questions that usually mean real buying intent.";
  }

  if (signals.askedForMaterials) {
    return "Lead wants more concrete materials and has stayed engaged enough for handoff.";
  }

  if (signals.positiveLanguage) {
    return "Lead is clearly positive and engaged enough to move toward a closing conversation.";
  }

  return "Lead has stayed engaged after early-stage questions and is ready for handoff.";
}

function containsAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}
