import { isBefore, isToday, parseISO } from "date-fns";

import { getAnthropicKey, hasAnthropicEnv } from "@/lib/env";
import { aiSalesGuardrails, buildSalesKnowledgeContext } from "@/lib/sales-knowledge";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApprovalDraft, Lead } from "@/lib/types";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const AI_DRAFT_LIMIT = 8;

const introByType: Record<Lead["businessType"], string[]> = {
  gym: [
    "Yuan here from Cryonick Wellness Factory.",
    "I'm Yuan from Cryonick Wellness Factory.",
    "Yuan here, I work with Cryonick Wellness Factory."
  ],
  clinic: [
    "Yuan here from Cryonick Wellness Factory.",
    "I'm Yuan from Cryonick Wellness Factory.",
    "Yuan here, I work with Cryonick Wellness Factory."
  ],
  spa: [
    "Yuan here from Cryonick Wellness Factory.",
    "I'm Yuan from Cryonick Wellness Factory.",
    "Yuan here, I work with Cryonick Wellness Factory."
  ],
  wellness_studio: [
    "Yuan here from Cryonick Wellness Factory.",
    "I'm Yuan from Cryonick Wellness Factory.",
    "Yuan here, I work with Cryonick Wellness Factory."
  ],
  sports_centre: [
    "Yuan here from Cryonick Wellness Factory.",
    "I'm Yuan from Cryonick Wellness Factory.",
    "Yuan here, I work with Cryonick Wellness Factory."
  ],
  longevity_clinic: [
    "Yuan here from Cryonick Wellness Factory.",
    "I'm Yuan from Cryonick Wellness Factory.",
    "Yuan here, I work with Cryonick Wellness Factory."
  ],
  biohacking_centre: [
    "Yuan here from Cryonick Wellness Factory.",
    "I'm Yuan from Cryonick Wellness Factory.",
    "Yuan here, I work with Cryonick Wellness Factory."
  ]
};

const bodyByType: Record<Lead["businessType"], string[]> = {
  gym: [
    "Been seeing more premium gyms add cryo and recovery equipment as a retention play, not just a nice-to-have.",
    "I've noticed some clubs use recovery as the thing that separates them from a standard membership offer.",
    "Recovery seems to be becoming a much stronger commercial story for gyms lately."
  ],
  clinic: [
    "Been seeing more clinics look at cryo for both patient recovery and a stronger treatment offer.",
    "Some sports rehab clinics are using cryo as a practical add-on rather than just a gimmick.",
    "Cryo seems to be getting more attention from clinics that want a stronger recovery conversation."
  ],
  spa: [
    "Been seeing some premium spas use cryo to make the treatment menu feel more current and differentiated.",
    "I've noticed more spas add cold-based recovery or facial concepts as part of a higher-end offer.",
    "A few wellness-led spas are using cryo to give clients something newer than the usual menu."
  ],
  wellness_studio: [
    "Been seeing more wellness studios look for hardware that feels premium without becoming too clinical.",
    "I've noticed some studios use cryo to make the client experience feel more elevated.",
    "A lot of the stronger studios seem to be adding one standout modality rather than lots of smaller things."
  ],
  sports_centre: [
    "Been seeing more performance-focused centres look at cryo as part of a stronger recovery setup.",
    "I've noticed some sports centres use recovery equipment to make their facility offer feel more complete.",
    "Recovery seems to be becoming part of the core story for performance environments."
  ],
  longevity_clinic: [
    "Been seeing more longevity clinics add flagship recovery hardware as part of the overall optimisation story.",
    "I've noticed longevity clinics leaning more into cryo and recovery-led hardware lately.",
    "A few longevity-focused operators are using cryo as part of a more premium bio-optimisation stack."
  ],
  biohacking_centre: [
    "Been seeing more biohacking spaces add flagship recovery hardware as part of the experience.",
    "I've noticed some biohacking studios use cryo as a serious client acquisition story, not just a gadget.",
    "A lot of biohacking spaces seem to be moving toward one or two signature hardware pieces rather than lots of smaller tools."
  ]
};

const closeByType: Record<Lead["businessType"], string[]> = {
  gym: [
    "Not sure if that's something you've looked at before?",
    "Curious if that could be relevant on your side?",
    "Would that kind of angle make sense for you?"
  ],
  clinic: [
    "Not sure if you've explored that already?",
    "Curious if that could be relevant on your side?",
    "Happy to share more if useful."
  ],
  spa: [
    "Not sure if that would be relevant for your space?",
    "Curious if you've considered that kind of addition before?",
    "Happy to share more if useful."
  ],
  wellness_studio: [
    "Not sure if that would be worth exploring on your side?",
    "Curious if that's already something you've thought about?",
    "Happy to share more if useful."
  ],
  sports_centre: [
    "Not sure if that would be useful for your setup?",
    "Curious if that's already on your radar?",
    "Happy to share more if relevant."
  ],
  longevity_clinic: [
    "Not sure if that's something you're already exploring?",
    "Curious if that could be relevant on your side?",
    "Happy to share more if useful."
  ],
  biohacking_centre: [
    "Not sure if that's already on your roadmap?",
    "Curious if that could be relevant for what you're building?",
    "Happy to share more if useful."
  ]
};

