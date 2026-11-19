# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

PWA trên trình duyệt di động (Safari iOS 16.4+, Chrome Android), một codebase, người dùng thêm vào màn hình chính và mở toàn màn hình như app (SDD D26). Thiết kế theo giới hạn của iOS, xử lý khác biệt bằng feature detection. Bản bọc native (Capacitor) chỉ có ở post-MVP và vẫn dùng lại UI web.

## Users

- **Persona chính — người tập có kinh nghiệm.** Đã tự tập lâu năm và có sẵn lịch tập (thường lấy từ mạng xã hội). Hiểu rep range và set, nhưng không nhất thiết quen RPE hay %1RM. Họ dùng app *trong phòng gym, giữa các set*: muốn ghi nhanh, ít thao tác, nhìn ngay được lần trước đã tập bao nhiêu và biết khi nào nên tăng tạ. Nhu cầu này xuất phát từ trải nghiệm thật của founder.
- **Persona phụ — người mới.** Chưa có lịch tập, cần chọn một chương trình mẫu rồi bắt đầu ghi. Không dạy kỹ thuật từ đầu.
- Hai nhóm được phân biệt bằng **bộ cài đặt mặc định** đặt từ onboarding (mức độ hướng dẫn, khởi động, RPE), không tách thành hai chế độ giao diện; người dùng đổi được bất cứ lúc nào (D22).
- 13+, không hỏi tuổi, không phân biệt UI theo nhóm tuổi.

## Product Purpose

Ứng dụng theo dõi tập tạ: ghi buổi tập (tạ, reps, thứ tự bài) để không quên số liệu lần trước, và đưa ra gợi ý tăng tạ/rep, back-off, khởi động, quay lại sau thời gian nghỉ, deload dựa trên dữ liệu đã ghi. Ngoài ra có mục tiêu, streak tuần, PR, chỉ số cơ thể và biểu đồ tiến độ.

Đây là đồ án môn Software Engineering nhưng được xây như một sản phẩm thật. MVP nhắm tới buổi demo cuối kỳ (backend chạy localhost); beta công khai thuộc post-MVP.

Thành công nghĩa là: ghi một set gần như không tốn công giữa hai set; người tập tin và làm theo gợi ý (tỉ lệ chấp nhận gợi ý, đo qua `SUGGESTIONS.status`, là metric đánh giá engine); dữ liệu buổi tập không bao giờ bị mất, kể cả khi offline.

## Positioning

- **Lịch tập là của người dùng.** App không dạy tập, không làm huấn luyện viên AI, không chấm dinh dưỡng. Nó là công cụ ghi chép kèm bộ nhớ và phán đoán cho lịch tập người ta đã có sẵn.
- **Gợi ý minh bạch dựa trên luật.** Progression engine (R1–R8, căn cứ ACSM) chạy hoàn toàn trên máy. Mọi gợi ý đều kèm lý do và đều bỏ qua được. Gợi ý tăng (R1) chỉ nêu hướng, không áp một con số; người tập tự quyết tăng tạ hay tăng reps. Không đoán mức tạ khởi điểm cho bài chưa có lịch sử (R8).
- **Local-first.** Ghi set offline ngay lập tức (IndexedDB + outbox), đồng bộ khi có mạng.
- **Tôn trọng cách mỗi bài được ghi tạ.** Quy ước ghi tạ riêng cho từng bài (tổng / mỗi bên / mỗi quả / cột tạ / tạ đeo thêm), bậc tạ (step) riêng, và chỉ so sánh số liệu trong cùng một quy ước.

*Giả thuyết định vị ("người tập đã có sẵn lịch tập") chưa được kiểm chứng ngoài trải nghiệm của founder. Dự kiến phỏng vấn 5–10 người tập.*

## Operating Context

