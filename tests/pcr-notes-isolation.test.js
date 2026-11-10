import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { state, resetPCRState } from '../src/config/state.js';
import * as core from '../src/pcr/core.js';
import * as rhythm from '../src/pcr/rhythm.js';
import { showNotesModal, saveNotes, generateEvolution, fetchPcrLogs, viewLogDetail } from '../src/pcr/log.js';
import { savePatientData, startPCRWithUninformedData } from '../src/ui/patient.js';
import { showScreen } from '../src/ui/dom.js';
import { addEvent, updateTimeline } from '../src/ui/timeline.js';
import { supabase } from '../src/config/supabase.js';

// Only the remote boundary is replaced. Never connect to Supabase in these tests.
vi.mock('../src/config/supabase.js', () => ({ supabase: { from: vi.fn() } }));

const body = readFileSync('index.html', 'utf8').match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const NOTE_A = 'NOTA SINTETICA EXCLUSIVA DO ATENDIMENTO A';
const NOTE_B = 'NOTA SINTETICA EXCLUSIVA DO ATENDIMENTO B';
const DRAFT_A = 'RASCUNHO SINTETICO NAO SALVO DO ATENDIMENTO A';
const input = id => document.getElementById(id);
const globals = [
    'startPCR', 'startCompressions', 'finishPCR', 'showRhythmSelectorScreen',
    'showScreen', 'addEvent', 'updateTimeline', 'generateEvolution',
    'checkAccess', 'stopMetronome', 'updateDashboard'
];
let savedLogs;
let originalGlobals;

function saveSyntheticNote(text) {
    showNotesModal();
    input('clinical-notes').value = text;
    saveNotes();
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T15:00:00Z'));
    document.body.innerHTML = body;
    resetPCRState();
    state.patientLog = [];
    state.patient = { algorithm: 'adult', name: 'PACIENTE SINTETICO A', age: 40, weight: 70 };
    state.currentUser = { id: 'synthetic-user', name: 'Profissional sintético', isLoggedIn: true, plan: 'professional' };
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    // In-memory transport fixture exercises the existing report/save/read path.
    // It proves payload/history preservation, not remote durability, Auth or RLS.
    savedLogs = [];
    supabase.from.mockReset();
    supabase.from.mockImplementation(() => ({
        insert: rows => {
            const inserted = rows.map(row => ({ ...row, id: `synthetic-log-${savedLogs.length + 1}` }));
            savedLogs.push(...inserted);
            return { select: async () => ({ data: inserted, error: null }) };
        },
        select: () => ({ eq: () => ({ order: async () => ({ data: savedLogs, error: null }) }) })
    }));
    originalGlobals = new Map(globals.map(key => [key, Object.getOwnPropertyDescriptor(window, key)]));
    Object.assign(window, {
        startPCR: core.startPCR,
        startCompressions: core.startCompressions,
        finishPCR: core.finishPCR,
        showRhythmSelectorScreen: rhythm.showRhythmSelectorScreen,
        showScreen, addEvent, updateTimeline,
        generateEvolution: vi.fn(generateEvolution),
        checkAccess: vi.fn(() => true),
        stopMetronome: vi.fn(), updateDashboard: vi.fn()
    });
    core.startPCR();
});

afterEach(() => {
    core.clearAllIntervals();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    for (const [key, descriptor] of originalGlobals) {
        if (descriptor) Object.defineProperty(window, key, descriptor);
        else delete window[key];
    }
});

