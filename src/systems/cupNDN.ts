/**
 * §10.4 Cúp N-D-N (short–long–short): Arrival = Owner ball + Carde + English, in half-diamond units.
 * Base shot: left ¼ contact, no english → the cue ball returns to the corner.
 */
export const cupArrival = (owner: number, carde: number, english: number): number => owner + carde + english;
export const cupEnglishNeeded = (owner: number, carde: number, target: number): number => target - owner - carde;
