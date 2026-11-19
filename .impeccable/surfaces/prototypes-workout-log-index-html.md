---
version: 1
slug: "prototypes-workout-log-index-html"
primary_target: "prototypes/workout-log/index.html"
related_targets: []
---

# Màn hình ghi buổi tập (prototype)

## Scope
- Mode: **Operate**. Màn hình người tập dùng trong phòng gym, giữa các set (UC06–UC10, UC12–UC14, UC17).
- Build path: **code-led**. `.impeccable/config.json` ghi `comp` (lựa chọn của người dùng, áp cho màn hình Persuade/Experience); concept-seed in rõ cho màn này: "A surface in operate mode builds in code whatever the project records". Harness cũng không có công cụ sinh ảnh. Không có comp round, không có `build/state.json`; bản phác `.impeccable/mocks/decision/assigned.html` người dùng chọn là bố cục tham chiếu.
- Back-off (R3): giữ hành vi SRS UC07 bước 3 — ô nhập được điền sẵn số của gợi ý, gợi ý giữ sáng kèm "Ừ / Giữ mức cũ"; ghi set khi chưa trả lời thì mức tạ thực ghi quyết định `accepted`/`dismissed`.
- Đầu ra vòng này: prototype HTML tách rời (`prototypes/workout-log/index.html`), dữ liệu mẫu đánh dấu rõ; chưa nối Dexie/engine/API.
- Trạng thái phải có: (1) lõi — ghi set, số liệu lần trước, rest timer; (2) gợi ý — tăng (R1/R2), back-off (R3), khởi động (R5), thông báo PR; (3) điều chỉnh buổi — thay bài, đổi thứ tự, superset, thêm bài; (4) kết thúc + đồng bộ — tóm tắt, offline, số set chưa đồng bộ.
- Nhịp tập: vừa tuần tự vừa nhảy bài/superset đều phổ biến — phải thấy bài hiện tại thật to *và* nhảy bài được trong một chạm.
- Phải tránh: giống app fitness đại trà (gamification, huy hiệu, vòng tiến độ); khô như bảng tính; thứ gì chen vào giữa hai set.

## Direction contract
THESIS: Mỗi set là một số áo thi đấu: con số sắp nâng in to như số báo danh, đọc được khi điện thoại nằm trên ghế cách hai mét. Từ chối bố cục mặc định của ngành — bảng set nhiều cột (SET | LẦN TRƯỚC | KG | REPS | ✓) cuộn dài trên nền tối với một màu neon.

OWN-WORLD: Nền xám Tyvek lạnh `#E6E6E1`, tấm số áo trắng Tyvek `#F4F4F1`, mực đen tuyệt đối `#111`. Dải màu cự ly in tràn đầu số áo mang trạng thái: cam `#FF4F1A` = set đang tập và thứ bấm được, lam `#1F5BD8` = đang nghỉ, viền đen rỗng = set khởi động, đen đặc = PR. Xanh `#1E9E5A` chỉ cho "đã xong/đã đồng bộ". Số: Barlow Condensed 800 tabular; chữ: Be Vietnam Pro. Đường răng cưa có hai khuyết tròn tách cuống "Lần trước" khỏi mặt số. Góc 8–12px, không bóng đổ trang trí, không gradient. Thứ bậc chữ: cỡ số áo (≈132px), cỡ đọc (16–17px), cỡ nhãn (12px chữ hoa giãn); cộng một cỡ số phụ (≈28–34px, chỉ số condensed) cho đồng hồ nghỉ, hàng set, cuống — mọi thứ bậc khác do độ đậm, chữ hoa, nền đảo. Số liệu không bao giờ xám; "lần trước" khác biệt bằng cỡ và vị trí. Cam chỉ ở thứ đang diễn ra và thứ bấm được.

STORY: Người tập liếc là thấy phải nâng bao nhiêu, chỉnh ±bậc tạ ngay trên con số, bấm Xong set bằng ngón cái. Họ tin gợi ý vì nó luôn nói lý do bằng giọng người tập cùng và luôn bỏ qua được; họ yên tâm vì biết từng set đã lưu trên máy dù mất mạng.

FIRST VIEWPORT (390×844): Thanh trên — tên buổi + giờ tập (số phụ), chip đồng bộ, nút Kết thúc đen. Dải chip bài cuộn ngang (số thứ tự condensed, tên, chấm tiến độ set; superset nối bằng ngoặc). Giữa — tấm số áo: dải cam "ĐẨY NGỰC NGANG · THANH ĐÒN / SET 3/4", mặt số "80 × 8" cỡ số áo với nút −/+ 44px dưới mỗi số, răng cưa, cuống "LẦN TRƯỚC · 12/11 80×8·8·7" kèm câu gợi ý. Dưới — hàng các set đã/chưa ghi. Đáy — thanh nghỉ lam (khi đang nghỉ) và nút cam "Xong set 3" 64px ở vùng ngón cái.
Signature interaction: **dải số áo là đồng hồ** — bấm Xong set, set vừa ghi trượt xuống thành một hàng có dấu ✓, số áo set kế tiếp hiện ra đã điền sẵn, và dải đầu số áo chuyển từ cam sang lam rồi rút dần theo thời gian nghỉ còn lại; hết giờ dải loé và trở về cam. Không bao giờ khoá nút Xong set. Motion grammar: trượt dọc ngắn (180–240ms, ease-out), không nảy, tôn trọng reduced-motion.

FORM: Số áo vận động viên — hạng 5 trong danh sách bảy ứng viên của tôi (được xúc xắc giao). seed:1d4722390d192372. Nâng từ các ứng viên bị loại: ba cỡ chữ + thứ bậc bằng độ đậm (Giá kính lịch bay); thay đổi giữ sáng tới khi được nhìn thấy, hàng trượt chứ không biến mất (Thẻ lên máy bay); cam chỉ ở thứ bấm được (App tiêu dùng ấm áp); số liệu đen tuyệt đối (Trường dữ liệu đen trắng).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Memorable moment
Dải cam đầu số áo đổi sang lam và rút dần như đồng hồ nghỉ, trong khi con số của set kế tiếp đã nằm sẵn bên dưới.

## Unresolved
- Âm thanh báo hết giờ nghỉ (chưa thiết kế âm).
- Tên sản phẩm/logo vẫn là tên tạm.
- Cách hiển thị RPE khi bật (mặc định tắt theo onboarding).
