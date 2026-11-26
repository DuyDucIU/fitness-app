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
  danger: "#B42318"
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
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-signal}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "44px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.tyvek}"
  segment-stack:
    backgroundColor: "{colors.tyvek}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
    height: "56px"
  segment-stack-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.tyvek}"
  subtab:
    backgroundColor: "{colors.tyvek}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    height: "40px"
  subtab-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.tyvek}"
  input:
    backgroundColor: "{colors.on-signal}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "48px"
  select:
    backgroundColor: "{colors.on-signal}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 40px 0 12px"
    height: "48px"
  list-row:
    backgroundColor: "{colors.tyvek}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "8px 12px 8px 16px"
    height: "52px"
  tab-bar:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
  tab:
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "52px"
  week-cell:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    width: "32px"
    height: "38px"
  week-cell-done:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.tyvek}"
  resume-bar:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "6px 8px 6px 16px"
    height: "56px"
  banner:
    backgroundColor: "{colors.tyvek}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "12px 8px 12px 14px"
  alert:
    backgroundColor: "{colors.tyvek}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.tyvek}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "10px 14px"
  skeleton:
    backgroundColor: "{colors.rule-soft}"
---

# Design System: Fitness App

## Overview

**Creative North Star: "Số áo thi đấu"**

Mỗi set là một tấm số áo vận động viên: con số sắp nâng in to như số báo danh, đọc được khi điện thoại nằm trên ghế cách hai mét. Màn hình là một cột điện thoại (tối đa 440px) trên nền xám Tyvek lạnh. Mỗi tấm số áo có một dải màu in tràn ở đầu, và dải này mang trạng thái của set. Mặt số chỉ có hai con số và dấu nhân. Một đường răng cưa với hai khuyết tròn tách cuống "Lần trước" khỏi mặt số. Hệ thống được viết lại từ prototype đã dựng (`prototypes/workout-log/index.html`), nên mọi giá trị dưới đây là giá trị thật đã chạy.

Mật độ cao nhưng chỉ có một thứ to: con số của set hiện tại. Mọi thứ bậc còn lại dựa vào độ đậm, chữ hoa giãn và nền đảo (đen trên trắng thành trắng trên đen), không dựa vào thêm cỡ chữ. Bề mặt phẳng, không gradient, không bóng đổ trang trí. Trạng thái được vẽ bằng nền, viền inset và lớp phủ cắt theo thời gian.

Thế giới này từ chối bố cục mặc định của ngành: bảng set nhiều cột (SET | LẦN TRƯỚC | KG | REPS | ✓) cuộn dài trên nền tối với một màu neon.

Ngoài buổi tập, cùng thế giới được mở rộng sang các màn gốc (Today, Plans, History, Progress, Me) và màn bắt đầu, dựng trong `prototypes/shared/` (`base.css`, `kit.js`, `chart.js`) cùng các slice `prototypes/home|plans|history|progress|me|start/`. Routine là một ví số áo: mỗi ngày tập là một tấm số áo vuốt ngang, ngày kế tiếp nằm giữa và cách nút Bắt đầu một chạm; mọi thứ khác nằm sau thanh tab đáy năm mục. Các giá trị bổ sung dưới đây lấy từ code đã dựng đó.

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
- **Lam Nghỉ** (`blue`): chỉ cho trạng thái nghỉ. Lớp phủ đồng hồ trên dải số áo, viền 2px inset quanh dải khi nghỉ, viền và chữ của ba nút điều khiển nghỉ (Dừng/Tiếp, +30 giây, Bỏ qua).

### Tertiary
- **Xanh Đã Xong** (`green`): chỉ cho "đã xong" và "đã đồng bộ". Dấu ✓ tròn 28px của hàng set, chấm trạng thái của chip đồng bộ, biểu tượng trong hộp đồng bộ ở trang tóm tắt.

### Danger
- **Đỏ Xoá** (`danger`): chỉ cho hành động phá huỷ và lỗi. Chữ của hàng menu và hàng danh sách "Xoá / Gỡ", nền nút nguy hiểm (chữ `on-signal`), viền inset 2px của khối cảnh báo lỗi và biểu tượng trong đó, chữ lỗi dưới trường nhập, viền ô nhập không hợp lệ. Không bao giờ dùng làm điểm nhấn hay chuỗi dữ liệu.

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

**The Mực Là Chọn Rule.** Trạng thái "đã chọn" luôn là nền mực chữ Trắng Tyvek: chip lọc, nhóm chọn, lựa chọn xếp chồng, tab con. Viền cam chỉ dành cho "hiện tại / hôm nay" (ô hôm nay trên dòng tuần, chip bài hiện tại trong buổi), không bao giờ cho lựa chọn.

## Typography

