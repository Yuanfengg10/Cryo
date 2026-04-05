import { AUTO_ADD_THRESHOLD, DAILY_AUTO_ADD_TARGET, searchPlays, sourcingCandidates } from "@/lib/agent-config";
import { getGooglePlacesKey, hasGooglePlacesEnv, hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SourcingCandidate, SourcingSnapshot } from "@/lib/types";

const GOOGLE_PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.primaryType",
  "places.types",
  "places.businessStatus"
].join(",");

export async function getSourcingSnapshot(): Promise<SourcingSnapshot> {
  const searchesRun = searchPlays.flatMap((play) => play.searches).slice(0, 6);

  try {
    const baseCandidates = await loadBaseCandidates(searchesRun);
    const importedToday = hasSupabaseEnv() ? await getImportedTodayCount() : 0;
    const remainingToday = Math.max(0, DAILY_AUTO_ADD_TARGET - importedToday);
    const candidates = hasSupabaseEnv()
      ? await annotateCandidateStatuses(baseCandidates, remainingToday)
      : annotateFallbackStatuses(baseCandidates, remainingToday);

    return {
      mode: hasGooglePlacesEnv() ? "live" : "fallback",
      provider: hasGooglePlacesEnv() ? "Google Places API" : "Placeholder candidates",
      candidates,
      searchesRun,
      autoAddedCount: importedToday,
      skippedCount: candidates.filter((candidate) => candidate.fitScore < AUTO_ADD_THRESHOLD).length,
      threshold: AUTO_ADD_THRESHOLD,
      dailyTarget: DAILY_AUTO_ADD_TARGET,
      remainingToday
    };
  } catch (error) {
    console.error("Failed to build sourcing preview:", error);

    return {
      mode: "fallback",
      provider: "Placeholder candidates",
      candidates: annotateFallbackStatuses(sourcingCandidates, DAILY_AUTO_ADD_TARGET),
      searchesRun,
      autoAddedCount: 0,
      skippedCount: sourcingCandidates.length,
      threshold: AUTO_ADD_THRESHOLD,
      dailyTarget: DAILY_AUTO_ADD_TARGET,
      remainingToday: DAILY_AUTO_ADD_TARGET
    };
  }
}

export async function runDailySourcing(): Promise<SourcingSnapshot> {
  const searchesRun = searchPlays.flatMap((play) => play.searches).slice(0, 6);

  if (!hasGooglePlacesEnv()) {
    return {
      mode: "fallback",
      provider: "Placeholder candidates",
      candidates: annotateFallbackStatuses(sourcingCandidates, DAILY_AUTO_ADD_TARGET),
      searchesRun,
      autoAddedCount: 0,
      skippedCount: sourcingCandidates.length,
      threshold: AUTO_ADD_THRESHOLD,
      dailyTarget: DAILY_AUTO_ADD_TARGET,
      remainingToday: DAILY_AUTO_ADD_TARGET
    };
  }

  try {
    const candidates = await loadBaseCandidates(searchesRun);
    const ingestionResult = hasSupabaseEnv()
      ? await ingestQualifiedCandidates(candidates, searchesRun)
      : { autoAddedCount: 0, remainingToday: DAILY_AUTO_ADD_TARGET, addedKeys: new Set<string>() };
    const annotatedCandidates = hasSupabaseEnv()
      ? await annotateCandidateStatuses(candidates, ingestionResult.remainingToday)
      : annotateFallbackStatuses(candidates, ingestionResult.remainingToday);

    return {
      mode: "live",
      provider: "Google Places API",
      candidates: annotatedCandidates.map<SourcingCandidate>((candidate) =>
        ingestionResult.addedKeys.has(getCandidateIdentity(candidate))
          ? { ...candidate, autoAdded: true, autoAddStatus: "auto_added" }
          : candidate
      ),
      searchesRun,
      autoAddedCount: await getImportedTodayCount(),
      skippedCount: candidates.filter((candidate) => candidate.fitScore < AUTO_ADD_THRESHOLD).length,
      threshold: AUTO_ADD_THRESHOLD,
      dailyTarget: DAILY_AUTO_ADD_TARGET,
      remainingToday: ingestionResult.remainingToday
    };
  } catch (error) {
    console.error("Failed to load sourcing candidates from Google Places:", error);

    return {
      mode: "fallback",
      provider: "Placeholder candidates",
      candidates: annotateFallbackStatuses(sourcingCandidates, DAILY_AUTO_ADD_TARGET),
      searchesRun,
      autoAddedCount: 0,
      skippedCount: sourcingCandidates.length,
      threshold: AUTO_ADD_THRESHOLD,
      dailyTarget: DAILY_AUTO_ADD_TARGET,
      remainingToday: DAILY_AUTO_ADD_TARGET
    };
  }
}

