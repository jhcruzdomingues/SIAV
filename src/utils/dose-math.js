// Remove binary multiplication noise consistently at both ends of a dose range.
// This is numeric normalization, not rounding a clinical dose to whole mg.
export function weightDoseMg(weight, coefficient) {
    if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(coefficient) || coefficient <= 0) return NaN;
    return Number((weight * coefficient).toPrecision(15));
}