**Display Font:** Barlow Condensed 800 (với sans-serif)
**Body Font:** Be Vietnam Pro 400–700 (với system-ui, sans-serif), tải kèm subset tiếng Việt
**Label Font:** Be Vietnam Pro 700 chữ hoa

**Character:** Barlow Condensed hẹp, đậm, chữ số đều cột như số in trên áo đua. Be Vietnam Pro dựng đúng dấu tiếng Việt và giữ giọng nói chuyện ấm cho câu gợi ý.

### Hierarchy
- **Bib** (800, 132 / 104 / 80 / 66px, line-height 0.9): hai con số trên mặt số áo (tạ × reps) và số lớn ở trang tóm tắt, trang buổi trống. Trên mặt số đang ghi set, mọi con số (kg, reps, thời gian) dùng **một cỡ cố định 80px**, xuống `20.3vw` trên máy hẹp (73px ở khổ 360). Bấm − hoặc + không bao giờ đổi cỡ chữ hay dịch nút, và reps không đổi cỡ theo kg. Hàng số và hàng nút đều chia đôi bằng nhau: mỗi số nằm ngay trên cặp nút của nó, dấu × nằm đúng đường giữa. Chỉ giá trị 5 ký tự không vừa nửa ô (102.5, 142.5, +12.5) mới thu nhỏ, và chỉ trong chính ô đó (khoảng 63–66px ở khổ 390). Trang tóm tắt và trang buổi trống vẫn dùng thang 132 / 104 / 80 / 66px theo độ dài.
- **Numeral** (800, 28px, line-height 1): số phụ duy nhất. Dùng cho đồng hồ buổi tập, số set trên dải, đồng hồ nghỉ, giá trị hàng set, số "Lần trước", số PR và nhãn nút Xong set (chữ hoa).
- **Body** (400, 16px, line-height 1.45): câu gợi ý, mô tả, nội dung sheet. Tên buổi, tên bài, nhãn nút dùng cùng cỡ ở 600–700. Câu trong khối trống giới hạn 30ch.
- **Label** (700, 12px, letter-spacing 0.08em, chữ hoa): nhãn cho dữ liệu và trường nhập: "kg", "reps", tên bài trên dải, "LẦN TRƯỚC · 12/11", nhãn trường trong sheet, chú thích "SUPERSET" trên ngoặc nhóm. Nhãn cột hàng set dùng 0.06em. Cùng cỡ 12px không hoa cho dòng phụ (chip đồng bộ, dòng thiết bị dưới mặt số, dòng nhỏ trong menu).

### Named Rules
**The Ba Cỡ Cộng Một Rule.** Chỉ có cỡ số áo, số phụ 28px, chữ đọc 16px và nhãn 12px. Muốn nhấn thì đổi độ đậm, chữ hoa hoặc đảo nền, không thêm cỡ mới.

**The Số Theo Ngôn Ngữ Rule.** Mọi số và ngày hiển thị đi qua module định dạng dùng chung, theo ngôn ngữ đang dùng: tiếng Anh 77.5 kg, Nov 19; tiếng Việt 77,5 kg, 19/11. Ô nhập chấp nhận cả dấu phẩy lẫn dấu chấm khi gõ, ở cả hai ngôn ngữ.

**Song ngữ (D27):** giao diện có tiếng Anh (gốc, mặc định) và tiếng Việt, nên mọi layout phải chịu được chữ của cả hai bản: chữ Việt có dấu chồng cao hơn và câu thường dài hơn bản Anh. Các prototype viết bằng tiếng Anh và số kiểu en-US, đúng với ngôn ngữ mặc định; câu chữ trong prototype là nguồn cho bản tiếng Anh.

## Layout

Một cột điện thoại rộng tối đa 440px, cao `100dvh`, chia bốn tầng cố định: thanh trên (tên buổi, đồng hồ, chip đồng bộ, nút Kết thúc), dải chip bài cuộn ngang, vùng cuộn giữa (tấm số áo rồi khối hàng set), vùng đáy cố định (điều khiển nghỉ, nút chính). Lề hai bên 16px cho thanh trên và chip, 12px cho vùng cuộn và vùng đáy. Vùng an toàn iOS được cộng vào đỉnh và đáy (`env(safe-area-inset-*)`).

Nhịp khoảng cách theo bước 4px: 4, 8, 12, 16, 24px. Khoảng giữa các khối là 12px. Chiều cao chạm tối thiểu 44px; hàng set 52px; dải số áo 56px; nút điều khiển nghỉ 48px; nút chính 64px.

Mặt số áo là lưới ba cột `1fr auto 1fr`: số tạ, dấu ×, số reps. Mỗi số có hàng −/nhãn/+ ngay bên dưới. Khi màn hình thấp hơn 700px, mặt số bớt khoảng đệm trên.

