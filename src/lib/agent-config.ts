import type { SearchPlay, SourcingCandidate } from "@/lib/types";

export const AUTO_ADD_THRESHOLD = 80;
export const DAILY_AUTO_ADD_TARGET = 20;

export const searchPlays: SearchPlay[] = [
  {
    title: "Longevity Clinics",
    description: "High-fit premium prospects that can position cryo as a bio-optimisation or client-retention offer.",
    searches: [
      "longevity clinic singapore",
      "longevity clinic malaysia",
      "longevity clinic kuala lumpur",
      "longevity clinic petaling jaya",
      "longevity clinic orchard road"
    ]
  },
  {
    title: "Biohacking Centres",
    description: "Often more open to flagship hardware like the HaloX capsule and Antarctica chamber.",
    searches: [
      "biohacking center singapore",
      "biohacking center malaysia",
      "biohacking lab kuala lumpur",
      "human performance center singapore",
      "recovery and biohacking studio malaysia"
    ]
  },
  {
    title: "Summits And Events",
    description: "Not buyers directly, but useful for exposure, partnerships, and exhibitor-style lead capture.",
    searches: [
      "longevity summit singapore",
      "biohacking summit southeast asia",
      "wellness expo malaysia",
      "health optimisation conference singapore",
      "medical wellness summit asia"
    ]
  }
];

export const handoffRules = [
  "Hand over once the lead stays engaged after catalog, pricing, and generic product questions are answered.",
  "Keep responses educational and commercially helpful, but avoid inventing terms or unsupported claims.",
  "Use YouTube demos from Cryonick Wellness Factory when a lead asks for a demo before sales handoff.",
  "Approval remains required for every outbound and inbound message until the system is trusted."
];

export const sourcingCandidates: SourcingCandidate[] = [
  {
    id: "candidate-001",
    businessName: "AgeLess Medical Singapore",
    businessTypeKey: "longevity_clinic",
    businessType: "longevity clinic",
    city: "Singapore",
    source: "Google Places",
    fitScore: 92,
    reason: "Premium longevity positioning and likely high-value audience.",
    address: "Orchard Road, Singapore",
    mapsUrl: "https://maps.google.com"
  },
  {
    id: "candidate-002",
    businessName: "Human Garage KL",
    businessTypeKey: "biohacking_centre",
    businessType: "biohacking centre",
    city: "Kuala Lumpur",
    source: "Google Search",
    fitScore: 89,
    reason: "Strong fit for flagship hardware and experiential recovery offers.",
    address: "Bukit Bintang, Kuala Lumpur",
    mapsUrl: "https://maps.google.com"
  },
  {
    id: "candidate-003",
    businessName: "Wellness Futures Summit Asia",
    businessTypeKey: "wellness_studio",
    businessType: "event",
    city: "Singapore",
    source: "Google Search",
    fitScore: 70,
    reason: "Not a direct buyer, but a strong event lead for partnerships and brand visibility.",
    address: "Marina Bay, Singapore",
    mapsUrl: "https://maps.google.com"
  }
];