- **Bối cảnh chính:** phòng gym, điện thoại cầm một tay, thời gian nghỉ giữa set tính bằng phút, tay có thể đẫm mồ hôi hoặc dính phấn, sự chú ý chia sẻ với việc tập. Mạng có thể chập chờn hoặc mất hẳn.
- **Trong buổi tập:** rest timer tự bắt đầu sau mỗi set (tắt được theo từng bài) và tính theo mốc thời điểm kết thúc, nên vẫn hiển thị đúng sau khi app xuống nền. Báo hết giờ bằng âm thanh và hiệu ứng hình ảnh; rung chỉ có trên Android vì iOS không có Vibration API. Màn hình được giữ sáng bằng Screen Wake Lock. Không có thông báo nền ở MVP.
- **Vòng đời PWA:** bản cập nhật chỉ reload khi người dùng đồng ý, để không reload giữa buổi tập. Trên iOS, nếu app đang mở trong tab Safari thì hiện hướng dẫn "Thêm vào màn hình chính" trước khi tập (chỉ gợi ý, không chặn). App luôn hiển thị số set chưa đồng bộ.
- **Ngoài buổi tập:** soạn routine, chọn chương trình mẫu, xem lịch sử/PR/biểu đồ, ghi chỉ số cơ thể, đặt mục tiêu. Nhịp độ thong thả hơn, nhưng vẫn trên màn hình điện thoại.
- **Demo cuối kỳ (chưa chốt):** (a) Chrome desktop ở chế độ giả lập mobile, (b) frontend HTTPS + backend qua tunnel, (c) deploy cả hai. Phải test trên Safari/iPhone thật.

## Capabilities and Constraints

**MVP (SRS 3.1):** đăng nhập (Google, email/mật khẩu qua Supabase); cài đặt kg/lb và múi giờ; tìm bài tập theo tên EN/VI/alias; tạo bài tập tuỳ chỉnh; tạo/sửa routine (plan → ngày → bài, set, rep range, tạ khởi điểm, khởi động, nghỉ); chọn chương trình mẫu; bắt đầu buổi tập từ routine hoặc tập tự do; ghi set offline kèm số liệu lần trước; rest timer; thay bài, đổi thứ tự, superset giữa buổi; kết thúc và đồng bộ; sửa/xoá buổi cũ; gợi ý trước buổi và back-off trong buổi; chỉnh bậc tạ, quy ước ghi tạ, trọng lượng đòn cho từng bài; deload (5 chế độ); mục tiêu (PR, số buổi/tuần, chỉ số cơ thể); streak tuần; thông báo PR trong app; chỉ số cơ thể (nhập tay); biểu đồ e1RM (Epley), số set/tuần theo nhóm cơ, tần suất tập; lịch sử và PR; onboarding; xoá tài khoản.

**Post-MVP, không thiết kế như tính năng hiện có:** import lịch tập bằng LLM từ ảnh/text/video, Health Connect/HealthKit, video hướng dẫn kỹ thuật, Web Push, beta công khai.

**Thuật ngữ cần giữ nhất quán:** working set, set khởi động, PR (loại: e1RM / weight_at_reps / max_reps / session_volume), e1RM, RPE (tuỳ chọn, mặc định theo onboarding), quy ước ghi tạ (load input), bậc tạ (step), ladder, deload, streak tuần, volume (tính bằng **số set**, không cộng tổng kg). Gợi ý có hai mức `soft | strong` và năm loại `increase | celebrate | back_off | return_from_break | deload`.

**Ràng buộc dữ liệu và hiển thị:** số liệu gốc lưu đúng như người dùng nhập, kèm đơn vị; khi đổi kg↔lb thì chỉ quy đổi ở tầng hiển thị. Tuần tính từ thứ Hai đến Chủ nhật theo múi giờ người dùng. PR tính tạm trên máy để ăn mừng ngay; server là nguồn chuẩn và có thể gỡ PR mà không thông báo thêm.