**Màn gốc ngoài buổi tập** dùng cùng cột 440px, chia ba tầng: thanh trên cao tối thiểu 64px (tiêu đề 16px 700, dòng phụ 12px, chip đồng bộ bên phải), vùng cuộn giữa (lề 12px, khối cách nhau 12px, tiêu đề nhóm 16px 700), và vùng đáy gồm nút chính 64px nằm trên thanh tab 5 mục. Thanh tiếp tục buổi (resume) và banner nằm giữa thanh trên và vùng cuộn, lề ngang 12px. Màn đi sâu (chi tiết) trượt đè từ phải sang (`translateX(100%)` về 0, 0,28s) trên nền Xám Tyvek, có nút quay lại và không có tab.

**Today:** dòng tuần bảy ô 32×38px cách nhau 5px, lề 16px, bên phải là số buổi tuần / chuỗi tuần (numeral trên dòng 12px). Bên dưới là ví số áo: ray cuộn ngang `scroll-snap-type: x mandatory`, đệm hai bên 28px, khoảng giữa các tấm 10px, mỗi tấm rộng `100% - 4px` và căn giữa khi dừng, nên hai tấm bên cạnh ló ra ở hai mép. Tấm không ở giữa mờ còn 82%. Chấm phân trang nằm ngay dưới ví, trên nút Bắt đầu.

## Elevation & Depth

Hệ thống phẳng. Không có bóng đổ ra ngoài; chiều sâu đến từ ba lớp vật liệu (nền Xám Tyvek, tấm Trắng Tyvek, mực) và từ nền đảo. Box-shadow chỉ được dùng ở dạng viền inset để vẽ trạng thái, và lớp phủ mờ (mực 42%) chỉ nằm sau sheet.

### Shadow Vocabulary
- **Viền trạng thái** (`box-shadow: inset 0 0 0 2px <màu>`): dải khi nghỉ (lam), dải khởi động (mực).
- **Viền đôi sửa set** (`box-shadow: inset 0 0 0 2px ink, inset 0 0 0 5px tyvek, inset 0 0 0 6px ink`): dải khi đang sửa một set đã ghi.
- **Viền chip hiện tại** (`box-shadow: inset 0 0 0 1.5px orange` cộng viền 1.5px cam): làm dày viền chip bài hiện tại.
- **Viền ô hôm nay** (`box-shadow: inset 0 0 0 1.5px orange` cộng viền 1.5px cam; 2px khi ô hôm nay đã xong và đã tô mực): ô hôm nay trên dòng tuần.
- **Viền banner** (`box-shadow: inset 0 0 0 1.5px ink`): banner thông tin (cài app trên iOS, có bản cập nhật) trên nền Trắng Tyvek.
- **Viền cảnh báo lỗi** (`box-shadow: inset 0 0 0 2px danger`): khối alert khi tải hoặc lưu thất bại.
- **Viền focus ô nhập** (`box-shadow: inset 0 0 0 1.5px ink`, cộng với viền 1.5px thành 3px): ô nhập đang focus; `danger` thay mực khi không hợp lệ.

### Named Rules
**The Mực Không Bóng Rule.** Không bóng đổ trang trí, không gradient. Viền inset là thiết bị của thế giới này để nói trạng thái, không phải để nâng khối lên.

## Shapes

Góc bo vừa phải, như tấm số áo cắt máy: 8px cho nút, chip, ô và hàng điều khiển; 10px cho tấm số áo và các khối nội dung; 12px cho nút chính; 16px cho góc trên của sheet; tròn hoàn toàn cho chip đồng bộ, công tắc, dấu ✓ và chấm tiến độ.

Viền là ngôn ngữ chính: 1.5px mực cho nút viền và nút −/+, 1.5px `rule` cho chip chưa chọn, 2px lam cho điều khiển nghỉ. Nét đứt nghĩa là "nhóm" hoặc "mở": ngoặc superset viền đứt 1.5px mực, chip "Cả buổi" và hàng "Thêm set" viền đứt.

**Đường răng cưa** là hình dạng riêng của thế giới: một nét đứt 2px màu `rule` chạy ngang, hai đầu là hai khuyết tròn 18px màu nền cắt vào mép tấm số áo. Nó tách mặt số khỏi cuống "Lần trước".

Trên các màn gốc, răng cưa cũng tách phần kế hoạch của một tấm ngày tập khỏi cuống gợi ý. Vạch chỉ tab hiện tại là thanh mực 3px, góc dưới bo 3px. Đầu cột biểu đồ bo 4px, chân cột vuông. Chấm phân trang hiện tại kéo dài từ chấm tròn 6px thành viên thuốc 14×6px.

## Components

