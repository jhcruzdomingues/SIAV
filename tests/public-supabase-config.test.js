import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { describe, it, expect, vi } from 'vitest';
import { SIAV_PROJECT_REF, SIAV_PROJECT_URL, resolvePublicSupabaseConfig, createPublicSupabaseClient } from '../src/config/public-supabase.js';

const publicKey = 'sb_publishable_SYNTHETIC_CONFIGURATION_TEST';
const config = overrides => ({ url: SIAV_PROJECT_URL, publishableKey: publicKey, ...overrides });

describe('Configuração pública do projeto Supabase', () => {
    it('usa como padrão a referência SIAV verificada, sem reproduzir a referência incorreta', () => {
        expect(SIAV_PROJECT_REF).toBe('lfcvjrshlybmurnvulvh');
        expect(resolvePublicSupabaseConfig(config())).toEqual({ url: 'https://lfcvjrshlybmurnvulvh.supabase.co', publishableKey: publicKey, projectRef: SIAV_PROJECT_REF });
    });
    it.each(['https://lfcjrjshlybmurnvulvh.supabase.co', 'http://lfcvjrshlybmurnvulvh.supabase.co', 'https://lfcvjrshlybmurnvulvh.supabase.co/other', 'https://lfcvjrshlybmurnvulvh.supabase.co?token=SYNTHETIC', 'https://lfcvjrshlybmurnvulvh.supabase.co#private', 'https://user:password@lfcvjrshlybmurnvulvh.supabase.co', 'https://lfcvjrshlybmurnvulvh.supabase.co.evil.invalid', 'https://lfcvjrshlybmurnvulvh.supabase.co:8443'])('rejeita URL incorreta/ambígua antes de inicializar SDK: %s', url => {
        const createClient = vi.fn();
        expect(() => createPublicSupabaseClient(createClient, config({ url }))).toThrow('referência declarada');
        expect(createClient).not.toHaveBeenCalled();
    });
    it.each([undefined, '', 'sua-url-do-supabase', 'not a URL'])('rejeita URL ausente ou inválida sem tentar rede: %s', url => {
        expect(() => resolvePublicSupabaseConfig(config({ url }))).toThrow('VITE_SUPABASE_URL');
    });
    it.each([undefined, '', 'sb_secret_SYNTHETIC_SERVER_KEY', 'service_role', 'eyJhbGciOiJIUzI1NiJ9.SYNTHETIC.signature', 'a-chave-anonima-antiga'])('aceita exclusivamente chave publicável moderna: %s', publishableKey => {
        const createClient = vi.fn();
        expect(() => createPublicSupabaseClient(createClient, config({ publishableKey }))).toThrow('chave publicável moderna');
        expect(createClient).not.toHaveBeenCalled();
        try { resolvePublicSupabaseConfig(config({ publishableKey })); } catch (error) {
            if (publishableKey) expect(error.message).not.toContain(publishableKey);
        }
    });
    it('preserva as opções padrão de sessão e retorna exatamente o cliente criado pelo SDK', () => {
        const client = { auth: {}, from: vi.fn() }; const createClient = vi.fn(() => client);
        expect(createPublicSupabaseClient(createClient, config())).toBe(client);
        expect(createClient).toHaveBeenCalledOnce();
        expect(createClient.mock.calls[0]).toEqual([SIAV_PROJECT_URL, publicKey]);
    });
    it('permite outro destino apenas com referência explicitamente declarada, sem atestar pertença da chave ou RLS', () => {
        const projectRef = 'syntheticisolatedproject';
        expect(resolvePublicSupabaseConfig(config({ projectRef, url: `https://${projectRef}.supabase.co` })).projectRef).toBe(projectRef);
    });
    it('não embute credenciais fixas, chave legada ou o objeto inteiro de variáveis do Vite', () => {
        const source = readFileSync('src/config/supabase.js', 'utf8');
        expect(source).toContain('import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY');
        expect(source).not.toMatch(/sb_publishable_[A-Za-z0-9_-]+|sb_secret_[A-Za-z0-9_-]+/);
        expect(source).not.toContain('SUPABASE_ANON_KEY');
        expect(source).not.toMatch(/values:\s*import\.meta\.env|createPublicSupabaseClient\(createClient,\s*import\.meta\.env\s*\)/);
    });
});

describe('Separação do artefato e da configuração de hospedagem', () => {
    it('publica somente dist e usa instalação reproduzível na configuração Vercel da branch', () => {
        const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
        expect(vercel).toMatchObject({ framework: 'vite', installCommand: 'npm ci', buildCommand: 'npm run build', outputDirectory: 'dist' });
        expect(vercel).not.toHaveProperty('env');
        expect(vercel).not.toHaveProperty('rewrites');
        expect(vercel).not.toHaveProperty('alias');
    });
    it('protege arquivos locais de todos os ambientes e metadados da CLI Vercel', () => {
        for (const path of ['.env.local', '.env.preview', '.env.preview.local', '.env.production.local', '.vercel/project.json']) {
            expect(execFileSync('git', ['check-ignore', '--no-index', path], { encoding: 'utf8' }).trim()).toBe(path);
        }
        expect(readFileSync('.env.example', 'utf8')).not.toMatch(/sb_publishable_[A-Za-z0-9_-]+|sb_secret_[A-Za-z0-9_-]+/);
    });
});
