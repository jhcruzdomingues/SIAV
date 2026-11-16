import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const document = new DOMParser().parseFromString(readFileSync('index.html', 'utf8'), 'text/html');
const panel = document.getElementById('sound-settings-modal');
const types = ['shock', 'alert', 'drug', 'metronome'];

describe('Sons: contrato da interface com o módulo de áudio existente', () => {
    it('identifica o diálogo e associa os controles aos rótulos visíveis', () => {
        expect(panel.getAttribute('role')).toBe('dialog');
        expect(document.getElementById(panel.getAttribute('aria-labelledby')).textContent).toBe('Sons e alertas');
        for (const id of ['sounds-enabled-toggle', 'volume-slider', ...types.map(type => `${type}-sound-select`)]) {
            const control = document.getElementById(id);
            expect(control.labels.length).toBeGreaterThan(0);
            expect([...control.labels].some(label => label.textContent.trim())).toBe(true);
            expect(document.querySelectorAll(`[id="${id}"]`)).toHaveLength(1);
        }
        expect(document.getElementById('sounds-enabled-toggle').getAttribute('role')).toBe('switch');
        expect(document.getElementById('volume-value').getAttribute('for')).toBe('volume-slider');
    });
    it('preserva a ativação no primeiro dos seis grupos, mantendo o contrato do toggle', () => {
        // setupSoundToggle uses index > 0; regrouping must not disable the master switch.
        const groups = [...panel.querySelectorAll('.sound-setting-group')];
        expect(groups).toHaveLength(6);
        expect(groups[0].querySelector('#sounds-enabled-toggle')).not.toBeNull();
        expect(groups[1].querySelector('#volume-slider')).not.toBeNull();
        expect(groups.slice(2).map(group => group.querySelector('select').id)).toEqual(types.map(type => `${type}-sound-select`));
    });
    it('preserva os destinos de testar, adicionar, voltar, restaurar e salvar', () => {
        const callbacks = ["closeModal('sound-settings-modal')", 'backToSettingsMenu()', 'resetSoundSettings()', 'saveSoundSettings()'];
        for (const type of types) {
            callbacks.push(`previewSound('${type}')`, `document.getElementById('upload-${type}-sound').click()`);
            expect(document.getElementById(`upload-${type}-sound`).accept).toBe('audio/*');
            expect(document.getElementById(`${type}-custom-group`).tagName).toBe('OPTGROUP');
        }
        const buttons = [...panel.querySelectorAll('button')];
        expect(buttons.map(button => button.getAttribute('onclick')).sort()).toEqual(callbacks.sort());
        expect(buttons.every(button => button.type === 'button')).toBe(true);
    });
});