### Buttons
Dứt khoát, chữ đậm, không hiệu ứng hover trang trí.
- **Shape:** góc 8px (`rounded.sm`), cao 44px, đệm ngang 16px, chữ 16px 700.
- **Nút chính (Xong set):** cam, chữ mực, Barlow Condensed 800 28px chữ hoa, cao 64px, rộng hết cột, góc 12px, luôn nằm ở đáy. Số set bên trong dùng numeral. Biến thể mực (`button-go-ink`) cho Lưu set, Sang bài, Kết thúc buổi tập, Thêm bài đầu tiên.
- **Nút mực:** nền mực, chữ Trắng Tyvek. Dùng cho hành động khẳng định trong sheet và cuống gợi ý ("Ừ, 75 kg", "Kết thúc buổi", "Thêm bài") và nút Kết thúc trên thanh trên (cao 40px).
- **Nút viền:** trong suốt, viền 1.5px mực. Dùng cho lựa chọn thay thế ("Giữ 80 kg", "Tập tiếp", "Bỏ qua khởi động").
- **Nút −/+:** 48×44px, viền 1.5px mực, biểu tượng 20px; khi nhấn đảo sang nền mực.
- **Nhấn / Focus:** nút chính lún 1px khi nhấn. Focus là viền 3px mực cách 2px, chuyển sang Trắng Tyvek trên nền tối hoặc trên dải.
- **Nút nguy hiểm (`button-danger`):** nền `danger`, chữ trắng, cùng hình nút 44px. Chỉ cho xác nhận xoá trong sheet; ở danh sách và menu, hành động xoá là hàng chữ `danger`, không phải nút đặc.
- **Nút cam nhỏ và nút chữ:** nút 44px nền cam chữ mực cho hành động bấm được thứ cấp; nút chữ gạch chân (đệm 8px) cho lối phụ như "Show as table". Nút bị khoá mờ 40%; nút đang chờ hiện vòng quay 16px viền `currentColor`.
- **Nút Bắt đầu (Today):** `button-go` 64px trên thanh tab. Nhãn đổi theo tấm đang ở giữa ví ("Start Push A"); cam khi đó là ngày kế tiếp, mực (`button-go-ink`) khi người tập vuốt sang ngày khác.

### Chips
- **Chip bài:** nền Trắng Tyvek, viền 1.5px `rule`, cao 44px, số thứ tự 800 + tên bài 600 + chấm tiến độ 6px (mực khi set đã xong, `rule` khi chưa).
- **Hiện tại:** viền cam dày 3px (viền + inset). **Xong:** nền trong suốt, dấu ✓ xanh thay cho chấm.
- **Nhóm superset:** các chip cao 36px nằm trong ngoặc viền đứt 1.5px mực, góc 11px, chú thích "SUPERSET" nằm vắt trên mép.
- **Chip đồng bộ:** viên thuốc cao 32px, viền 1.5px mực, chữ 12px 600. Chấm xanh khi đã đồng bộ, chấm rỗng khi có set chờ, nền mực kèm biểu tượng mất sóng khi offline.
- **Chip lọc / lựa chọn (`chip-selected`):** cùng chip 44px viền `rule`; khi được chọn (`aria-pressed`) đảo sang nền mực chữ Trắng Tyvek, viền mực. Chip viền đứt mực nghĩa là "thêm / mở". Dải chip cuộn ngang, ẩn thanh cuộn.

### Cards / Containers
- **Corner Style:** 10px (`rounded.md`).
- **Background:** Trắng Tyvek trên nền Xám Tyvek.
- **Shadow Strategy:** không có (xem Elevation & Depth).
- **Border:** không viền; khối tách nhau bằng khoảng 12px và độ chênh vật liệu.
- **Internal Padding:** 16px. Khối PR ở tóm tắt dùng nền mực với số cam.

