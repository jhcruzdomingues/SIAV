/**
 * Configuração global para testes
 * Executado antes de cada arquivo de teste
 */

import { vi } from 'vitest';

// Mock do localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
};

global.localStorage = localStorageMock;

// Mock do Supabase (para testes sem conexão real)
global.mockSupabase = {
    auth: {
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        getSession: vi.fn(),
        onAuthStateChange: vi.fn()
    },
    from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
    }))
};

// Mock de áudio
global.HTMLMediaElement.prototype.play = vi.fn();
global.HTMLMediaElement.prototype.pause = vi.fn();

// Mock de notificações
global.Notification = {
    permission: 'granted',
    requestPermission: vi.fn(() => Promise.resolve('granted'))
};

console.log('✅ Setup de testes carregado');