export async function buildApprovalDrafts(leads: Lead[]) {
  const fallbackDrafts = buildFallbackApprovalDrafts(leads);

  if (!hasAnthropicEnv()) {
    return fallbackDrafts;
  }

  const apiKey = getAnthropicKey();

  if (!apiKey) {
    return fallbackDrafts;
  }

  const styleExamples = await loadRecentApprovedEditExamples();

  const aiDrafts = await Promise.all(
    fallbackDrafts.map(async (draft, index) => {
      if (index >= AI_DRAFT_LIMIT) {
        return draft;
      }

      const lead = leads.find((item) => item.id === draft.leadId);

      if (!lead) {
        return draft;
      }

      const generatedMessage = await generateAiApprovalMessage({
        lead,
        draft,
        apiKey,
        styleExamples
      });

      return {
        ...draft,
        message: generatedMessage ?? draft.message,
        draftSource: generatedMessage ? ("anthropic" as const) : ("template" as const)
      } satisfies ApprovalDraft;
    })
  );

  return aiDrafts;
}

export function buildFallbackApprovalDrafts(leads: Lead[]) {
  const firstContactDrafts = leads
    .filter((lead) => lead.status === "new" && lead.leadType === "cold")
    .slice(0, 20)
    .map(toOutboundDraft);

  const followUpDrafts = leads
    .filter(shouldGenerateFollowUpDraft)
    .slice(0, 20)
    .map(toFollowUpDraft);

  return [...firstContactDrafts, ...followUpDrafts];
}

function toOutboundDraft(lead: Lead): ApprovalDraft {
  return {
    id: `outbound-${lead.id}`,
    type: "outbound",
    leadId: lead.id,
    leadName: lead.businessName,
    city: lead.city,
    businessType: lead.businessType.replaceAll("_", " "),
    reason: buildReason(lead),
    message: buildOpeningMessage(lead)
  };
}

function toFollowUpDraft(lead: Lead): ApprovalDraft {
  const outboundCount = lead.conversationHistory.filter((event) => event.direction === "outbound").length;
  const cadenceType = lead.leadType === "warm" || lead.status === "warm" || lead.status === "ready_to_close" ? "warm" : "cold";
  const sequenceNumber = outboundCount + 1;

  return {
    id: `followup-${lead.id}-${sequenceNumber}`,
    type: "followup",
    leadId: lead.id,
    leadName: lead.businessName,
    city: lead.city,
    businessType: lead.businessType.replaceAll("_", " "),
    reason: buildFollowUpReason(lead, outboundCount),
    message: buildFollowUpMessage(lead, outboundCount),
    cadenceType,
    nextStatus: cadenceType === "warm" ? "warm" : "followup_due",
    nextFollowUpDays: cadenceType === "warm" ? 2 : outboundCount >= 2 ? 5 : 4,
    sequenceNumber
  };
}

function buildReason(lead: Lead) {
  if (lead.businessType === "longevity_clinic" || lead.businessType === "biohacking_centre") {
    return "Fresh high-fit lead in a priority segment for HaloX and Antarctica positioning.";
  }

  return "Fresh lead with no outreach yet. Ready for first-contact approval.";
}

function buildFollowUpReason(lead: Lead, outboundCount: number) {
  const lastInbound = getLatestConversationByDirection(lead, "inbound");
  const topic = lastInbound ? getConversationTopicLabel(lastInbound.message) : null;

  if (lead.leadType === "warm" || lead.status === "warm" || lead.status === "ready_to_close") {
    return topic
      ? `Warm lead due for a light check-in after asking about ${topic}.`
      : "Warm lead due for a light check-in so the conversation keeps moving without feeling pushy.";
  }

  if (outboundCount <= 1) {
    return topic
      ? `Initial outreach went out and this lead is now due for the first follow-up around ${topic}.`
      : "Initial outreach went out and this lead is now due for the first follow-up.";
  }

  return "This lead has already had an opener and one nudge, so the next follow-up should stay light and low-pressure.";
}

