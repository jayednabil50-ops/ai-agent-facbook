import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://knfixatinuivgirybnew.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuZml4YXRpbnVpdmdpcnlibmV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTI4MDQsImV4cCI6MjA5MTkyODgwNH0.1Qxbu6naNMaD6uxYzGFmUM2eGm4dnGQ3FNbTEhxNsiU';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Using fallback Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel env.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
