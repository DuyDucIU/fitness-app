# Ngoài buổi tập chỉ cache chỉ đọc; ghi cần mạng, trừ dữ liệu sinh ra trong lúc tập

Engine chạy trên máy và phải gợi ý được khi offline, nên nó cần routine, cài đặt bài tập, lịch sử deload và catalog bài tập nằm sẵn trên máy. Chúng tôi giữ các dữ liệu đó trong IndexedDB dưới dạng **cache chỉ đọc**, làm mới khi có mạng; tìm bài offline khớp không dấu trên cache, `pg_trgm` chỉ dùng khi có mạng. Ghi ngoài buổi tập (tạo/sửa routine, chọn program, tạo bài tuỳ chỉnh, alias, cài đặt tài khoản, mục tiêu, chỉ số cơ thể, onboarding) gọi REST thẳng và cần mạng: offline thì báo, không xếp hàng chờ. Ngoại lệ là dữ liệu sinh ra **trong lúc tập**, có thể đúng lúc mất mạng ở phòng gym: cài đặt bài tập (cả dòng, upsert theo user × bài), gợi ý cùng trạng thái của nó, và giai đoạn deload đi qua outbox giống buổi tập.

Phương án bị loại: cho mọi dữ liệu local-first qua outbox (như prototype màn Plans đang làm). Cách đó buộc cả cây routine → ngày tập → bài phải có tombstone, cursor và xử lý xung đột riêng, trong khi sửa routine lúc mất mạng là trường hợp hiếm.

## Consequences

- Prototype `prototypes/plans` xếp hàng thao tác khi offline; bản thật không làm theo phần đó.
- Bài tuỳ chỉnh không tạo được khi offline, kể cả giữa buổi tập tự do.
- `USER_EXERCISE_SETTINGS` có hai đường ghi (outbox từ máy, pull từ server); xung đột xử lý last-write-wins, chấp nhận được vì mỗi user dùng một máy.