function buildOpeningMessage(lead: Lead) {
  const greeting = buildGreeting(lead);
  const intro = pick(introByType[lead.businessType], `${lead.id}-intro`);
  const body = pick(bodyByType[lead.businessType], `${lead.id}-body`);
  const close = pick(closeByType[lead.businessType], `${lead.id}-close`);
  const cityHint = lead.city === "Singapore" ? " in Singapore" : lead.city === "Kuala Lumpur" ? " in KL" : "";
  const noteHint = buildNoteHint(lead.notes);

  return `${greeting} ${intro}\n\n${body}${cityHint}${noteHint}\n\n${close}`;
}

function buildFollowUpMessage(lead: Lead, outboundCount: number) {
  const greeting = buildGreeting(lead);
  const lastInbound = getLatestConversationByDirection(lead, "inbound");
  const lastOutbound = getLatestConversationByDirection(lead, "outbound");
  const followUpContext = buildFollowUpContext(lastInbound?.message, lead);

  if (lead.leadType === "warm" || lead.status === "warm" || lead.status === "ready_to_close") {
    return `${greeting}\n\nJust checking back in since we last spoke.${followUpContext} Happy to answer anything else around setup, pricing, shipping, or which equipment would make the most sense for your space.\n\nIf useful, I can also point you toward the most relevant demo direction for your team.`;
  }

  if (outboundCount <= 1) {
    const previousAngle = lastOutbound ? buildOutboundReference(lastOutbound.message) : "";
    return `${greeting}\n\nJust following up on my earlier message in case it got buried.${previousAngle} We work with operators looking at cryotherapy equipment for recovery, premium positioning, and stronger client retention.\n\nHappy to send a short overview if useful.`;
  }

  return `${greeting}\n\nJust a light follow-up from my side.${followUpContext || " If cryotherapy equipment is something you're considering this year, happy to share the most relevant product direction and a quick demo link."}\n\nIf not a priority right now, no worries at all.`;
}

function buildGreeting(lead: Lead) {
  if (lead.contactName && !lead.contactName.toLowerCase().includes("team")) {
    return `Hi ${lead.contactName},`;
  }

  return `Hi ${lead.businessName} team,`;
}

function shouldGenerateFollowUpDraft(lead: Lead) {
  if (!lead.followUpDueAt) {
    return false;
  }

  if (!(lead.status === "contacted" || lead.status === "followup_due" || lead.status === "warm" || lead.status === "ready_to_close")) {
    return false;
  }

  const dueDate = parseISO(lead.followUpDueAt);
  return isToday(dueDate) || isBefore(dueDate, new Date());
}

function getLatestConversationByDirection(lead: Lead, direction: "outbound" | "inbound") {
  return lead.conversationHistory.find((event) => event.direction === direction);
}

function buildFollowUpContext(lastInboundMessage: string | undefined, lead: Lead) {
  if (!lastInboundMessage) {
    return "";
  }

  const lower = lastInboundMessage.toLowerCase();

  if (lower.includes("price") || lower.includes("pricing") || lower.includes("cost") || lower.includes("how much")) {
    return " Just picking up on your pricing question from earlier.";
  }

  if (lower.includes("demo") || lower.includes("video") || lower.includes("youtube")) {
    return " Just picking up on your question about demo material.";
  }

  if (lower.includes("ship") || lower.includes("freight") || lower.includes("delivery")) {
    return " Just picking up on the shipping side from your earlier message.";
  }

  if (lower.includes("payment") || lower.includes("deposit") || lower.includes("terms")) {
    return " Just picking up on the payment terms question from earlier.";
  }

  if (lower.includes("footprint") || lower.includes("space") || lower.includes("room")) {
    return " Just picking up on your earlier question around space and setup.";
  }

  if (lower.includes("support") || lower.includes("service") || lower.includes("installation")) {
    return " Just picking up on your earlier question around support and setup.";
  }

  if (lower.includes("roi") || lower.includes("revenue") || lower.includes("return")) {
    return " Just picking up on the commercial side you asked about earlier.";
  }

  if (lower.includes("chamber") || lower.includes("capsule") || lower.includes("equipment") || lower.includes("machine")) {
    return ` Just picking up on the equipment direction that could make sense for ${lead.businessName}.`;
  }

  return " Just picking up on your earlier message.";
}

function buildOutboundReference(lastOutboundMessage: string) {
  const cleaned = normalizeMessageSnippet(lastOutboundMessage);

  if (!cleaned) {
    return "";
  }

  return ` I had reached out previously around ${cleaned}.`;
}

