---
name: "Fitness Tracking"
description: "Ghi buổi tập như in số áo thi đấu: con số sắp nâng in to, dải màu đầu số áo mang trạng thái."
colors:
  ground: "#E6E6E1"
  tyvek: "#F4F4F1"
  ink: "#111111"
  rule: "#CFCFC8"
  rule-soft: "#DCDCD6"
  orange: "#FF4F1A"
  orange-tint: "#FFE6DC"
  blue: "#1F5BD8"
  green: "#1E9E5A"
  on-signal: "#FFFFFF"
typography:
  bib:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "132px"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.015em"
    fontFeature: "\"tnum\" 1, \"lnum\" 1"
  numeral:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontFeature: "\"tnum\" 1, \"lnum\" 1"
  body:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.08em"
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  sheet: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-go:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.ink}"
    typography: "{typography.numeral}"
    rounded: "{rounded.lg}"
    height: "64px"
    width: "100%"
  button-go-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.tyvek}"
    typography: "{typography.numeral}"
    rounded: "{rounded.lg}"
    height: "64px"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.tyvek}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "44px"
  button-line:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "44px"
  rest-control:
    backgroundColor: "{colors.tyvek}"
    textColor: "{colors.blue}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    height: "48px"
  chip:
    backgroundColor: "{colors.tyvek}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "44px"
  sync-pill:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 10px"
    height: "32px"
  sync-pill-offline:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.tyvek}"
    rounded: "{rounded.pill}"
  bib:
    backgroundColor: "{colors.tyvek}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  band-current:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "6px 4px 6px 16px"
    height: "56px"
  band-rest-overlay:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.on-signal}"
  band-warm:
    backgroundColor: "{colors.tyvek}"
    textColor: "{colors.ink}"
  band-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.tyvek}"
  set-row:
    backgroundColor: "{colors.tyvek}"
    textColor: "{colors.ink}"
    padding: "0 12px 0 16px"
    height: "52px"
  set-row-current:
    backgroundColor: "{colors.orange-tint}"
    textColor: "{colors.ink}"
  set-row-pr:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.tyvek}"
  segment:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "44px"
  segment-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.tyvek}"
  sheet:
    backgroundColor: "{colors.tyvek}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
---

# Design System: Fitness App

## Overview

**Creative North Star: "Số áo thi đấu"**

Mỗi set là một tấm số áo vận động viên: con số sắp nâng in to như số báo danh, đọc được khi điện thoại nằm trên ghế cách hai mét. Màn hình là một cột điện thoại (tối đa 440px) trên nền xám Tyvek lạnh. Mỗi tấm số áo có một dải màu in tràn ở đầu, và dải này mang trạng thái của set. Mặt số chỉ có hai con số và dấu nhân. Một đường răng cưa với hai khuyết tròn tách cuống "Lần trước" khỏi mặt số. Hệ thống được viết lại từ prototype đã dựng (`prototypes/workout-log/index.html`), nên mọi giá trị dưới đây là giá trị thật đã chạy.

Mật độ cao nhưng chỉ có một thứ to: con số của set hiện tại. Mọi thứ bậc còn lại dựa vào độ đậm, chữ hoa giãn và nền đảo (đen trên trắng thành trắng trên đen), không dựa vào thêm cỡ chữ. Bề mặt phẳng, không gradient, không bóng đổ trang trí. Trạng thái được vẽ bằng nền, viền inset và lớp phủ cắt theo thời gian.

Thế giới này từ chối bố cục mặc định của ngành: bảng set nhiều cột (SET | LẦN TRƯỚC | KG | REPS | ✓) cuộn dài trên nền tối với một màu neon.

**Key Characteristics:**
- Ba cỡ chữ cộng một cỡ số phụ: số áo (132px trở xuống), số phụ 28px, chữ đọc 16px, nhãn 12px chữ hoa.
- Dải đầu số áo là kênh trạng thái duy nhất: cam, lam rút dần, viền rỗng, viền đôi, đen.
- Nền Tyvek ấm-xám, mực đen tuyệt đối, không màu xám cho số liệu đã ghi.
- Vùng ngón cái ở đáy: điều khiển nghỉ nằm ngay trên nút Xong set 64px.
- Số kiểu Việt Nam: dấu phẩy thập phân (77,5), chấm giữa ngăn các set (80×8 · 8 · 7).

## Colors

Bảng màu như vật liệu in số áo: giấy Tyvek, mực đen, và ba màu mực in dải cự ly, mỗi màu một nghĩa.

