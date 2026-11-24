import * as React from 'react';
import { useNavigate } from 'react-router';

import { startFreestyle, startRoutineDay } from '@/workout/session';
import { WORKOUT_PATH } from '@/workout/workout-resume-bar';

/**
 * Bắt đầu một ngày tập (`dayId`) hoặc tập tự do (`null`) rồi mở màn ghi buổi tập (UC06).
 * Đọc từ cache trên máy nên chạy được khi offline.
 */
export function useStartWorkout() {
  const navigate = useNavigate();
  const [starting, setStarting] = React.useState(false);
  const start = React.useCallback(
    async (dayId: string | null) => {
      setStarting(true);
      try {
        await (dayId ? startRoutineDay(dayId) : startFreestyle());
        await navigate(WORKOUT_PATH);
      } finally {
        setStarting(false);
      }
    },
    [navigate],
  );
  return { start, starting };
}