async function loadBaseCandidates(searchesRun: string[]) {
  if (!hasGooglePlacesEnv()) {
    return sourcingCandidates;
  }

  const fetchedCandidates = await fetchGooglePlacesCandidates(searchesRun);
  return fetchedCandidates.length ? fetchedCandidates : sourcingCandidates;
}

async function getImportedTodayCount() {
  const supabase = createSupabaseServerClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: runRows, error } = await supabase
    .from("lead_import_runs")
    .select("imported_count")
    .eq("source", "google_places_auto")
    .gte("created_at", todayStart.toISOString());

  if (error) {
    console.error("Failed to read today's sourcing imports:", error.message);
    return 0;
  }

  return (runRows ?? []).reduce((sum, row) => sum + Number(row.imported_count ?? 0), 0);
}

async function annotateCandidateStatuses(candidates: SourcingCandidate[], remainingToday: number): Promise<SourcingCandidate[]> {
  const supabase = createSupabaseServerClient();
  const names = Array.from(new Set(candidates.map((candidate) => candidate.businessName)));
  const { data: existingRows, error } = await supabase
    .from("leads")
    .select("business_name, city, phone")
    .in("business_name", names);

  if (error) {
    console.error("Failed to read existing leads for sourcing preview:", error.message);
    return annotateFallbackStatuses(candidates, remainingToday);
  }

  const existingKeys = new Set(
    (existingRows ?? []).map((row) =>
      getLeadIdentity({
        businessName: String(row.business_name),
        city: String(row.city),
        phone: typeof row.phone === "string" ? row.phone : undefined
      })
    )
  );

  let queueSlots = remainingToday;

  return candidates.map<SourcingCandidate>((candidate) => {
    const existing = existingKeys.has(getLeadIdentity(candidate));

    if (existing) {
      return {
        ...candidate,
        autoAdded: true,
        autoAddStatus: "auto_added"
      };
    }

    if (candidate.fitScore < AUTO_ADD_THRESHOLD) {
      return {
        ...candidate,
        autoAdded: false,
        autoAddStatus: "below_threshold"
      };
    }

    if (queueSlots > 0) {
      queueSlots -= 1;
      return {
        ...candidate,
        autoAdded: false,
        autoAddStatus: "queued"
      };
    }

    return {
      ...candidate,
      autoAdded: false,
      autoAddStatus: "queued"
    };
  });
}

function annotateFallbackStatuses(candidates: SourcingCandidate[], remainingToday: number): SourcingCandidate[] {
  let queueSlots = remainingToday;

  return candidates.map<SourcingCandidate>((candidate) => {
    if (candidate.fitScore < AUTO_ADD_THRESHOLD) {
      return {
        ...candidate,
        autoAdded: false,
        autoAddStatus: "below_threshold"
      };
    }

    if (queueSlots > 0) {
      queueSlots -= 1;
    }

    return {
      ...candidate,
      autoAdded: false,
      autoAddStatus: "queued"
    };
  });
}