### Primary
- **Cam Cự Ly** (`orange`): màu của thứ đang diễn ra và thứ bấm được. Nền dải số áo của set hiện tại, nút Xong set, viền chip bài hiện tại. Chữ trên cam luôn là mực đen (`ink`), không bao giờ là trắng. Cam còn xuất hiện ở con số PR trên nền đen, nút "Hoàn tác" trong toast, con trỏ nhập và vùng bôi chọn.
- **Cam Nhạt** (`orange-tint`): nền của thứ cần chú ý mà không phải nút: ô số đang được gõ, cuống gợi ý (khởi động, tăng, back-off), hàng set đang tập.

### Secondary
- **Lam Nghỉ** (`blue`): chỉ cho trạng thái nghỉ. Lớp phủ đồng hồ trên dải số áo, viền 2px inset quanh dải khi nghỉ, viền và chữ của hai nút điều khiển nghỉ (Thêm 30 giây, Bỏ qua nghỉ).

### Tertiary
- **Xanh Đã Xong** (`green`): chỉ cho "đã xong" và "đã đồng bộ". Dấu ✓ tròn 28px của hàng set, chấm trạng thái của chip đồng bộ, biểu tượng trong hộp đồng bộ ở trang tóm tắt.

### Neutral
- **Xám Tyvek** (`ground`): nền trang, nền vùng đáy, nền khuyết tròn của đường răng cưa.
- **Trắng Tyvek** (`tyvek`): mặt tấm số áo, khối hàng set, chip bài, sheet. Cũng là màu chữ trên nền mực.
- **Mực** (`ink`): mọi chữ và mọi con số; nền nút đen (Kết thúc, Lưu set, Thêm bài), dải PR, dải tóm tắt, hàng PR, toast, chip đồng bộ khi offline.
- **Kẻ** (`rule`): viền chip chưa chọn, nét răng cưa đứt, chấm tiến độ chưa xong, chữ giữ chỗ "–" trong ô số, nền công tắc tắt.
- **Kẻ Mờ** (`rule-soft`): đường ngăn giữa các hàng set, hàng menu, đường kẻ trên vùng đáy.
- **Trắng Trên Tín Hiệu** (`on-signal`): chữ và biểu tượng trên lam và xanh (lớp phủ nghỉ, dấu ✓), nút gạt của công tắc.

### Named Rules
**The Một Màu Một Nghĩa Rule.** Cam là "đang diễn ra / bấm được", lam là "đang nghỉ", xanh là "đã xong / đã đồng bộ". Không màu nào mượn nghĩa của màu khác; một nút phụ không bao giờ màu xanh, một thông báo không bao giờ màu lam.

**The Số Liệu Đen Rule.** Số đã ghi và số dự kiến luôn bằng mực đen. "Lần trước" khác biệt bằng cỡ (số phụ 28px) và vị trí (cuống dưới răng cưa), không bằng màu xám. Chỉ chữ giữ chỗ "–" của ô trống và chấm tiến độ chưa xong mới mang màu `rule`.

## Typography

**Display Font:** Barlow Condensed 800 (với sans-serif)
**Body Font:** Be Vietnam Pro 400–700 (với system-ui, sans-serif), tải kèm subset tiếng Việt
**Label Font:** Be Vietnam Pro 700 chữ hoa

**Character:** Barlow Condensed hẹp, đậm, chữ số đều cột như số in trên áo đua. Be Vietnam Pro dựng đúng dấu tiếng Việt và giữ giọng nói chuyện ấm cho câu gợi ý.

### Hierarchy
- **Bib** (800, 132 / 104 / 80 / 66px, line-height 0.9): hai con số trên mặt số áo (tạ × reps) và số lớn ở trang tóm tắt, trang buổi trống. Cỡ giảm theo độ dài chuỗi: 1–2 ký tự 132px, 3 ký tự 104px, 4 ký tự 80px, dài hơn 66px. Hai số trong một cặp luôn dùng chung cỡ nhỏ hơn.
- **Numeral** (800, 28px, line-height 1): số phụ duy nhất. Dùng cho đồng hồ buổi tập, số set trên dải, đồng hồ nghỉ, giá trị hàng set, số "Lần trước", số PR và nhãn nút Xong set (chữ hoa).
- **Body** (400, 16px, line-height 1.45): câu gợi ý, mô tả, nội dung sheet. Tên buổi, tên bài, nhãn nút dùng cùng cỡ ở 600–700. Câu trong khối trống giới hạn 30ch.
- **Label** (700, 12px, letter-spacing 0.08em, chữ hoa): nhãn cho dữ liệu và trường nhập: "kg", "reps", tên bài trên dải, "LẦN TRƯỚC · 12/11", nhãn trường trong sheet, chú thích "SUPERSET" trên ngoặc nhóm. Nhãn cột hàng set dùng 0.06em. Cùng cỡ 12px không hoa cho dòng phụ (chip đồng bộ, dòng thiết bị dưới mặt số, dòng nhỏ trong menu).

