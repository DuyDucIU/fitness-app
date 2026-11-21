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
