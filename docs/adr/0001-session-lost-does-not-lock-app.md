# Mất phiên không khoá app; chỉ đăng xuất chủ động mới xoá dữ liệu trên máy

App là local-first và user có thể đang giữa buổi tập khi phiên Supabase bị thu hồi (vd refresh token bị coi là dùng lại vì mạng phòng gym chập chờn). Vì vậy quyền vào app dựa trên **chủ máy** (user id lưu trong IndexedDB) chứ không chỉ dựa vào phiên: có phiên *hoặc* có chủ máy thì vào được app. Khi mất phiên, app chạy tiếp ở trạng thái "cần đăng nhập lại" (ghi set vẫn được, ngừng đồng bộ, có banner không chặn để đăng nhập lại rồi quay về đúng trang), không chuyển sang màn đăng nhập. Chỉ khi **đăng xuất chủ động** thì máy mới quên chủ máy và xoá dữ liệu trên máy. Đăng nhập lại bằng user khác chủ máy thì xoá dữ liệu cũ, có cảnh báo trước nếu còn dữ liệu chưa đồng bộ.

## Consequences

- Phiên bị thu hồi vì lý do bảo mật (vd mất máy) vẫn để lộ dữ liệu trên máy cho tới khi có người tự đăng xuất. Chấp nhận ở MVP.
- Route guard không được viết theo kiểu "không có session thì redirect về `/sign-in`"; chỉ redirect khi không có phiên **và** máy chưa có chủ.