### Named Rules
**The Ba Cỡ Cộng Một Rule.** Chỉ có cỡ số áo, số phụ 28px, chữ đọc 16px và nhãn 12px. Muốn nhấn thì đổi độ đậm, chữ hoa hoặc đảo nền, không thêm cỡ mới.

**The Dấu Phẩy Việt Rule.** Mọi số hiển thị đi qua định dạng `vi-VN`: 77,5 kg, 2,5 kg. Ô nhập chấp nhận cả dấu phẩy lẫn dấu chấm khi gõ.

## Layout

Một cột điện thoại rộng tối đa 440px, cao `100dvh`, chia bốn tầng cố định: thanh trên (tên buổi, đồng hồ, chip đồng bộ, nút Kết thúc), dải chip bài cuộn ngang, vùng cuộn giữa (tấm số áo rồi khối hàng set), vùng đáy cố định (điều khiển nghỉ, nút chính). Lề hai bên 16px cho thanh trên và chip, 12px cho vùng cuộn và vùng đáy. Vùng an toàn iOS được cộng vào đỉnh và đáy (`env(safe-area-inset-*)`).

Nhịp khoảng cách theo bước 4px: 4, 8, 12, 16, 24px. Khoảng giữa các khối là 12px. Chiều cao chạm tối thiểu 44px; hàng set 52px; dải số áo 56px; nút điều khiển nghỉ 48px; nút chính 64px.

Mặt số áo là lưới ba cột `1fr auto 1fr`: số tạ, dấu ×, số reps. Mỗi số có hàng −/nhãn/+ ngay bên dưới. Khi màn hình thấp hơn 700px, mặt số bớt khoảng đệm trên.

## Elevation & Depth

Hệ thống phẳng. Không có bóng đổ ra ngoài; chiều sâu đến từ ba lớp vật liệu (nền Xám Tyvek, tấm Trắng Tyvek, mực) và từ nền đảo. Box-shadow chỉ được dùng ở dạng viền inset để vẽ trạng thái, và lớp phủ mờ (mực 42%) chỉ nằm sau sheet.

### Shadow Vocabulary
- **Viền trạng thái** (`box-shadow: inset 0 0 0 2px <màu>`): dải khi nghỉ (lam), dải khởi động (mực).
- **Viền đôi sửa set** (`box-shadow: inset 0 0 0 2px ink, inset 0 0 0 5px tyvek, inset 0 0 0 6px ink`): dải khi đang sửa một set đã ghi.
- **Viền chip hiện tại** (`box-shadow: inset 0 0 0 1.5px orange` cộng viền 1.5px cam): làm dày viền chip bài hiện tại.

### Named Rules
**The Mực Không Bóng Rule.** Không bóng đổ trang trí, không gradient. Viền inset là thiết bị của thế giới này để nói trạng thái, không phải để nâng khối lên.

## Shapes

Góc bo vừa phải, như tấm số áo cắt máy: 8px cho nút, chip, ô và hàng điều khiển; 10px cho tấm số áo và các khối nội dung; 12px cho nút chính; 16px cho góc trên của sheet; tròn hoàn toàn cho chip đồng bộ, công tắc, dấu ✓ và chấm tiến độ.

Viền là ngôn ngữ chính: 1.5px mực cho nút viền và nút −/+, 1.5px `rule` cho chip chưa chọn, 2px lam cho điều khiển nghỉ. Nét đứt nghĩa là "nhóm" hoặc "mở": ngoặc superset viền đứt 1.5px mực, chip "Cả buổi" và hàng "Thêm set" viền đứt.

**Đường răng cưa** là hình dạng riêng của thế giới: một nét đứt 2px màu `rule` chạy ngang, hai đầu là hai khuyết tròn 18px màu nền cắt vào mép tấm số áo. Nó tách mặt số khỏi cuống "Lần trước".

