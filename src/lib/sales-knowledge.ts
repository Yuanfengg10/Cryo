export const companyProfile = {
  companyName: "Cryonick Wellness Factory",
  youtubeChannel: "http://www.youtube.com/@Vacuactivus",
  primaryProducts: [
    "Revique HaloX longevity capsule",
    "Antarctica cryotherapy chamber"
  ]
};

export const commercialTerms = {
  shipping: {
    singaporePortEurPerCrate: "EUR 1250-1560 per crate",
    note: "Final shipping depends on destination point."
  },
  payment: {
    standard: "100% bank transfer before shipping out.",
    madeToOrder:
      "If equipment is out of stock and manufacturing is required, payment is 30% down to start production and 70% when the order is ready to ship."
  }
};

import type { Lead } from "@/lib/types";

export const quickAnswerLibrary = [
  {
    id: "pricing",
    question: "How much is it?",
    answer:
      "Price depends on the equipment setup, so I normally narrow it down based on what makes sense for the client's use case first. Once that's clear, I can share the relevant pricing properly."
  },
  {
    id: "equipment",
    question: "What equipment do you have?",
    answer:
      "The higher-interest products right now are the Revique HaloX longevity capsule and the Antarctica cryotherapy chamber, along with other cryotherapy and recovery equipment depending on the setup."
  },
  {
    id: "demo",
    question: "Do you have a demo?",
    answer:
      "Yes. The easiest starting point is our YouTube channel, where you can see the equipment and concept in action: http://www.youtube.com/@Vacuactivus"
  },
  {
    id: "shipping",
    question: "How much is shipping?",
    answer:
      "Shipping depends on destination, but as a rough reference, sea freight to Singapore port is usually around EUR 1250-1560 per crate."
  },
  {
    id: "payment",
    question: "What are the payment terms?",
    answer:
      "Standard terms are 100% bank transfer before shipping out. If the equipment is not in stock and manufacturing is required, it is 30% down payment to start production and 70% when the order is ready to ship."
  }
];

export function buildSuggestedReply(questionId: string) {
  const item = quickAnswerLibrary.find((entry) => entry.id === questionId);

  if (!item) {
    return "";
  }

  return `Hi, ${item.answer}\n\nHappy to share more if useful.`;
}

export function buildKnowledgeReplyDraft(lead: Lead, questionId: string) {
  const greeting = lead.contactName && !lead.contactName.toLowerCase().includes("team")
    ? `Hi ${lead.contactName},`
    : `Hi ${lead.businessName} team,`;

  const productHint = getSuggestedProductHint(lead.businessType);
  const intro = "thanks for the message.";

  switch (questionId) {
    case "pricing":
      return `${greeting}\n\n${intro} Price depends on the equipment setup and what would make the most sense for your space, so I usually narrow that down first before quoting properly.${productHint ? ` ${productHint}` : ""}\n\nHappy to share more if useful.`;
    case "equipment":
      return `${greeting}\n\n${intro} The higher-interest products on our side right now are the Revique HaloX longevity capsule and the Antarctica cryotherapy chamber, along with other cryotherapy and recovery equipment depending on the setup.${productHint ? ` ${productHint}` : ""}\n\nHappy to share more if useful.`;
    case "demo":
      return `${greeting}\n\n${intro} Yes, we do. The easiest starting point is our YouTube channel, where you can see the equipment and overall concept in action: ${companyProfile.youtubeChannel}\n\nIf useful, I can also point you toward the most relevant product direction for your space.`;
    case "shipping":
      return `${greeting}\n\n${intro} Shipping depends on destination, but as a rough reference, sea freight to Singapore port is usually around ${commercialTerms.shipping.singaporePortEurPerCrate}.`;
    case "payment":
      return `${greeting}\n\n${intro} Standard terms are ${commercialTerms.payment.standard} If the equipment is out of stock and manufacturing is required, then it is ${commercialTerms.payment.madeToOrder}`;
    default:
      return `${greeting}\n\n${intro} Happy to share more details if useful.`;
  }
}

function getSuggestedProductHint(businessType: Lead["businessType"]) {
  if (businessType === "longevity_clinic" || businessType === "biohacking_centre") {
    return "For your segment, the HaloX longevity capsule or Antarctica chamber would usually be the first things I'd discuss.";
  }

  if (businessType === "clinic") {
    return "For clinics, it usually depends on whether the focus is patient recovery or a more premium flagship setup.";
  }

  if (businessType === "gym" || businessType === "sports_centre") {
    return "For performance-focused spaces, I would usually frame it around recovery use, member experience, and commercial upside.";
  }

  return "";
}
