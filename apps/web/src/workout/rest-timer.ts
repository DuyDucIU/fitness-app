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

/**
 * Hết giờ quá lâu mới thấy (app nằm nền, trình duyệt dừng JS) thì không báo nữa: lúc ở nền
 * app không báo được (UC08), báo muộn vài phút chỉ gây giật mình. Nhịp đếm là 1 giây.
 */
const LATE_ALARM_MS = 3000;

const storageKey = (sessionId: string) => `fitness.rest.${sessionId}`;

/** Đọc lượt nghỉ đã lưu; localStorage bị chặn hoặc dữ liệu hỏng thì coi như không nghỉ. */
function load(sessionId: string): RestTimer | null {
  try {
    const raw = localStorage.getItem(storageKey(sessionId));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<RestTimer>;
    return typeof value.endsAt === 'number' && typeof value.totalMs === 'number'
      ? { endsAt: value.endsAt, totalMs: value.totalMs }
      : null;
  } catch {
    return null;
  }
}

function save(sessionId: string, timer: RestTimer | null) {
  try {
    if (timer)
      localStorage.setItem(storageKey(sessionId), JSON.stringify(timer));
    else localStorage.removeItem(storageKey(sessionId));
  } catch {
    // Không lưu được: timer vẫn chạy tới khi đóng app.
  }
}

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
 * Rest timer của buổi đang mở (UC08). Lưu mốc kết thúc (engine › rest) vào localStorage
 * theo buổi, nên vẫn đúng sau khi app xuống nền, kể cả khi hệ điều hành đóng app rồi user
 * mở lại; chỉ cần `now` mới (useNow cập nhật cả khi user quay lại app). Hết giờ khi app
 * đang mở thì báo bằng tiếng, rung, hiệu ứng và câu đọc cho trình đọc màn hình.
 */
export function useRestTimer(sessionId: string, now: number): RestTimerState {
  const announce = useAnnounce();
  const [timer, setTimerState] = useState(() => load(sessionId));
  const [flashing, setFlashing] = useState(false);
  /** Số lần hết giờ có báo, để báo đúng một lần mỗi lượt. */
  const [alarms, setAlarms] = useState(0);

  const setTimer = (next: RestTimer | null) => {
    setTimerState(next);
    save(sessionId, next);
  };

  const left = timer ? restLeft(timer, now) : null;
  if (timer && left?.done) {
    setTimer(null);
    if (now - timer.endsAt <= LATE_ALARM_MS) {
      setFlashing(true);
      setAlarms((n) => n + 1);
    }
  }

  useEffect(() => {
    if (alarms === 0) return;
    ringRestAlarm();
    announce(m.log_rest_over());
  }, [alarms, announce]);

  return {
    left: left?.done ? null : left,
    flashing,
    endFlash: () => setFlashing(false),
    start(seconds) {
      setFlashing(false);
      setTimer(startRest(seconds, Date.now()));
    },
    add: () => timer && setTimer(addRest(timer, ADD_SECONDS)),
    skip: () => setTimer(null),
  };
}
