/**
 * Vocabulary of pre-recorded voice clips (public/voice/<key>.m4a) used when the browser's
 * own speech engine is missing or stuck. Instruction steps are spoken as a sequence of keys.
 * Regenerate with `pnpm voice:build`; a coach can replace any file with his own recording
 * as long as the file name (key) stays the same.
 */
export const PHRASES: Record<string, string> = {
  'danh-bi-truoc': 'Đánh bi trước',
  'danh-bang-truoc': 'Đánh băng trước',
  cham: 'chạm',
  'ball-white': 'bi trắng',
  'ball-yellow': 'bi vàng',
  'ball-red': 'bi đỏ',
  'dau-tien': 'đầu tiên',
  'ngam-cham': 'Ngắm chạm',
  trai: 'trái',
  phai: 'phải',
  'frac-1-8': 'một phần tám',
  'frac-1-4': 'một phần tư',
  'frac-3-8': 'ba phần tám',
  'frac-1-2': 'nửa',
  'frac-5-8': 'năm phần tám',
  'frac-3-4': 'ba phần tư',
  'frac-7-8': 'bảy phần tám',
  'frac-full': 'đầy',
  ngam: 'Ngắm',
  'cushion-S1': 'băng ngắn trái',
  'cushion-S2': 'băng ngắn phải',
  'cushion-L1': 'băng dài dưới',
  'cushion-L2': 'băng dài trên',
  nut: 'nút',
  'xuyen-nut': 'xuyên nút',
  'truoc-mat-nut': 'trước mặt nút',
  'theo-bo-so': 'Theo bộ số là',
  'ngam-theo-duong': 'Ngắm theo đường trên bàn',
  'giua-tam': 'Đánh giữa tâm bi cái, không ép phê',
  gio: 'giờ',
  tip: 'tip',
  'ep-phe-thuan': 'ép phê thuận',
  'ep-phe-nghich': 'ép phê nghịch',
  'ep-phe-khong': 'không ép phê',
  'nang-co': 'Nâng cơ',
  do: 'độ',
  'stroke-thuong': 'đánh thường',
  'stroke-cule': 'culê',
  'stroke-tro': 'trô',
  'stroke-dan': 'dằn',
  'stroke-masse': 'mát xê',
  'stroke-bo': 'cú bổ',
  luc: 'Lực',
  'tren-muoi': 'trên mười',
  'bi-cai-cham-bang': 'Bi cái chạm băng',
  dai: 'dài',
  ngan: 'ngắn',
  'roi-toi-bi-2': 'rồi tới bi thứ hai',
  phay: 'phẩy',
  // Bi mục tiêu: độ dày + cách ngắm tâm bi cái
  'thick-full': 'Nguyên trái',
  'thick-3-4': 'Ba phần tư trái',
  'thick-1-2': 'Nửa trái',
  'thick-1-4': 'Một phần tư trái',
  'thick-thin': 'Đánh mỏng',
  vao: 'vào',
  'cham-ben': 'chạm bên',
  'ngam-tam-bi-cai': 'Ngắm tâm bi cái',
  'aim-center': 'thẳng vào tâm',
  'aim-near-center': 'hơi lệch sang',
  tam: 'tâm',
  'aim-mid': 'vào giữa tâm và mép',
  'aim-near-edge': 'vào gần mép',
  'aim-edge': 'đúng mép',
  'aim-outside': 'ra ngoài mép',
  'mot-chut': 'một chút',
  'nua-ban-kinh': 'nửa bán kính bi',
  'aim-graze': 'Ngắm cho mép bi cái sượt nhẹ mép',
  // Bi cái: điểm chạm
  'danh-tam-bi': 'Đánh tâm bi',
  cule: 'Cu lê',
  tro: 'Trô',
  'ep-phe': 'ép phê',
  muc: 'mức',
  thuan: 'thuận',
  nghich: 'nghịch',
  sau: 'sâu',
  // Cơ: góc cơ, cầu tay, ra cơ
  'co-song-song': 'Cơ song song mặt bàn',
  'co-gan-song-song': 'Cơ gần song song',
  'nang-nhe': 'nâng nhẹ',
  'chui-duoi-co': 'Chúi đuôi cơ lên',
  'nang-cao-duoi-co': 'Nâng cao đuôi cơ',
  'dung-co': 'Dựng cơ',
  'cau-tay-kin': 'Cầu tay kín',
  'cau-tay-mo': 'Cầu tay mở',
  'cau-tay-dung': 'Cầu tay dựng cao',
  'thoc-sau': 'thọc sâu',
  'danh-mo': 'đánh mổ',
};

export const NUMBER_MAX = 100;

/** Every clip the app may request: phrases plus the numbers 0–100. */
export function allClips(): Array<{ key: string; text: string }> {
  const out = Object.entries(PHRASES).map(([key, text]) => ({ key, text }));
  for (let n = 0; n <= NUMBER_MAX; n++) out.push({ key: `n${n}`, text: String(n) });
  return out;
}

/** 3.2 → ['n3', 'phay', 'n2']; whole numbers drop the decimal part; clamped to 0–100. */
export function numClips(x: number, digits = 1): string[] {
  const scale = 10 ** digits;
  const v = Math.round(Math.abs(x) * scale) / scale;
  const int = Math.min(NUMBER_MAX, Math.floor(v));
  const out = [`n${int}`];
  if (digits > 0) {
    const dec = Math.round((v - Math.floor(v)) * scale);
    if (dec > 0) out.push('phay', `n${dec}`);
  }
  return out;
}

export const FRACTION_CLIP: Record<string, string> = {
  '1/8': 'frac-1-8',
  '1/4': 'frac-1-4',
  '3/8': 'frac-3-8',
  '1/2': 'frac-1-2',
  '5/8': 'frac-5-8',
  '3/4': 'frac-3-4',
  '7/8': 'frac-7-8',
  đầy: 'frac-full',
};
