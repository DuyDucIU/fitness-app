# Routine và catalog chỉ cache để đọc; ghi ngoài outbox cần mạng

Engine chạy trên máy và phải gợi ý được khi offline. Vì vậy nó cần routine, catalog bài tập, cài đặt bài tập và lịch sử deload nằm sẵn trên máy. Dữ liệu được chia ba nhóm:

- **Local-first qua outbox** (lưu trên máy, đẩy qua outbox, kéo về bằng pull):
  - buổi tập và set;
  - cài đặt bài tập (cả dòng, upsert theo user × bài);
  - gợi ý cùng trạng thái của nó;
  - giai đoạn deload.

  Ba loại sau cùng đi qua outbox **dù sửa từ màn nào**, vì chúng thường phát sinh ngay lúc tập, có thể đúng lúc mất mạng ở phòng gym.
- **Cache chỉ đọc:**
  - routine (kèm ngày tập và bài);
  - catalog bài tập.

  Cache được làm mới khi có mạng. Tìm bài offline khớp không dấu trên cache; `pg_trgm` chỉ dùng khi có mạng.
- **Ghi cần mạng**, gọi REST thẳng:
  - tạo/sửa routine, chọn program;
  - tạo bài tuỳ chỉnh, alias;
  - cài đặt tài khoản, mục tiêu, chỉ số cơ thể, onboarding.

  Offline thì app báo cần có mạng, không xếp hàng chờ.

Phương án bị loại: cho mọi dữ liệu local-first qua outbox, như prototype màn Plans đang làm. Cách đó buộc cả cây routine → ngày tập → bài phải có tombstone, cursor và xử lý xung đột riêng, trong khi sửa routine lúc mất mạng là trường hợp hiếm.

## Consequences

- Prototype `prototypes/plans` xếp hàng thao tác khi offline. Bản thật chỉ làm vậy với cài đặt bài tập.
- Bài tuỳ chỉnh không tạo được khi offline, kể cả giữa buổi tập tự do.
- Cài đặt bài tập có hai chiều đồng bộ (đẩy từ máy, kéo từ server). Xung đột xử lý last-write-wins, chấp nhận được vì mỗi user dùng một máy.