describe('Isolamento de notas por atendimento', () => {
    it.each(['formulário', 'sem dados'])('encerra A, inicia B via %s sem notas herdadas e mantém o histórico de A', async entry => {
        saveSyntheticNote(NOTE_A);
        const notesOfA = state.notes;
        core.finishPCR();
        expect(state.pcrActive).toBe(false);
        expect(notesOfA.map(note => note.text)).toEqual([NOTE_A]);
        expect(window.generateEvolution).toHaveBeenCalledWith(true);
        expect(savedLogs).toHaveLength(1);
        const reportOfA = savedLogs[0].report_html;
        expect(reportOfA).toContain(NOTE_A);
        expect(reportOfA).toContain('PACIENTE SINTETICO A');
        await fetchPcrLogs();
        const historyOfA = state.patientLog[0];

        if (entry === 'formulário') {
            input('patient-name').value = 'PACIENTE SINTETICO B';
            savePatientData({ preventDefault: vi.fn() });
        } else {
            startPCRWithUninformedData();
        }
        expect(state.pcrActive).toBe(true);
        expect(state.notes).toEqual([]);
        expect(state.notes).not.toBe(notesOfA);
        expect(notesOfA.map(note => note.text)).toEqual([NOTE_A]);
        expect(state.patientLog[0]).toBe(historyOfA);
        expect(generateEvolution(false)).not.toContain(NOTE_A);
        expect(input('timeline-events').textContent).not.toContain(NOTE_A);

        saveSyntheticNote(NOTE_B);
        core.finishPCR();
        expect(savedLogs).toHaveLength(2);
        expect(savedLogs[1].report_html).toContain(NOTE_B);
        expect(savedLogs[1].report_html).not.toContain(NOTE_A);
        expect(savedLogs[0].report_html).toBe(reportOfA);
        await fetchPcrLogs();
        viewLogDetail(savedLogs[0].id);
        expect(input('log-detail-content').textContent).toContain(NOTE_A);
        expect(input('log-detail-content').textContent).not.toContain(NOTE_B);
    });

    it('descarta somente o rascunho não salvo ao iniciar outro atendimento', () => {
        saveSyntheticNote(NOTE_A);
        showNotesModal();
        input('clinical-notes').value = DRAFT_A;
        core.finishPCR();
        expect(savedLogs[0].report_html).toContain(NOTE_A);
        expect(savedLogs[0].report_html).not.toContain(DRAFT_A);
        expect(input('clinical-notes').value).toBe(DRAFT_A);

        startPCRWithUninformedData();
        showNotesModal();
        expect(input('clinical-notes').value).toBe('');
        expect(state.notes).toEqual([]);
    });

    it('não apaga notas nem rascunho ao tentar iniciar novamente uma PCR ativa', () => {
        saveSyntheticNote(NOTE_A);
        const notesOfA = state.notes;
        input('clinical-notes').value = DRAFT_A;
        core.startPCR();
        expect(state.notes).toBe(notesOfA);
        expect(state.notes.map(note => note.text)).toEqual([NOTE_A]);
        expect(input('clinical-notes').value).toBe(DRAFT_A);
    });

    it('preserva notas se o encerramento do atendimento for cancelado', () => {
        saveSyntheticNote(NOTE_A);
        window.confirm.mockReturnValueOnce(false);
        core.finishPCR();
        expect(state.pcrActive).toBe(true);
        expect(state.notes.map(note => note.text)).toEqual([NOTE_A]);
        expect(savedLogs).toHaveLength(0);
        expect(generateEvolution(false)).toContain(NOTE_A);
    });

    it('preserva notas entre ciclos de compressão e avaliações de ritmo do mesmo atendimento', () => {
        saveSyntheticNote(NOTE_A);
        const notesOfA = state.notes;
        core.startCompressions();
        vi.advanceTimersByTime(121500);
        expect(input('rhythm-selector-screen').classList.contains('active')).toBe(true);
        rhythm.selectRhythmOption(document.querySelector('[data-rhythm="AESP"]'));
        rhythm.processRhythmSelection();
        vi.advanceTimersByTime(121500);
        expect(state.notes).toBe(notesOfA);
        expect(state.notes.map(note => note.text)).toEqual([NOTE_A]);
        expect(generateEvolution(false)).toContain(NOTE_A);
    });

    it('preserva notas e rascunho em ROSC e recorrência confirmada no mesmo atendimento', () => {
        saveSyntheticNote(NOTE_A);
        const notesOfA = state.notes;
        const firstEpisode = state.clinical.episodeId;
        input('clinical-notes').value = DRAFT_A;
        window.confirm.mockReturnValueOnce(true).mockReturnValueOnce(false);
        rhythm.roscObtido();
        expect(state.pcrActive).toBe(true);
        expect(state.clinical.status).toBe('rosc');
        expect(state.notes).toBe(notesOfA);
        expect(input('clinical-notes').value).toBe(DRAFT_A);

        window.confirm.mockReturnValueOnce(false);
        core.restartPCRAfterROSC();
        expect(state.clinical.episodeId).toBe(firstEpisode);
        expect(state.notes).toBe(notesOfA);
        core.restartPCRAfterROSC();
        expect(state.clinical.episodeId).not.toBe(firstEpisode);
        expect(state.notes).toBe(notesOfA);
        expect(input('clinical-notes').value).toBe(DRAFT_A);
        saveSyntheticNote(NOTE_B);
        expect(state.notes.map(note => note.text)).toEqual([NOTE_A, NOTE_B]);
        const report = generateEvolution(false);
        expect(report).toContain(NOTE_A);
        expect(report).toContain(NOTE_B);
    });

    it('após ROSC com encerramento, limpa notas somente se o novo atendimento for confirmado', () => {
        saveSyntheticNote(NOTE_A);
        const notesOfA = state.notes;
        rhythm.roscObtido();
        expect(state.pcrActive).toBe(false);
        expect(state.notes).toBe(notesOfA);
        expect(savedLogs[0].report_html).toContain(NOTE_A);
        input('clinical-notes').value = DRAFT_A;

        window.confirm.mockReturnValueOnce(false);
        core.startPCR();
        expect(state.pcrActive).toBe(false);
        expect(state.notes).toBe(notesOfA);
        expect(input('clinical-notes').value).toBe(DRAFT_A);
        core.startPCR();
        expect(state.pcrActive).toBe(true);
        expect(state.notes).toEqual([]);
        expect(input('clinical-notes').value).toBe('');
        expect(notesOfA.map(note => note.text)).toEqual([NOTE_A]);
        expect(savedLogs[0].report_html).toContain(NOTE_A);
        expect(generateEvolution(false)).not.toContain(NOTE_A);
    });
});
