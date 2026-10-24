/** Fold Vietnamese text for accent-insensitive search. NFD does NOT split đ/Đ, so map it explicitly (§11.4). */
export function viFold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}
