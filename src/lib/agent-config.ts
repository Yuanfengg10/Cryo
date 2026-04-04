import type { SearchPlay, SourcingCandidate } from "@/lib/types";

export const AUTO_ADD_THRESHOLD = 80;
export const DAILY_AUTO_ADD_TARGET = 20;

export const searchPlays: SearchPlay[] = [
  {
    title: "Premium End-Users",
    description: "Direct buyer segments from the manual: gyms, clinics, longevity operators, premium wellness and recovery businesses.",
    searches: [
      "premium gym singapore cryotherapy",
      "sports rehabilitation center singapore",
      "longevity clinic singapore",
      "medspa malaysia longevity",
      "recovery studio kuala lumpur",
      "physiotherapy chain malaysia sports rehab"
    ]
  },
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
    title: "Hotels And Resorts",
    description: "Luxury hospitality operators that fit premium wellness, guest experience, and longevity package positioning.",
    searches: [
      "luxury wellness hotel singapore",
      "5 star hotel spa singapore",
      "luxury resort wellness malaysia",
      "destination wellness retreat malaysia",
      "executive health center singapore"
    ]
  },
  {
    title: "Distributors And Dealers",
    description: "Local equipment distributors and dealer networks that may extend their portfolio after management approval.",
    searches: [
      "wellness equipment distributor singapore",
      "rehabilitation equipment distributor malaysia",
      "fitness equipment dealer singapore premium",
      "biohacking equipment supplier malaysia",
      "clinic equipment distributor kuala lumpur"
    ]
  },
  {
    title: "Reseller Platforms",
    description: "Marketplaces, listing sites, and reseller platforms that can distribute products or generate local exposure.",
    searches: [
      "wellness equipment marketplace singapore",
      "fitness equipment reseller malaysia",
      "rehab equipment listing site singapore",
      "biohacking equipment platform asia",
      "premium wellness equipment supplier directory malaysia"
    ]
  },
  {
    title: "Competitor Customers",
    description: "Current users of similar equipment who may be ready to upgrade, expand, or replace their supplier.",
    searches: [
      "\"cryotherapy available\" singapore gym",
      "\"new recovery zone\" malaysia",
      "\"performance lab\" singapore cryotherapy",
      "\"wellness suite\" malaysia recovery",
      "\"rehabilitation technology\" singapore clinic"
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
  "Approval remains required for every outbound and inbound message until the system is trusted.",
  "Do not share pricing, catalogs, or internal documents with direct competitors.",
  "Prefer named decision-makers over generic reception contacts whenever possible."
];

export const leadQualificationChecklist = [
  "Market fit: premium wellness, fitness, rehab, sports, hospitality, longevity, or biohacking segment",
  "Budget potential: business appears capable of investing in premium equipment",
  "Decision-maker access: named person, direct email, phone, LinkedIn, or strong role match",
  "Need signal: expansion, competitor equipment, premium differentiation, renovation, or recovery positioning",
  "Channel type: reseller platform, distributor, end-user, or competitor to monitor",
  "Risk check: do not treat direct competitors like normal commercial leads"
];

export const weeklyOperatingStandard = [
  "Review 30 to 50 new companies or market sources each week",
  "Add 15 to 25 qualified leads each week",
  "Prioritise direct outreach to highest-fit leads",
  "Report reseller platforms, distributors, competitor findings, and current-user prospects",
  "Confirm named decision-makers before warm-up or e-blast style campaigns"
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
