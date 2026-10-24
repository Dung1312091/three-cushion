/** §10.3 Plus (S-L-L): Arrival (rail 3) = Cue value + First-rail value. Draft numbering [CẦN HLV CUNG CẤP]. */
export const plusArrival = (cue: number, rail1: number): number => cue + rail1;
export const plusAim = (cue: number, arrival: number): number => arrival - cue;
/** Plus is unreliable for cue values 0–30 (§10.3). */
export const plusValid = (cue: number): boolean => cue > 30;
