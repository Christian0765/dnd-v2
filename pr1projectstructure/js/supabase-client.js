// supabase-client.js
// Single source of truth for Supabase client initialization.
// Include this before any other /js/ files on every page.
// Requires: supabase CDN script + supabase-config.js

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