## Components

### Buttons
Dứt khoát, chữ đậm, không hiệu ứng hover trang trí.
- **Shape:** góc 8px (`rounded.sm`), cao 44px, đệm ngang 16px, chữ 16px 700.
- **Nút chính (Xong set):** cam, chữ mực, Barlow Condensed 800 28px chữ hoa, cao 64px, rộng hết cột, góc 12px, luôn nằm ở đáy. Số set bên trong dùng numeral. Biến thể mực (`button-go-ink`) cho Lưu set, Sang bài, Kết thúc buổi tập, Thêm bài đầu tiên.
- **Nút mực:** nền mực, chữ Trắng Tyvek. Dùng cho hành động khẳng định trong sheet và cuống gợi ý ("Ừ, 75 kg", "Kết thúc buổi", "Thêm bài") và nút Kết thúc trên thanh trên (cao 40px).
- **Nút viền:** trong suốt, viền 1.5px mực. Dùng cho lựa chọn thay thế ("Giữ 80 kg", "Tập tiếp", "Bỏ qua khởi động").
- **Nút −/+:** 48×44px, viền 1.5px mực, biểu tượng 20px; khi nhấn đảo sang nền mực.
- **Nhấn / Focus:** nút chính lún 1px khi nhấn. Focus là viền 3px mực cách 2px, chuyển sang Trắng Tyvek trên nền tối hoặc trên dải.

### Chips
- **Chip bài:** nền Trắng Tyvek, viền 1.5px `rule`, cao 44px, số thứ tự 800 + tên bài 600 + chấm tiến độ 6px (mực khi set đã xong, `rule` khi chưa).
- **Hiện tại:** viền cam dày 3px (viền + inset). **Xong:** nền trong suốt, dấu ✓ xanh thay cho chấm.
- **Nhóm superset:** các chip cao 36px nằm trong ngoặc viền đứt 1.5px mực, góc 11px, chú thích "SUPERSET" nằm vắt trên mép.
- **Chip đồng bộ:** viên thuốc cao 32px, viền 1.5px mực, chữ 12px 600. Chấm xanh khi đã đồng bộ, chấm rỗng khi có set chờ, nền mực kèm biểu tượng mất sóng khi offline.

### Cards / Containers
- **Corner Style:** 10px (`rounded.md`).
- **Background:** Trắng Tyvek trên nền Xám Tyvek.
- **Shadow Strategy:** không có (xem Elevation & Depth).
- **Border:** không viền; khối tách nhau bằng khoảng 12px và độ chênh vật liệu.
- **Internal Padding:** 16px. Khối PR ở tóm tắt dùng nền mực với số cam.

### Inputs / Fields
- **Ô số áo:** không viền, nền trong suốt, chữ cỡ bib, căn giữa, con trỏ cam. Khi focus: nền Cam Nhạt, không viền. Nội dung được chọn hết khi vào ô; khi rời ô, giá trị được định dạng lại theo `vi-VN`.
- **Ô tìm kiếm:** cao 48px, viền 1.5px mực, góc 8px, biểu tượng kính lúp bên trái.
- **Nhóm chọn (segmented):** các nút 44px viền 1.5px `rule`; nút được chọn đảo sang nền mực chữ Trắng Tyvek.
- **Công tắc:** 52×32px, nền `rule` khi tắt, nền mực khi bật, núm trắng 26px trượt 20px.
- **Bước nhảy (stepper):** hai nút 44px viền mực kẹp số phụ 28px.

### Navigation
Không có thanh điều hướng tab. Điều hướng trong buổi là dải chip bài cuộn ngang (tự cuộn chip hiện tại vào tầm nhìn) cùng chip "Cả buổi" mở sheet sắp xếp. Sheet trượt từ đáy, nền Trắng Tyvek, góc trên 16px, có tay nắm 36×4px, cao tối đa 88%, đóng bằng nút ×, chạm lớp phủ hoặc Esc. Hàng menu cao 52px, ngăn bằng `rule-soft`.

### Tấm số áo (Signature Component)
Tấm Trắng Tyvek góc 10px gồm bốn phần: dải, mặt số, răng cưa, cuống.

