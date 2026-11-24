import { MEDICATIONS } from './medications.js';

const legacyNames = { adrenalina: 'Adrenalina', amiodarona: 'Amiodarona', lidocaina: 'Lidocaína',
    atropina: 'Atropina', bicarbonato: 'Bicarbonato de Sódio 8,4%', sulfato: 'Sulfato de Magnésio' };
const legacyUnits = ['mg', 'g', 'mEq'];
const legacyRoutes = ['EV', 'IO', 'ET'];

// A catalogue of facts that may be documented, not prescribing or dosing rules.
// New entries are deliberately absent from MEDICATIONS and its calculation helpers.
export const MEDICATION_REGISTRATION = {
    ...Object.fromEntries(Object.entries(legacyNames).map(([id, name]) => [id, {
        name, unit: MEDICATIONS[id].unit, units: legacyUnits, routes: legacyRoutes
    }])),
    gluconato_calcio: { name: 'Gluconato de Cálcio 10%', unit: 'mL', units: ['mL'], routes: ['EV', 'IO'], manualOnly: true,
        warning: 'Cálcio: confira sal, concentração e indicação. Sem dose automática.' },
    cloreto_calcio: { name: 'Cloreto de Cálcio 10%', unit: 'mL', units: ['mL'], routes: ['EV', 'IO'], manualOnly: true,
        warning: 'Cálcio: confira sal, concentração e indicação. Sem dose automática.' },
    naloxona: { name: 'Naloxona', unit: 'mg', units: ['mg'], routes: ['EV', 'IO', 'IM', 'IN'], manualOnly: true,
        warning: 'Opioides: não atrase RCP/ventilação. Confira a dose e a apresentação da via usada.' },
    alteplase: { name: 'Alteplase', unit: 'mg', units: ['mg'], routes: ['EV', 'IO'], manualOnly: true,
        warning: 'Trombólise: reavalie TEP e contraindicações. Dose manual.' },
    tenecteplase: { name: 'Tenecteplase', unit: 'mg', units: ['mg'], routes: ['EV', 'IO'], manualOnly: true,
        warning: 'Trombólise: reavalie TEP e contraindicações. Dose manual.' },
    glicose50: { name: 'Glicose 50%', unit: 'mL', units: ['mL'], routes: ['EV', 'IO'], manualOnly: true,
        warning: 'Confira glicemia e indicação. Sem dose automática.' }
};

export function registrationUnitRouteAllowed(id, unit, route) {
    const entry = MEDICATION_REGISTRATION[id];
    // Preserve legacy records without a catalogue id; never widen their routes/units.
    return (entry?.units || legacyUnits).includes(unit) && (entry?.routes || legacyRoutes).includes(route);
}

export function medicationRegistrationAllowed(record) {
    const entry = MEDICATION_REGISTRATION[record.medicationId];
    return registrationUnitRouteAllowed(record.medicationId, record.unit, record.route)
        && (!entry?.manualOnly || record.requiresReview === true && record.name === entry.name);
}