### Lists / Rows
- **Hàng danh sách (`list-row`):** trong khối Trắng Tyvek, cao tối thiểu 52px, đệm `8px 12px 8px 16px`, ngăn bằng 1px `rule-soft`. Tên 16px 600 có dòng phụ 12px 400; bên phải là giá trị numeral hoặc chữ trạng thái 12px chữ hoa, rồi mũi tên chevron 20px khi hàng dẫn sang màn khác. Nhấn: nền `rule-soft`.
- **Biến thể:** hàng "Thêm" căn giữa, viền trên đứt `rule`; hàng hiện tại nền Cam Nhạt; hàng kỷ lục nền mực, chữ cuối cam; hàng xoá chữ `danger`.
- **Kéo để sắp xếp:** mọi danh sách sắp xếp được (ngày trong routine, bài trong ngày, bài trong buổi đang tập) dùng tay nắm 6 chấm 44×44px ở đầu hàng; không dùng nút mũi tên lên/xuống. Hàng đang kéo nổi theo ngón tay với viền inset 2px mực (không bóng đổ), tay nắm đảo sang nền mực, các hàng khác trượt nhường chỗ 0,18s. Bàn phím: Space nhấc/thả, ↑/↓ di chuyển, Esc huỷ; hàng đang nhấc có viền đôi. Kéo một bài ra khỏi nhóm superset thì bài đó rời nhóm và có toast báo. Dưới danh sách có một dòng gợi ý 12px kèm biểu tượng tay nắm.
- **Xoá:** không đặt nút thùng rác trên từng hàng. Xoá nằm một tầng bên trong (sheet của bài, cuối màn sửa ngày, cuối màn sửa routine) dưới dạng hàng chữ `danger`, và luôn có toast "Hoàn tác" 5 giây thay cho hộp xác nhận; riêng xoá cả routine và xoá tài khoản vẫn có bước xác nhận.
- **Sửa:** bản ghi nhỏ chỉ có một giá trị (như số đo cơ thể) thì chạm cả hàng để mở sheet sửa, gồm các trường đã điền sẵn, nút Save ở chân sheet và hàng xoá `danger` bên dưới. Không đặt bút chì trên hàng. Chế độ "Edit → Save" cho cả danh sách chỉ dùng cho bản ghi gồm nhiều dòng sửa cùng lúc, như các set của một buổi tập trong History.

### Banners & Feedback
- **Thanh tiếp tục buổi (`resume-bar`):** khi còn buổi tập đang mở, thanh cam 56px góc 10px nằm dưới thanh trên của mọi màn gốc: tên buổi (nhãn chữ hoa, dòng phụ 16px 600 thường), thời gian đã tập ở numeral, nút mực "Resume" 40px. Cả thanh là một liên kết về buổi tập.
- **Banner (`banner`):** nền Trắng Tyvek, viền inset 1.5px mực, góc 10px; câu 16px với dòng đầu đậm, nút × 44px bên phải. Cho gợi ý cài app iOS và thông báo có bản cập nhật.
- **Cảnh báo lỗi (`alert`):** nền Trắng Tyvek, viền inset 2px `danger`, biểu tượng `danger`, tiêu đề đậm và câu giải thích, đệm `14px 16px`.
- **Toast:** nền mực chữ Trắng Tyvek, góc 8px, đệm `10px 14px`, chữ 600; nút hành động (Hoàn tác) màu cam. Nằm trên vùng đáy (cách đáy 104px), trượt lên 12px trong 0,26s.
- **Skeleton:** khối `rule-soft` góc 6px, nhịp mờ 55% chu kỳ 1,2s; giữ đúng hình của nội dung sắp tải.
- **Khối trống:** căn giữa, câu tối đa 30ch, có thể kèm một số cỡ bib và một nút.

### Inputs / Fields
- **Ô số áo:** không viền, nền trong suốt, chữ cỡ bib, căn giữa, con trỏ cam. Khi focus: nền Cam Nhạt, không viền. Nội dung được chọn hết khi vào ô; khi rời ô, giá trị được định dạng lại theo ngôn ngữ đang dùng (The Số Theo Ngôn Ngữ Rule).
- **Ô tìm kiếm:** cao 48px, viền 1.5px mực, góc 8px, biểu tượng kính lúp bên trái.
- **Ô nhập chữ (`input`):** cao 48px, viền 1.5px mực, góc 8px, nền trắng tinh (`on-signal`) để tách khỏi Trắng Tyvek của khối, đệm ngang 12px, chữ 16px, con trỏ cam. Focus: viền dày lên 3px bằng inset 1.5px mực, không glow. Không hợp lệ: viền và inset `danger`, dòng lỗi 12px 700 `danger` kèm biểu tượng 16px dưới ô. Nhãn trường là nhãn 12px chữ hoa phía trên (cách 8px), dòng trợ giúp 12px 600 phía dưới. Ô số ngắn dùng numeral 28px căn giữa, rộng 96px.
- **Danh sách chọn (`select`):** cùng hình ô nhập, mũi tên chevron 20px mực bên phải (đệm phải 40px).
- **Nhóm chọn (segmented):** các nút 44px viền 1.5px `rule`; nút được chọn đảo sang nền mực chữ Trắng Tyvek.
- **Lựa chọn xếp chồng (`segment-stack`):** nhóm chọn xếp dọc, mỗi lựa chọn cao tối thiểu 56px, căn trái, tên 16px 600 và dòng giải thích 12px 400; được chọn thì nền mực chữ Trắng Tyvek.
- **Tab con (`subtab`):** hàng nút chia đều cao 40px, viền 1.5px `rule`, nền Trắng Tyvek, cách nhau 6px (Sessions | PRs, khoảng thời gian của biểu đồ); tab hiện tại nền mực chữ Trắng Tyvek.
- **Công tắc:** 52×32px, nền `rule` khi tắt, nền mực khi bật, núm trắng 26px trượt 20px.
- **Bước nhảy (stepper):** hai nút 44px viền mực kẹp số phụ 28px.

