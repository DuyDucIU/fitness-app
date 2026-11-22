import { useEffect, useState } from 'react';

/** Thời điểm hiện tại (ms), cập nhật mỗi `intervalMs`, vd cho đồng hồ thời gian tập. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