**Ràng buộc kỹ thuật:** Vite + React 19 + TypeScript, React Router (data mode), Tailwind CSS v4 + shadcn/ui (base Radix, component do CLI sinh), lucide-react, Dexie, TanStack Query, Paraglide JS 3 cho song ngữ. Theme lấy từ token trong `DESIGN.md`, chỉ một theme sáng. Không gắn SDK analytics/crash/quảng cáo bên thứ ba. Content-Security-Policy chỉ cho script cùng origin.

**Chưa chốt:** tên sản phẩm và logo, cách chạy demo cuối kỳ, các ngưỡng số của engine (tạm chấp nhận làm mặc định).

## Brand Commitments

- **Tên:** "Fitness Tracking" (short name "Fitness") chỉ là **tên làm việc**. Tên chính thức và logo chưa có; `public/favicon.svg` là logo tạm.
- **Ngôn ngữ (D27, SDD 3.5):** giao diện song ngữ tiếng Anh và tiếng Việt. Tiếng Anh là ngôn ngữ gốc và mặc định (câu chữ viết bằng tiếng Anh trước), tiếng Việt là bản dịch; dự kiến đổi mặc định sang tiếng Việt sau. Tên bài tập và nhóm cơ có cả EN và VI, kèm alias do người dùng tự đặt. Tên tiếng Việt trong catalog và bản dịch tiếng Việt của giao diện hiện là bản nháp do AI soạn, chờ founder rà soát.
- **Giọng văn — một giọng, hai ngôn ngữ:** thân mật, ngắn gọn, nói chuyện như một người tập cùng lâu năm. Ăn mừng PR rõ ràng nhưng không màu mè. Gợi ý luôn nói lý do bằng ngôn ngữ của người tập, không bằng thuật ngữ engine.
  - **EN — "experienced training buddy":** câu ngắn, chủ động, không khách sáo (vd "Time to add weight.").
  - **VI — "bạn tập lâu năm":** xưng hô gần gũi (vd "Lên tạ được rồi đó"). Bản Việt được viết lại cho tự nhiên, không dịch sát từng chữ bản Anh.
- **Stitch:** hai project "MVP App Design" (16/11/2026) và "Fitness App" (09/2026) **chỉ để tham khảo**, không ràng buộc hướng thiết kế mới.

## Evidence on Hand

- Catalog bài tập: 42 bài nạp từ free-exercise-db (Unlicense), danh sách ở `apps/api/prisma/seed/catalog.yaml`; tên Việt là bản nháp.
- Chương trình mẫu: `packages/templates/programs/full-body-3day.yaml` (YAML do founder viết, căn cứ ACSM 2009/2026).
- Bộ luật engine R1–R8 và ngưỡng mặc định: SRS Phụ lục A, `packages/engine`.
- **Chưa có:** người dùng thật, testimonial, kết quả phỏng vấn, số liệu sử dụng, ảnh chụp sản phẩm, logo. Không được bịa những thứ này trong UI, màn hình onboarding hay dữ liệu mẫu trình bày như dữ liệu thật.

## Product Principles

1. **Giữa hai set, mỗi giây đều đắt.** Ghi một set phải là thao tác ngắn nhất trong app; các thao tác khác không được chen vào đường đó. Rest timer không bao giờ chặn việc ghi set tiếp theo.
2. **Gợi ý, không ra lệnh.** Mọi gợi ý đều nói lý do, đều bỏ qua được, và không giả vờ biết nhiều hơn dữ liệu.
3. **Lịch tập là của người dùng.** App ghi nhớ và phán đoán, không áp đặt chương trình hay dạy lại cách tập.
4. **Dữ liệu không bao giờ mất.** Offline là trạng thái bình thường. Trạng thái đồng bộ luôn minh bạch, và không có thao tác nào (cập nhật app, đóng tab) làm mất buổi tập đang dở.
5. **Số liệu đúng ngữ cảnh.** Đơn vị, quy ước ghi tạ và bậc tạ của từng bài luôn được tôn trọng; chỉ so sánh những gì thật sự so sánh được.
