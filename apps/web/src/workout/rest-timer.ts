import {
  addRest,
  type RestLeft,
  restLeft,
  type RestTimer,
  startRest,
} from '@fitness/engine';
import { useEffect, useState } from 'react';

import { useAnnounce } from '@/components/toast-context';
import { m } from '@/paraglide/messages.js';
import { ringRestAlarm } from '@/workout/rest-alarm';

/** "Add 30 sec" (prototype › rest+). */
const ADD_SECONDS = 30;

export interface RestTimerState {
  /** Lượt nghỉ đang chạy; `null` khi không nghỉ. */
  left: RestLeft | null;
  /** Vừa hết giờ: dải số áo loé cam cho tới khi `endFlash`. */
  flashing: boolean;
  endFlash: () => void;
  start: (seconds: number) => void;
  add: () => void;
  skip: () => void;
}

/**
 * Rest timer của buổi đang mở (UC08). Lưu mốc kết thúc (engine › rest), nên chỉ cần
 * `now` mới (useNow cập nhật cả khi user quay lại app) là hiện đúng giờ còn lại. Hết giờ
 * khi app đang mở thì báo bằng tiếng, rung và câu đọc cho trình đọc màn hình.
 */
export function useRestTimer(now: number): RestTimerState {
  const announce = useAnnounce();
  const [timer, setTimer] = useState<RestTimer | null>(null);
  const [flashing, setFlashing] = useState(false);
  /** Số lần đã hết giờ, để báo đúng một lần mỗi lượt. */
  const [rings, setRings] = useState(0);

  const left = timer ? restLeft(timer, now) : null;
  if (timer && left?.done) {
    setTimer(null);
    setFlashing(true);
    setRings((n) => n + 1);
  }

  useEffect(() => {
    if (rings === 0) return;
    ringRestAlarm();
    announce(m.log_rest_over());
  }, [rings, announce]);

  return {
    left: left?.done ? null : left,
    flashing,
    endFlash: () => setFlashing(false),
    start(seconds) {
      setFlashing(false);
      setTimer(startRest(seconds, Date.now()));
    },
    add: () => setTimer((t) => t && addRest(t, ADD_SECONDS)),
    skip: () => setTimer(null),
  };
}