### Navigation
**Ngoài buổi tập:** mỗi màn gốc có thanh tab đáy năm mục theo thứ tự Today / Plans / History / Progress / Me. Mỗi tab là vùng chạm cao 52px chia đều chiều ngang, biểu tượng nét 22px trên nhãn 12px (600; 700 khi hiện tại). Tab hiện tại (`aria-current="page"`) có vạch mực 3px ở mép trên, rộng 40% tab, góc dưới bo 3px; không dùng màu cam hay nền. Nhấn: nền `rule-soft`. Thanh nằm trên nền Xám Tyvek dưới đường kẻ `rule-soft`; nút chính 64px của màn (nếu có) nằm ngay trên thanh, cách 6px. **Trong buổi tập không có thanh tab.** Màn đi sâu (chi tiết buổi, sửa ngày tập, chi tiết bài) có nút quay lại 44px ở thanh trên và không có tab.

**Trong buổi tập:** điều hướng là dải chip bài cuộn ngang (tự cuộn chip hiện tại vào tầm nhìn) cùng chip "Cả buổi" mở sheet sắp xếp. Sheet trượt từ đáy, nền Trắng Tyvek, góc trên 16px, có tay nắm 36×4px, cao tối đa 88%, đóng bằng nút ×, chạm lớp phủ hoặc Esc. Hàng menu cao 52px, ngăn bằng `rule-soft`.

### Tấm số áo (Signature Component)
Tấm Trắng Tyvek góc 10px gồm bốn phần: dải, mặt số, răng cưa, cuống.

**Dải đầu số áo** cao 56px, bên trái là tên bài (nhãn chữ hoa, tối đa hai dòng), bên phải là số set ("SET 3/4", numeral) và nút ⋯. Trạng thái của dải:
- **Cam, chữ mực:** set làm việc đang tập.
- **Viền rỗng 2px mực trên Trắng Tyvek:** set khởi động, hoặc bài đã xong hết set.
- **Viền đôi mực:** đang sửa một set đã ghi.
- **Nghỉ:** nền Trắng Tyvek, viền inset 2px lam, cộng một lớp lam chữ trắng phủ lên. Lớp này bị cắt theo biến `--p` (thời gian nghỉ còn lại / tổng) và rút dần từ phải sang trái, để lộ Trắng Tyvek bên dưới. Dải chính là đồng hồ nghỉ. Khi tạm dừng, lớp lam đứng yên và nhãn REST đổi thành PAUSED. Hết giờ, dải loé cam ba lần (0,9s, `steps(1)`), kèm âm báo và rung, rồi trở lại cam.
- **Mực, số cam:** PR mới, giữ 2,4 giây.
- **Mực:** dải tóm tắt cuối buổi.

**Mặt số** in "tạ × reps" ở cỡ bib, dưới mỗi số là hàng −/nhãn/+, dưới cùng là một dòng 12px mô tả dụng cụ, cách ghi tạ, bậc tạ và rep range. **Cuống** dưới răng cưa: nhãn "LẦN TRƯỚC · ngày", số buổi trước ở numeral, câu gợi ý 16px. Khi có gợi ý (tăng, back-off, khởi động), cuống chuyển sang khối Cam Nhạt có nút trả lời.

**Hàng set** (52px) nằm trong khối Trắng Tyvek bên dưới: nhãn cột 12px ("SET 1", "KĐ"), giá trị numeral (800 khi đã ghi, 600 khi dự kiến), trạng thái bên phải. Hàng đang tập nền Cam Nhạt; hàng PR nền mực, chữ trạng thái cam. Các set khởi động đã xong gộp thành một hàng "KĐ 40 · 55 · 67,5".

**Hai khu set:** set khởi động và working set nằm ở hai khối tách nhau, cách 8px, mỗi khối có dòng đầu 44px (tiêu đề 16px 700 + dòng phụ 12px: "0/3 · không tính" / "2/4 · 6–8 reps"). Khối khởi động là vật liệu "mở": không nền, viền inset 1,5px `rule`, như dải khởi động viền rỗng; có nút chữ "Bỏ qua" ở góc phải. Khối working set là khối Trắng Tyvek đặc, chứa hàng "Thêm set". Số liệu trong cả hai khối vẫn mực đen.

