// Verified through the connected project's metadata and publishable-key registry.
export const SIAV_PROJECT_REF = 'lfcvjrshlybmurnvulvh';
export const SIAV_PROJECT_URL = `https://${SIAV_PROJECT_REF}.supabase.co`;

/** Validate deployment configuration, never authorization or RLS. Values are never logged. */
export function resolvePublicSupabaseConfig({ url, publishableKey, projectRef = SIAV_PROJECT_REF } = {}) {
    if (typeof url !== 'string' || !url.trim()) throw new Error('Configure VITE_SUPABASE_URL no ambiente de build.');
    if (typeof projectRef !== 'string' || !/^[a-z0-9]{8,64}$/.test(projectRef)) {
        throw new Error('VITE_SUPABASE_PROJECT_REF inválida.');
    }
    let parsed;
    try { parsed = new URL(url.trim()); } catch { throw new Error('VITE_SUPABASE_URL inválida.'); }
    if (parsed.protocol !== 'https:' || parsed.hostname !== `${projectRef}.supabase.co` || parsed.port ||
        parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
        throw new Error('VITE_SUPABASE_URL não corresponde à referência declarada do projeto.');
    }
    if (typeof publishableKey !== 'string' || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey.trim())) {
        throw new Error('Configure somente uma chave publicável moderna em VITE_SUPABASE_PUBLISHABLE_KEY.');
    }
    return Object.freeze({ url: parsed.origin, publishableKey: publishableKey.trim(), projectRef });
}

export function createPublicSupabaseClient(createClient, values) {
    const config = resolvePublicSupabaseConfig(values);
    // Preserve the SDK's existing session/auth defaults and the single shared client.
    return createClient(config.url, config.publishableKey);
}