function getConversationTopicLabel(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("price") || lower.includes("pricing") || lower.includes("cost") || lower.includes("how much")) {
    return "pricing";
  }

  if (lower.includes("demo") || lower.includes("video") || lower.includes("youtube")) {
    return "demo material";
  }

  if (lower.includes("ship") || lower.includes("freight") || lower.includes("delivery")) {
    return "shipping";
  }

  if (lower.includes("payment") || lower.includes("deposit") || lower.includes("terms")) {
    return "payment terms";
  }

  if (lower.includes("footprint") || lower.includes("space") || lower.includes("room")) {
    return "space and setup";
  }

  if (lower.includes("support") || lower.includes("service") || lower.includes("installation")) {
    return "support and installation";
  }

  if (lower.includes("roi") || lower.includes("revenue") || lower.includes("return")) {
    return "commercial upside";
  }

  if (lower.includes("equipment") || lower.includes("machine") || lower.includes("chamber") || lower.includes("capsule")) {
    return "equipment fit";
  }

  return "their earlier question";
}

function normalizeMessageSnippet(message: string) {
  const cleaned = message
    .replace(/\.$/, "")
    .replace(/^reached out with\s+/i, "")
    .replace(/^initial\s+/i, "")
    .replace(/^introduced\s+/i, "")
    .trim()
    .toLowerCase();

  if (!cleaned) {
    return "";
  }

  return cleaned;
}

function buildNoteHint(notes: string) {
  const lower = notes.toLowerCase();

  if (lower.includes("premium")) {
    return " Especially for more premium-positioned operators.";
  }

  if (lower.includes("recovery")) {
    return " Especially where recovery is already part of the conversation.";
  }

  if (lower.includes("longevity") || lower.includes("bio")) {
    return " Especially where longevity is part of the positioning.";
  }

  return "";
}

async function generateAiApprovalMessage({
  lead,
  draft,
  apiKey,
  styleExamples
}: {
  lead: Lead;
  draft: ApprovalDraft;
  apiKey: string;
  styleExamples: string[];
}) {
  const systemPrompt = [
    "You are a WhatsApp sales drafting assistant for Cryonick Wellness Factory.",
    ...aiSalesGuardrails.map((rule) => `- ${rule}`),
    "- Keep outbound drafts natural, clear, and commercially credible.",
    "- Avoid sounding like a marketing brochure.",
    "- Do not use bullet points or markdown.",
    "- Keep messages suitable for a first WhatsApp touch or a light follow-up."
  ].join("\n");

  const lastInbound = getLatestConversationByDirection(lead, "inbound");
  const lastOutbound = getLatestConversationByDirection(lead, "outbound");

  const userPrompt = [
    buildSalesKnowledgeContext(lead),
    `Draft type: ${draft.type === "outbound" ? "first outreach" : "follow-up"}`,
    `Lead status: ${lead.status}`,
    `Lead type: ${lead.leadType}`,
    `Reason for draft: ${draft.reason}`,
    `Existing fallback draft: ${draft.message}`,
    `Last outbound message: ${lastOutbound?.message ?? "None"}`,
    `Last inbound message: ${lastInbound?.message ?? "None"}`,
    styleExamples.length
      ? `Recent approved edit examples to match in tone:\n${styleExamples.map((example, index) => `${index + 1}. ${example}`).join("\n")}`
      : "Recent approved edit examples to match in tone: None yet.",
    "Write one WhatsApp message only.",
    "Include a greeting.",
    "Introduce Yuan from Cryonick Wellness Factory naturally when it is the first outreach.",
    "If it is a follow-up, make it feel like a continuation of the conversation.",
    "Keep it roughly 55 to 120 words.",
    "Close with a soft next step."
  ].join("\n\n");

  try {
    const response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 220,
        temperature: 0.55,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt
          }
        ]
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic outbound/follow-up generation failed:", errorText);
      return null;
    }

    const payload = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };

    const generatedMessage = payload.content
      ?.filter((item) => item.type === "text" && item.text)
      .map((item) => item.text?.trim())
      .filter(Boolean)
      .join("\n\n");

    return generatedMessage || null;
  } catch (error) {
    console.error("Anthropic outbound/follow-up generation crashed:", error);
    return null;
  }
}

async function loadRecentApprovedEditExamples() {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("message_generations")
      .select("generated_message, edited_message")
      .not("edited_message", "is", null)
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) {
      console.error("Failed to load recent approved edit examples:", error.message);
      return [];
    }

    return (data ?? [])
      .map((row) => String(row.edited_message ?? "").trim())
      .filter(Boolean);
  } catch (error) {
    console.error("Failed to build style examples:", error);
    return [];
  }
}

function pick(options: string[], seed: string) {
  const index = Math.abs(hash(seed)) % options.length;
  return options[index];
}

function hash(value: string) {
  let result = 0;

  for (let index = 0; index < value.length; index += 1) {
    result = (result << 5) - result + value.charCodeAt(index);
    result |= 0;
  }

  return result;
}