**Mặt số theo cách ghi bài:** tấm số áo, dải band và nút chính giữ nguyên; chỉ mặt số đổi theo `metric_type` và quy ước ghi tạ.
- **Tạ × reps** (`weight_reps`): hai ô "80 × 8", như trên.
- **Reps, có thể đeo thêm tạ** (`reps` + `added_weight`: pull-up, dips, chin-up, push-up): ô trái là tạ đeo thêm, ghi "+5", và "BW" khi 0 kg (chỉ trọng lượng cơ thể). Ô trống cũng tính là BW, không bao giờ chặn nút log. Hàng set ghi "+5 × 8" / "BW × 12".
- **Chỉ reps** (`reps`, không tạ: crunch, hanging leg raise): một ô số duy nhất ở giữa. Hàng set ghi "12 reps".
- **Bấm giờ** (`duration`: plank): một ô m:ss, nút ± 5 giây. Gõ "45" là 0:45, "130" là 1:30. Nút chính đổi thành "Start set 1" rồi "Stop · log set 1". Ngay trên nút có lựa chọn "Log 1:00 without the timer" để ghi giờ đã gõ, và "Cancel, don't log" khi đang chạy. Khi đang giữ, dải band cam được lấp dần bằng mực tới trần thời gian mục tiêu; chạm trần thì kêu và nháy. **Không dùng lam**: lam chỉ dành cho nghỉ. Đồng hồ tính theo mốc bắt đầu, nên vẫn đúng sau khi app xuống nền.
- Khởi động (R5), back-off (R3), e1RM, quay lại sau nghỉ (R6) và deload (R7) chỉ áp dụng cho tạ × reps. Các kiểu còn lại chỉ có R1, và lời gợi ý đổi theo kiểu: "add reps or strap on some weight" / "add reps or hold a weight" / "time to hold a little longer".
- **PR theo kiểu bài:** e1RM cho tạ × reps; "most reps" khi ở BW hoặc với bài chỉ reps; "heaviest for N" (`weight_at_reps`) cho tạ đeo thêm. Bài bấm giờ chưa có loại PR trong schema.

**RPE (tuỳ chọn):** chỉ hiện khi bật trong onboarding hoặc Me, mặc định tắt. Không bao giờ thêm bước vào đường log.
- Câu hỏi "How hard was set 1 · +5 × 7?" xuất hiện ở cuống tấm số trong lúc nghỉ, sau khi set đã được ghi. Gồm 5 nút 6–10 cao 56px, giải thích bằng số rep còn lại ("2 left"); với bài bấm giờ thì dùng chữ ("hard").
- Chọn nút nào thì nút đó tô mực. Hàng set ghi "@8" sau số.
- Bỏ qua bằng cách log set tiếp theo. Câu hỏi đi theo sang bài kế trong superset, và mất khi tự chuyển sang bài khác.
- Sửa RPE trong chế độ sửa set.
- RPE 10 đúng ở đáy rep range cũng kích hoạt back-off (R3). Ngưỡng này nằm trong `ENGINE_DEFAULTS`.

**Điều khiển nghỉ** nằm trong vùng đáy, ngay trên nút chính: ba nút bằng nhau cao 48px (Dừng, đang dừng thì thành Tiếp · +30 giây · Bỏ qua), viền 2px lam, chữ lam, khi nhấn đảo sang nền lam chữ trắng. Đang dừng thì +30 giây cộng vào thời gian còn lại; ghi set mới bắt đầu lượt nghỉ mới và bỏ tạm dừng.

### Ví số áo (Signature Component, Today)
Các ngày tập của routine xếp thành một ray tấm số áo vuốt ngang, mỗi lần dừng đúng một tấm ở giữa (xem Layout). Mỗi tấm: dải đầu, danh sách bài đánh số (số thứ tự numeral, tên 16px 600, "sets × range" nhãn 12px), chú thích "SUPERSET" cho nhóm, dòng meta 12px (số phụ Barlow 16px), răng cưa, rồi cuống gợi ý (khối Cam Nhạt có lý do và nút trả lời) hoặc cuống "Before you start".
- **Ngày kế tiếp:** dải cam chữ mực, "<TÊN NGÀY> · NEXT UP" bên trái, "DAY n" numeral bên phải.
- **Các ngày khác:** dải viền rỗng 2px mực trên Trắng Tyvek, cùng bố cục.
- **Chấm phân trang:** một chấm 6px `rule` cho mỗi tấm trong vùng chạm 24px; chấm hiện tại là viên mực 14×6px.
- **Nút Bắt đầu đi theo ví:** khi tấm ở giữa đổi, nút đổi nhãn sang tên ngày đó; cam cho ngày kế tiếp, mực cho ngày khác.