**Dải đầu số áo** cao 56px, bên trái là tên bài (nhãn chữ hoa, tối đa hai dòng), bên phải là số set ("SET 3/4", numeral) và nút ⋯. Trạng thái của dải:
- **Cam, chữ mực:** set làm việc đang tập.
- **Viền rỗng 2px mực trên Trắng Tyvek:** set khởi động, hoặc bài đã xong hết set.
- **Viền đôi mực:** đang sửa một set đã ghi.
- **Nghỉ:** nền Trắng Tyvek, viền inset 2px lam, cộng một lớp lam chữ trắng phủ lên. Lớp này bị cắt theo biến `--p` (thời gian nghỉ còn lại / tổng) và rút dần từ phải sang trái, để lộ Trắng Tyvek bên dưới. Dải chính là đồng hồ nghỉ. Hết giờ, dải loé cam ba lần (0,9s, `steps(1)`), kèm âm báo và rung, rồi trở lại cam.
- **Mực, số cam:** PR mới, giữ 2,4 giây.
- **Mực:** dải tóm tắt cuối buổi.

**Mặt số** in "tạ × reps" ở cỡ bib, dưới mỗi số là hàng −/nhãn/+, dưới cùng là một dòng 12px mô tả dụng cụ, cách ghi tạ, bậc tạ và rep range. **Cuống** dưới răng cưa: nhãn "LẦN TRƯỚC · ngày", số buổi trước ở numeral, câu gợi ý 16px. Khi có gợi ý (tăng, back-off, khởi động), cuống chuyển sang khối Cam Nhạt có nút trả lời.

**Hàng set** (52px) nằm trong khối Trắng Tyvek bên dưới: nhãn cột 12px ("SET 1", "KĐ"), giá trị numeral (800 khi đã ghi, 600 khi dự kiến), trạng thái bên phải. Hàng đang tập nền Cam Nhạt; hàng PR nền mực, chữ trạng thái cam. Các set khởi động đã xong gộp thành một hàng "KĐ 40 · 55 · 67,5".

**Điều khiển nghỉ** nằm trong vùng đáy, ngay trên nút chính: hai nút cao 48px, viền 2px lam, chữ lam, khi nhấn đảo sang nền lam chữ trắng.

**Chuyển động:** easing chung `cubic-bezier(.16,1,.3,1)`, chỉ trượt dọc, không nảy. Set vừa ghi trượt vào hàng (14px, 0,32s); mặt số mới trượt lên (16px, 0,26s); sheet 0,28s; trang tóm tắt 0,34s; lớp phủ nghỉ cắt tuyến tính 0,25s mỗi nhịp. Khi bật `prefers-reduced-motion`, mọi chuyển động gần như tức thời.

## Do's and Don'ts

### Do:
- **Do** để con số của set hiện tại là thứ duy nhất ở cỡ số áo, và để hai số trong cặp tạ × reps luôn cùng cỡ (132 / 104 / 80 / 66px theo số dài hơn).
- **Do** đặt chữ mực (#111111) trên nền cam; chỉ dùng chữ trắng trên lam và xanh.
- **Do** giữ nút chính 64px ở đáy và điều khiển nghỉ ngay trên nó, trong vùng ngón cái.
- **Do** để nút Xong set luôn bấm được: thiếu số thì đưa con trỏ tới ô trống và nói lý do bằng toast, không khoá nút.
- **Do** định dạng mọi số theo `vi-VN` (77,5) và ngăn các set bằng chấm giữa.
- **Do** vẽ trạng thái bằng nền, viền inset và đảo nền; giữ thay đổi sáng tới khi người tập thấy, và cho hàng trượt vào chứ không biến mất.
- **Do** dùng biểu tượng nét 2px kiểu lucide, 20px, `currentColor`.

### Don't:
- **Don't** dựng bảng set nhiều cột (SET | LẦN TRƯỚC | KG | REPS | ✓) cuộn dài trên nền tối với một màu neon.
- **Don't** thêm cỡ chữ thứ năm; nhấn bằng độ đậm, chữ hoa hoặc đảo nền.
- **Don't** in số liệu đã ghi hay "lần trước" bằng màu xám.
- **Don't** dùng xanh cho bất cứ thứ gì ngoài "đã xong / đã đồng bộ", hoặc lam cho bất cứ thứ gì ngoài nghỉ.
- **Don't** dùng bóng đổ ra ngoài, gradient hay hiệu ứng nảy.
- **Don't** dùng nhãn chữ hoa 12px làm dòng tiêu đề nhỏ trang trí phía trên tiêu đề; nhãn chỉ đặt tên cho dữ liệu và trường nhập.
- **Don't** thêm vòng tiến độ, huy hiệu hay gamification.
