export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabaseKey());
}

export function getSupabaseKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function hasGooglePlacesEnv() {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

export function getGooglePlacesKey() {
  return process.env.GOOGLE_PLACES_API_KEY;
}

export function getCronSecret() {
  return process.env.CRON_SECRET;
}

export function hasAnthropicEnv() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getAnthropicKey() {
  return process.env.ANTHROPIC_API_KEY;
}
