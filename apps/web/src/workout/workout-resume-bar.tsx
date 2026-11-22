import { ResumeBar } from '@/components/resume-bar';
import { useNow } from '@/hooks/use-now';
import { formatElapsed } from '@/lib/format';
import { m } from '@/paraglide/messages.js';
import { useOpenSession } from '@/workout/session';

/** Đường dẫn màn ghi buổi tập đang mở. */
export const WORKOUT_PATH = '/workout';

/** Thanh tiếp tục buổi tập trên các màn gốc, chỉ hiện khi có buổi đang dở. */
export function WorkoutResumeBar() {
  const open = useOpenSession();
  const now = useNow();
  if (!open) return null;
  return (
    <ResumeBar
      to={WORKOUT_PATH}
      name={m.log_freestyle()}
      elapsed={formatElapsed(now - Date.parse(open.session.startedAt))}
      setsLogged={open.setCount}
    />
  );
}
