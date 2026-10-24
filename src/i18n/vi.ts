export interface AuthorTitle {
  year: string;
  title: string;
  /** 1 = vô địch, 2 = á quân, 3 = hạng ba */
  rank?: 1 | 2 | 3;
}

/** All user-facing strings (§0.10). Structured so en.ts can mirror it later. */
export const vi = {
  app: {
    name: 'Ba Băng',
    tagline: 'Học bida 3 băng: lý thuyết, bộ số và phòng tập mô phỏng',
    author: {
      name: 'DungLQ',
      role: 'VĐV, HLV bida 3 băng',
      email: 'quangdung100194@gmail.com',
      /** Real titles only — e.g. { year: '2024', title: 'Giải 3 băng …', rank: 1 }. Empty hides the block and the cup. */
      titles: [] as AuthorTitle[],
    },
    /** Role model shown in its own section — titles belong to him, not to the app author. Source: user-provided list. */
    roleModel: {
      name: 'Trần Quyết Chiến',
      highlights: [
        { value: '4', label: 'lần vô địch UMB World Cup' },
        { value: '2', label: 'lần vô địch Đồng đội Thế giới' },
      ],
      titles: [
        { year: '2018', title: 'UMB World Cup, TP. Hồ Chí Minh (Việt Nam)', rank: 1 },
        { year: '2023', title: 'UMB World Cup, Porto (Bồ Đào Nha)', rank: 1 },
        { year: '2024', title: 'UMB World Cup, Bogotá (Colombia)', rank: 1 },
        { year: '2024', title: 'UMB World Cup, Veghel (Hà Lan)', rank: 1 },
        { year: '2024', title: 'UMB World Championship for National Teams, cùng tuyển Việt Nam', rank: 1 },
        { year: '2026', title: 'UMB World Championship for National Teams, cùng tuyển Việt Nam', rank: 1 },
      ] as AuthorTitle[],
    },
  },
  nav: {
    home: 'Trang chủ',
    practice: 'Phòng tập',
    theory: 'Lý thuyết',
    systems: 'Bộ số',
    glossary: 'Thuật ngữ',
    tables: 'Bàn',
  },
  categories: {
    'co-ban': 'Cơ bản',
    'diem-cham-va-xoay': 'Điểm chạm & xoáy',
    'do-day-va-goc': 'Độ dày & góc',
    luc: 'Lực',
    'bo-so': 'Bộ số',
    'the-bi': 'Thế bi',
    'ky-thuat-nang-cao': 'Nâng cao',
    'chien-thuat': 'Chiến thuật & gom bi',
    'bai-tap': 'Bài tập',
  } as Record<string, string>,
  levels: { 'nhap-mon': 'Nhập môn', 'co-ban': 'Cơ bản', 'trung-cap': 'Trung cấp', 'nang-cao': 'Nâng cao' } as Record<string, string>,
  review: { draft: 'Bản nháp — chờ HLV duyệt', coach_reviewed: 'HLV đã duyệt' },
  theory: {
    title: 'Lý thuyết',
    searchPlaceholder: 'Tìm: ép phê, bộ 50, culê…',
    filters: 'Bộ lọc',
    clearFilters: 'Xoá bộ lọc',
    reviewedOnly: 'Chỉ bài đã duyệt',
    results: (n: number) => `${n} bài`,
    empty: 'Không có bài nào khớp. Thử bỏ bớt bộ lọc hoặc gõ không dấu.',
    readMinutes: (n: number) => `${n} phút đọc`,
    sources: 'Nguồn tham khảo',
    related: 'Mở trong phòng tập',
  },
  systems: {
    title: 'Bộ số',
    calc: 'Máy tính',
    start: 'Điểm đầu',
    aim: 'Điểm ngắm',
    arrival: 'Điểm về',
    tips: 'Ép phê (tip)',
    correction: 'Sai số',
    solveFor: 'Tính',
    openPractice: 'Mở trong phòng tập',
    failureModes: 'Lỗi hay gặp',
    validRange: 'Phạm vi dùng được',
  },
  practice: {
    title: 'Phòng tập',
    place: 'Đặt bi',
    suggest: 'Gợi ý',
    manual: 'Tự đánh',
    findShots: 'Tìm cách đánh',
    searching: 'Đang tìm…',
    cue: 'Bi cái',
    table: 'Bàn',
    skill: 'Trình độ',
    breakLayout: 'Xếp khai cuộc',
    random: 'Đặt ngẫu nhiên',
    undo: 'Hoàn tác',
    redo: 'Làm lại',
    snap: 'Bám ¼ nút',
    save: 'Lưu thế bi',
    share: 'Chia sẻ',
    copied: 'Đã chép liên kết',
    saved: 'Đã lưu thế bi',
    noOptions: 'Chưa tìm được cú ghi điểm chắc chắn. Thử dời bi hoặc chọn trình độ cao hơn.',
    simNote: 'Tỷ lệ là mô phỏng trên bàn của bạn, không phải xác suất thật.',
    strike: 'Đánh',
    analyze: 'Phân tích độ chắc',
    scored: 'Ghi điểm',
    missed: 'Không ghi điểm',
    kiss: 'Đá bi',
    camTop: 'Nhìn từ trên',
    camShooter: 'Góc cơ thủ',
    camFree: 'Xoay tự do',
    layers: { trails: 'Đường bi', cue: 'Cơ' },
    rotateHint: 'Xoay ngang điện thoại để xem góc cơ thủ rõ hơn',
  },
  skills: { pro: 'Chuyên nghiệp', advanced: 'Khá', intermediate: 'Trung bình', beginner: 'Mới chơi' } as Record<string, string>,
  sort: { score: 'Điểm tổng', easy: 'Dễ nhất', safe: 'Ít đá bi', leave: 'Thế để lại' } as Record<string, string>,
};

export type Strings = typeof vi;
export const t = vi;
