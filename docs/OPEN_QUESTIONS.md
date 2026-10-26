# Câu hỏi mở cho HLV

Không chặn việc build — app đang chạy với giá trị mặc định, tất cả chỉnh được.

1. **Tip ↔ độ lệch tâm.** 1 tip = bao nhiêu R? Mặc định 0,15 R (chỉnh ở trang Bàn → Cài đặt).
2. **Thang lực 1–10.** App đang tính bằng số chiều dài bàn bi đi được, có tính mất năng lượng ở băng (ADR-008). Anh dạy học viên thang lực thế nào?
3. **Bộ 50.** Bản đồ đánh số và bảng sai số theo điểm đầu (§10.2) mới có một nguồn. Quy đổi "1 tip ≈ 7 điểm" chưa kiểm chứng.
4. **Lực ảnh hưởng bộ 50 theo chiều nào?** Nguồn Việt nói đánh mạnh thì góc rộng ra; một số nguồn nước ngoài nói ngược lại ở băng 1.
5. **Plus.** Cần bảng đánh số đầy đủ (file `content/systems/plus.json` đang là số tạm). Đặc tả vừa nói không dùng Plus khi đầu 0–30, vừa lấy ví dụ đầu 20.
6. **Cúp N-D-N.** Gốc 0 đặt ở góc nào? "Carde" chính xác là gì? Thế cúp là bi trước (chạm trái ¼) hay băng trước? App đang ghi nhãn `rail+SLS` = "Cúp N-D-N".
7. **Thuật ngữ chưa kiểm chứng:** vòng bàn, đánh ô, thế ngược, nhồi, giò gà, carde, bi chủ, cú bổ, dợt thử bàn, 3 băng cha/con, bàn trung/bàn đại.
8. **Bàn phăng ở VN:** kích thước lòng bàn, chiều cao băng, cỡ bi (61,5 hay 65,5 mm)?
9. **Trọng số "thế bi để lại"** (solver bước 7, `src/solver/leave.ts`).
10. **Ngưỡng kiểu đánh:** cú bổ khi nâng cơ trên 20°, mát-xê trên 45°.
11. **Danh sách 20 thế bi chuẩn** để nghiệm thu solver (Phase 3).
12. **Hệ số mặc định** cho bàn ở CLB của anh (dùng làm "bàn chuẩn").
13. **Nhiễu theo trình độ** (`SKILL_NOISE`) chưa có số đo người chơi nghiệp dư.
14. **Thông số vật lý** μs, μr, e băng, μw, m/m_e (squirt) — đều là giá trị tham khảo, cần hiệu chuẩn theo bàn.
15. **Từ vựng hướng dẫn** (`src/features/practice/vocab.ts`, ADR-010):
    - Mức ép phê theo múi giờ có đúng cách anh dạy không, hay "ép phê 1/2/3" là số tip lệch ngang?
    - Cầu tay: kín khi lực ≥ 6/10 hoặc culê, mở khi lực ≤ 3/10, dựng cao khi mát-xê.
    - Ra cơ: đánh mổ khi dằn hoặc rủi ro đá bi ≥ 20%, còn lại thọc sâu.
    - Góc cơ: song song < 3°, gần song song < 12°, chúi đuôi 12–35°, dựng > 45°.
    - Cách ngắm 1/4 trái: app nói "ra ngoài mép nửa bán kính bi" (hình học bi ma) — có khớp cách anh dạy?
