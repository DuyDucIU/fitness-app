import { useEffect, useState } from 'react';

/**
 * Thời điểm hiện tại (ms), cập nhật mỗi `intervalMs`, vd cho đồng hồ thời gian tập.
 * Cập nhật ngay khi user quay lại app: lúc nằm nền trình duyệt dừng hoặc giãn timer, nên
 * không chờ tới nhịp kế tiếp mới hiện đúng giờ.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs]);
  return now;
}
