import { isBefore, isToday, parseISO } from "date-fns";

import type { ApprovalDraft, Lead } from "@/lib/types";

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

export function buildOutboundDrafts(leads: Lead[]) {
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
  if (lead.leadType === "warm" || lead.status === "warm" || lead.status === "ready_to_close") {
    return "Warm lead due for a light check-in so the conversation keeps moving without feeling pushy.";
  }

  if (outboundCount <= 1) {
    return "Initial outreach went out and this lead is now due for the first follow-up.";
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

  if (lead.leadType === "warm" || lead.status === "warm" || lead.status === "ready_to_close") {
    return `${greeting}\n\nJust checking back in since we last spoke. Happy to answer anything else around setup, pricing, shipping, or which equipment would make the most sense for your space.\n\nIf useful, I can also point you toward the most relevant demo direction for your team.`;
  }

  if (outboundCount <= 1) {
    return `${greeting}\n\nJust following up on my earlier message in case it got buried. We work with operators looking at cryotherapy equipment for recovery, premium positioning, and stronger client retention.\n\nHappy to send a short overview if useful.`;
  }

  return `${greeting}\n\nJust a light follow-up from my side. If cryotherapy equipment is something you're considering this year, happy to share the most relevant product direction and a quick demo link.\n\nIf not a priority right now, no worries at all.`;
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