async function fetchGooglePlacesCandidates(searches: string[]) {
  const apiKey = getGooglePlacesKey();

  if (!apiKey) {
    return sourcingCandidates;
  }

  const allCandidates: SourcingCandidate[] = [];

  for (const searchText of searches) {
    const response = await fetch(GOOGLE_PLACES_TEXT_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK
      },
      body: JSON.stringify({
        textQuery: searchText,
        pageSize: 5
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Google Places request failed with ${response.status}`);
    }

    const payload = (await response.json()) as {
      places?: GooglePlaceResult[];
    };

    for (const place of payload.places ?? []) {
      const candidate = mapPlaceToCandidate(place, searchText);
      if (candidate) {
        allCandidates.push(candidate);
      }
    }
  }

  return dedupeCandidates(allCandidates).sort((left, right) => right.fitScore - left.fitScore).slice(0, 12);
}

type GooglePlaceResult = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  primaryType?: string;
  types?: string[];
  businessStatus?: string;
};

function mapPlaceToCandidate(place: GooglePlaceResult, matchedQuery: string): SourcingCandidate | null {
  const businessName = place.displayName?.text?.trim();

  if (!businessName || place.businessStatus === "CLOSED_PERMANENTLY") {
    return null;
  }

  const businessType = classifyBusinessType(place, matchedQuery);
  const leadCategory = classifyLeadCategory(place, matchedQuery, businessName);
  const city = extractCity(place.formattedAddress, matchedQuery);
  const fitScore = scoreCandidate(businessType, leadCategory, matchedQuery, place);

  return {
    id: place.id,
    businessName,
    businessTypeKey: normalizeBusinessTypeKey(businessType),
    businessType,
    leadCategory,
    city,
    source: "Google Places",
    fitScore,
    reason: buildReason(businessType, leadCategory, matchedQuery, place),
    address: place.formattedAddress,
    phone: place.nationalPhoneNumber,
    website: place.websiteUri,
    mapsUrl: place.googleMapsUri
  };
}

function classifyLeadCategory(place: GooglePlaceResult, matchedQuery: string, businessName: string): SourcingCandidate["leadCategory"] {
  const haystack = [businessName, matchedQuery, place.primaryType, ...(place.types ?? [])].join(" ").toLowerCase();

  if (
    haystack.includes("competitor") ||
    haystack.includes("cryo built") ||
    haystack.includes("juka") ||
    haystack.includes("vacuactivus distributor")
  ) {
    return "monitor_only_competitor";
  }

  if (
    matchedQuery.toLowerCase().includes("distributor") ||
    haystack.includes("dealer") ||
    haystack.includes("supplier") ||
    haystack.includes("wholesale")
  ) {
    return "distributor";
  }

  if (
    matchedQuery.toLowerCase().includes("marketplace") ||
    matchedQuery.toLowerCase().includes("listing") ||
    matchedQuery.toLowerCase().includes("platform") ||
    haystack.includes("directory")
  ) {
    return "reseller_platform";
  }

  if (
    matchedQuery.toLowerCase().includes("cryotherapy available") ||
    matchedQuery.toLowerCase().includes("recovery zone") ||
    matchedQuery.toLowerCase().includes("performance lab") ||
    matchedQuery.toLowerCase().includes("wellness suite") ||
    matchedQuery.toLowerCase().includes("rehabilitation technology")
  ) {
    return "competitor_customer";
  }

  return "end_user";
}

function classifyBusinessType(place: GooglePlaceResult, matchedQuery: string) {
  const haystack = [matchedQuery, place.primaryType, ...(place.types ?? [])].join(" ").toLowerCase();

  if (haystack.includes("longevity")) {
    return "longevity clinic";
  }

  if (haystack.includes("biohack") || haystack.includes("human performance")) {
    return "biohacking centre";
  }

  if (haystack.includes("spa")) {
    return "spa";
  }

  if (haystack.includes("gym") || haystack.includes("fitness")) {
    return "gym";
  }

  if (haystack.includes("clinic") || haystack.includes("medical")) {
    return "clinic";
  }

  if (haystack.includes("sports")) {
    return "sports centre";
  }

  return "wellness studio";
}

function normalizeBusinessTypeKey(businessType: string): SourcingCandidate["businessTypeKey"] {
  if (businessType === "longevity clinic") {
    return "longevity_clinic";
  }

  if (businessType === "biohacking centre") {
    return "biohacking_centre";
  }

  if (businessType === "gym") {
    return "gym";
  }

  if (businessType === "clinic") {
    return "clinic";
  }

  if (businessType === "spa") {
    return "spa";
  }

  if (businessType === "sports centre") {
    return "sports_centre";
  }

  return "wellness_studio";
}

function extractCity(formattedAddress: string | undefined, matchedQuery: string) {
  const lowerQuery = matchedQuery.toLowerCase();

  if (lowerQuery.includes("singapore")) {
    return "Singapore";
  }

  if (lowerQuery.includes("kuala lumpur")) {
    return "Kuala Lumpur";
  }

  if (lowerQuery.includes("petaling jaya")) {
    return "Petaling Jaya";
  }

  if (lowerQuery.includes("malaysia")) {
    return "Malaysia";
  }

  if (!formattedAddress) {
    return "Unknown";
  }

  const parts = formattedAddress.split(",").map((part) => part.trim());
  return parts.at(-2) ?? parts.at(-1) ?? "Unknown";
}

function scoreCandidate(
  businessType: string,
  leadCategory: SourcingCandidate["leadCategory"],
  matchedQuery: string,
  place: GooglePlaceResult
) {
  let score = 55;

  if (businessType === "longevity clinic" || businessType === "biohacking centre") {
    score += 20;
  }

  if (leadCategory === "end_user") {
    score += 8;
  }

  if (leadCategory === "competitor_customer") {
    score += 12;
  }

  if (leadCategory === "distributor") {
    score += 2;
  }

  if (leadCategory === "reseller_platform") {
    score -= 8;
  }

  if (leadCategory === "monitor_only_competitor") {
    score -= 30;
  }

  if (matchedQuery.toLowerCase().includes("summit") || matchedQuery.toLowerCase().includes("expo")) {
    score -= 18;
  }

  if (place.nationalPhoneNumber) {
    score += 10;
  }

  if (place.websiteUri) {
    score += 5;
  }

  return Math.max(0, Math.min(98, score));
}

function buildReason(
  businessType: string,
  leadCategory: SourcingCandidate["leadCategory"],
  matchedQuery: string,
  place: GooglePlaceResult
) {
  const reasons = [];

  if (businessType === "longevity clinic" || businessType === "biohacking centre") {
    reasons.push("Direct fit for longevity and flagship cryo positioning.");
  }

  if (leadCategory === "distributor") {
    reasons.push("Looks more like a distributor or dealer opportunity than a direct end-user.");
  }

  if (leadCategory === "reseller_platform") {
    reasons.push("Looks like a listing or reseller platform worth evaluating for exposure or supplier onboarding.");
  }

  if (leadCategory === "competitor_customer") {
    reasons.push("Possible current user of similar equipment and may be open to upgrade or expansion.");
  }

  if (leadCategory === "monitor_only_competitor") {
    reasons.push("Treat as monitor-only competitor lead. Do not share sensitive materials.");
  }

  if (place.nationalPhoneNumber) {
    reasons.push("Phone number available for direct outreach.");
  }

  if (matchedQuery.toLowerCase().includes("summit") || matchedQuery.toLowerCase().includes("expo")) {
    reasons.push("More useful as an event or partnership opportunity than a direct buyer.");
  }

  return reasons.join(" ") || "Matches current target segments for cryotherapy equipment outreach.";
}

function dedupeCandidates(candidates: SourcingCandidate[]) {
  const deduped = new Map<string, SourcingCandidate>();

  for (const candidate of candidates) {
    const fallbackKey = `${candidate.businessName.toLowerCase()}::${candidate.city.toLowerCase()}`;
    const key = candidate.id || fallbackKey;
    const existing = deduped.get(key);

    if (!existing) {
      deduped.set(key, candidate);
      continue;
    }

    deduped.set(key, {
      ...existing,
      ...candidate,
      fitScore: Math.max(existing.fitScore, candidate.fitScore),
      reason: existing.reason.length >= candidate.reason.length ? existing.reason : candidate.reason,
      address: existing.address || candidate.address,
      phone: existing.phone || candidate.phone,
      website: existing.website || candidate.website,
      mapsUrl: existing.mapsUrl || candidate.mapsUrl
    });
  }

  return Array.from(deduped.values());
}

async function ingestQualifiedCandidates(candidates: SourcingCandidate[], searchesRun: string[]) {
  const qualified = candidates.filter(
    (candidate) =>
      candidate.fitScore >= AUTO_ADD_THRESHOLD &&
      candidate.businessType !== "event" &&
      candidate.leadCategory !== "monitor_only_competitor" &&
      candidate.leadCategory !== "reseller_platform"
  );

  if (!qualified.length) {
    return { autoAddedCount: 0, remainingToday: DAILY_AUTO_ADD_TARGET, addedKeys: new Set<string>() };
  }

  const supabase = createSupabaseServerClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: runRows, error: runError } = await supabase
    .from("lead_import_runs")
    .select("imported_count")
    .eq("source", "google_places_auto")
    .gte("created_at", todayStart.toISOString());

  if (runError) {
    console.error("Failed to read daily auto-add runs:", runError.message);
  }

  const alreadyAddedToday = (runRows ?? []).reduce((sum, row) => sum + Number(row.imported_count ?? 0), 0);
  const remainingToday = Math.max(0, DAILY_AUTO_ADD_TARGET - alreadyAddedToday);

  if (!remainingToday) {
    return { autoAddedCount: 0, remainingToday: 0, addedKeys: new Set<string>() };
  }

  const limitedQualified = qualified.slice(0, remainingToday);
  const payload = limitedQualified.map((candidate) => ({
    business_name: candidate.businessName,
    business_type: candidate.businessTypeKey,
    city: candidate.city,
    phone: candidate.phone || `unknown-${candidate.id}`,
    status: "new",
    lead_type: "cold",
    notes: [candidate.reason, candidate.address ? `Address: ${candidate.address}` : "", candidate.website ? `Website: ${candidate.website}` : ""]
      .filter(Boolean)
      .join("\n"),
    probability: getDefaultProbability(candidate.businessTypeKey),
    projected_commission_eur: getDefaultCommission(candidate.businessTypeKey)
  }));

  const { data, error } = await supabase
    .from("leads")
    .upsert(payload, {
      onConflict: "business_name,city,phone",
      ignoreDuplicates: true
    })
    .select("id");

  if (error) {
    console.error("Failed to auto-ingest qualified sourcing candidates:", error.message);
    return { autoAddedCount: 0, remainingToday, addedKeys: new Set<string>() };
  }

  const autoAddedCount = data?.length ?? 0;

  if (autoAddedCount > 0) {
    await supabase.from("lead_import_runs").insert({
      source: "google_places_auto",
      query_scope: {
        searches: searchesRun,
        threshold: AUTO_ADD_THRESHOLD
      },
      imported_count: autoAddedCount
    });
  }

  return {
    autoAddedCount,
    remainingToday: Math.max(0, remainingToday - autoAddedCount),
    addedKeys: new Set(limitedQualified.map(getCandidateIdentity))
  };
}

function getCandidateIdentity(candidate: SourcingCandidate) {
  return `${candidate.id}::${candidate.businessName.toLowerCase()}::${candidate.city.toLowerCase()}`;
}

function getLeadIdentity(candidate: Pick<SourcingCandidate, "businessName" | "city" | "phone">) {
  return `${candidate.businessName.toLowerCase()}::${candidate.city.toLowerCase()}::${(candidate.phone ?? "").toLowerCase()}`;
}

function getDefaultCommission(businessType: SourcingCandidate["businessTypeKey"]) {
  if (businessType === "longevity_clinic" || businessType === "biohacking_centre") {
    return 4800;
  }

  if (businessType === "clinic" || businessType === "sports_centre") {
    return 4200;
  }

  return 3000;
}

function getDefaultProbability(businessType: SourcingCandidate["businessTypeKey"]) {
  if (businessType === "longevity_clinic" || businessType === "biohacking_centre") {
    return 0.4;
  }

  if (businessType === "clinic" || businessType === "gym") {
    return 0.32;
  }

  return 0.24;
}
