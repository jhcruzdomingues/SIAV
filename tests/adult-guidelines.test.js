import { describe, it, expect, vi } from 'vitest';
import { PROTOCOLS, STUDY_GUIDES } from '../src/protocols/guidelines.js';

vi.mock('../src/services/permissions.js', () => ({ checkAccess: vi.fn() }));
vi.mock('../src/ui/dom.js', () => ({ openModal: vi.fn() }));

describe('Orientações escritas de PCR adulta', () => {
  it('posiciona adrenalina após choque 2 e antiarrítmico após choque 3', () => {
    const content = PROTOCOLS['pcr-adulto'].content;
    expect(content.indexOf('Adrenalina 1 mg')).toBeGreaterThan(content.indexOf('>CHOQUE 2<'));
    expect(content.indexOf('Amiodarona 300 mg')).toBeGreaterThan(content.indexOf('CHOQUE 3,'));
    expect(content).toContain('OU Lidocaína 1-1.5 mg/kg');
    expect(content).not.toContain('persistente após 2 choques');
  });

  it('mantém a farmacologia consistente com a primeira dose após o terceiro choque', () => {
    const amiodarona = STUDY_GUIDES.farmacologia.sections.find(section => section.heading === 'Amiodarona');
    expect(amiodarona.content).toContain('após o 3º choque');
    expect(amiodarona.content).not.toContain('após o 2º choque');
  });
});