### Charts
Một chuỗi dữ liệu, một điểm nhấn.
- **Chuỗi:** đường 2px mực (khớp tròn) hoặc cột mực. Cột rộng tối đa 24px, đầu cột bo 4px, chân vuông. Tuần deload là cột `rule`.
- **Điểm hiện tại / mới nhất:** đúng một điểm màu cam (chấm 5px viền Trắng Tyvek 2px, hoặc cột cam), luôn có nhãn giá trị Barlow 800 16px mực, vì cam chỉ đạt 2,98:1 trên Trắng Tyvek. Các chấm khác 4px mực.
- **Lưới và trục:** đường lưới ngang 1px `rule-soft`, khoảng 3–4 vạch tròn số; nhãn trục 12px 600 mực, số đều cột. Trục ngang ghi nhãn mọi điểm khi có tối đa 6 điểm (vd 4 tuần); nhiều hơn thì chỉ điểm đầu, giữa và cuối để chữ không chồng nhau.
- **Tương tác:** chạm hoặc rê hiện đường dóng mực mờ 35% và hộp mực chữ Trắng Tyvek (giá trị Barlow 16px). Mỗi biểu đồ có nút chữ "Show as table" chuyển sang bảng (đầu bảng nhãn 12px chữ hoa, gạch dưới 1.5px mực; hàng ngăn `rule-soft`; cột giá trị căn phải).
- **Trống:** khối trống căn giữa với một câu.

**The Một Chuỗi Mực Rule.** Biểu đồ chỉ dùng mực, một điểm cam và `rule`. Lam và xanh không bao giờ là chuỗi dữ liệu; chúng giữ nghĩa nghỉ và đã xong.

**Chuyển động:** easing chung `cubic-bezier(.16,1,.3,1)`, chỉ trượt dọc, không nảy. Set vừa ghi trượt vào hàng (14px, 0,32s); mặt số mới trượt lên (16px, 0,26s); sheet 0,28s; trang tóm tắt 0,34s; lớp phủ nghỉ cắt tuyến tính 0,25s mỗi nhịp. Khi bật `prefers-reduced-motion`, mọi chuyển động gần như tức thời.

## Do's and Don'ts

### Do:
- **Do** để con số của set hiện tại là thứ duy nhất ở cỡ số áo, và để hai số trong cặp tạ × reps luôn cùng một cỡ cố định 80px, không đổi khi bấm − hoặc +.
- **Do** đặt chữ mực (#111111) trên nền cam; chỉ dùng chữ trắng trên lam và xanh.
- **Do** giữ nút chính 64px ở đáy và điều khiển nghỉ ngay trên nó, trong vùng ngón cái.
- **Do** để nút Xong set luôn bấm được: thiếu số thì đưa con trỏ tới ô trống và nói lý do bằng toast, không khoá nút.
- **Do** định dạng mọi số theo ngôn ngữ đang dùng (en 77.5, vi 77,5 — The Số Theo Ngôn Ngữ Rule) và ngăn các set bằng chấm giữa.
- **Do** vẽ trạng thái bằng nền, viền inset và đảo nền; giữ thay đổi sáng tới khi người tập thấy, và cho hàng trượt vào chứ không biến mất.
- **Do** dùng biểu tượng nét 2px kiểu lucide, 20px, `currentColor`.
- **Do** đặt thanh tab 5 mục (Today / Plans / History / Progress / Me) trên mọi màn gốc ngoài buổi tập, với nút chính 64px của màn ngay trên nó; biểu tượng tab là ngoại lệ 22px.
- **Do** vẽ lựa chọn bằng nền mực chữ Trắng Tyvek; để viền cam cho "hiện tại / hôm nay".
- **Do** cho mỗi biểu đồ một chuỗi mực, đúng một điểm cam có nhãn giá trị, và nút "Show as table".

### Don't:
- **Don't** dựng bảng set nhiều cột (SET | LẦN TRƯỚC | KG | REPS | ✓) cuộn dài trên nền tối với một màu neon.
- **Don't** thêm cỡ chữ thứ năm; nhấn bằng độ đậm, chữ hoa hoặc đảo nền.
- **Don't** in số liệu đã ghi hay "lần trước" bằng màu xám.
- **Don't** dùng xanh cho bất cứ thứ gì ngoài "đã xong / đã đồng bộ", hoặc lam cho bất cứ thứ gì ngoài nghỉ.
- **Don't** dùng bóng đổ ra ngoài, gradient hay hiệu ứng nảy.
- **Don't** dùng nhãn chữ hoa 12px làm dòng tiêu đề nhỏ trang trí phía trên tiêu đề; nhãn chỉ đặt tên cho dữ liệu và trường nhập.
- **Don't** thêm vòng tiến độ, huy hiệu hay gamification.
- **Don't** hiện thanh tab trong buổi tập hoặc trên màn đi sâu; đừng giấu điều hướng sau menu hamburger.
- **Don't** dùng viền cam cho trạng thái đã chọn.
- **Don't** dùng lam hay xanh làm chuỗi dữ liệu trong biểu đồ, và đừng để điểm cam không có nhãn giá trị.
- **Don't** dùng `danger` cho gì ngoài xoá và lỗi.
