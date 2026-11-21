# Fitness App

Ứng dụng ghi buổi tập tạ (PWA, local-first) cho người tập ở Việt Nam. Thuật ngữ dưới đây là ngôn ngữ chung giữa tài liệu (SRS/SDD), code và trao đổi.

## Tài khoản & phiên

**Chủ máy** (device owner):
User có dữ liệu đang nằm trên máy (trình duyệt hoặc PWA đã cài) này. Máy có tối đa một chủ; chủ máy vẫn còn khi phiên đăng nhập đã mất.
_Avoid_: current user, người dùng hiện tại (dễ nhầm với user của phiên)

**Phiên đăng nhập** (session):
Bằng chứng với server rằng chủ máy là ai, cho phép gọi API và đồng bộ. Không cần phiên để ghi buổi tập trên máy.
_Avoid_: login, token (khi nói ở mức nghiệp vụ)

**Đăng xuất** (sign out):
Hành động user **tự chọn**: máy quên phiên, chủ máy và toàn bộ dữ liệu trên máy.
_Avoid_: logout, bị đăng xuất (cho trường hợp không do user chọn)

**Mất phiên** (session lost):
Phiên kết thúc mà user không chọn (bị thu hồi, refresh bị từ chối). Chủ máy và dữ liệu trên máy giữ nguyên; máy chuyển sang trạng thái cần đăng nhập lại.
_Avoid_: bị đăng xuất, hết hạn đăng nhập

**Cần đăng nhập lại** (re-auth needed):
Trạng thái máy có chủ nhưng mất phiên: vẫn dùng và ghi buổi tập bình thường, chỉ ngừng đồng bộ cho tới khi chủ máy đăng nhập lại.

## Lịch tập

**Routine** (VI: lịch tập):
Lịch tập của riêng một user, gồm nhiều ngày tập theo thứ tự. User tự soạn hoặc chép từ một program.
_Avoid_: plan, chương trình, kế hoạch

**Routine đang dùng** (active routine):
Routine mà màn Today lấy ngày tập để bắt đầu buổi. Mỗi user có tối đa một routine đang dùng.

**Ngày tập** (day):
Một ngày trong routine (vd "Push A"), là danh sách bài kèm số set, rep range và thời gian nghỉ.
_Avoid_: plan day, buổi (buổi là lần tập thật)

**Program** (VI: chương trình mẫu):
Lịch tập soạn sẵn do hệ thống cung cấp. Chọn một program tạo ra một routine mới của user, độc lập với program gốc.
_Avoid_: template, plan mẫu

## Buổi tập

**Buổi tập** (workout session):
Một lần tập thật, có giờ bắt đầu và kết thúc, theo một ngày tập hoặc tập tự do.
_Avoid_: workout (khi nói về routine), ngày tập

**Tập tự do** (freestyle):
Buổi tập không theo ngày tập nào; user tự thêm bài trong lúc tập.
_Avoid_: empty workout, quick start

**Bài ad hoc**:
Bài trong buổi tập không gắn với bài nào của ngày tập (thêm mới hoặc thay bài giữa buổi). Số liệu "lần trước" tính theo lịch sử của chính bài đó.

**Tab Plans**:
Màn gốc chứa routine, program và thư viện bài tập. Tên tab không phải thuật ngữ: không gọi routine là "plan".

## Dữ liệu trên máy

**Outbox**:
Hàng đợi trên máy các thay đổi chờ đẩy lên server, theo đúng thứ tự đã ghi. Chỉ dữ liệu sinh ra trong lúc tập đi qua outbox: buổi tập, set, gợi ý, deload, cài đặt bài tập.

**Cache chỉ đọc**:
Bản sao trên máy của dữ liệu server mà engine và màn bắt đầu buổi cần khi offline (routine, cài đặt bài tập, deload, catalog bài tập). Không sửa trực tiếp; làm mới khi có mạng.
