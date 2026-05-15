// Single shared Supabase client — service key, server-only.
// Lazy-initialized so missing env at build time doesn't crash imports.
import { createClient } from '@supabase/supabase-js';

let _client = null;

export function getSupabase() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('Supabase env vars missing — check SUPABASE_URL and SUPABASE_SERVICE_KEY');
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'studora-api' } },
  });
  return _client;
}
