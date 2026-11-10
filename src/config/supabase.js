import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { createPublicSupabaseClient } from './public-supabase.js';

// Enumerate public variables explicitly. Never embed the entire import.meta.env object.
export const supabase = createPublicSupabaseClient(createClient, {
    url: import.meta.env.VITE_SUPABASE_URL,
    publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    projectRef: import.meta.env.VITE_SUPABASE_PROJECT_REF || undefined
});
