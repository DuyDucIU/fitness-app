import { describe, expect, it } from 'vitest';
import {
  SessionExerciseSchema,
  SetLogSchema,
  WorkoutSessionSchema,
} from './index';

const SESSION_ID = '7a1c3e9e-2f4b-4c8d-9a6e-1b2c3d4e5f60';
const SESSION_EXERCISE_ID = '8b2d4f0f-3a5c-4d9e-8b7f-2c3d4e5f6a71';

describe('buổi tập', () => {
  it('buổi tự do đang mở: không có ngày tập, chưa kết thúc', () => {
    expect(
      WorkoutSessionSchema.safeParse({
        id: SESSION_ID,
        routineDayId: null,
        startedAt: '2026-11-22T10:00:00.000Z',
        endedAt: null,
        notes: null,
        deletedAt: null,
      }).success,
    ).toBe(true);
  });

  it('từ chối id không phải UUID', () => {
    expect(
      WorkoutSessionSchema.safeParse({
        id: 'abc',
        routineDayId: null,
        startedAt: '2026-11-22T10:00:00.000Z',
        endedAt: null,
        notes: null,
        deletedAt: null,
      }).success,
    ).toBe(false);
  });

  it('bài trong buổi chụp lại quy ước ghi tạ; từ chối quy ước lạ', () => {
    const exercise = {
      id: SESSION_EXERCISE_ID,
      sessionId: SESSION_ID,
      exerciseId: '00000000-0000-4000-8000-000000000001',
      routineExerciseId: null,
      loadInput: 'per_dumbbell',
      position: 0,
      supersetGroup: null,
      deletedAt: null,
    };
    expect(SessionExerciseSchema.safeParse(exercise).success).toBe(true);
    expect(
      SessionExerciseSchema.safeParse({ ...exercise, loadInput: 'per_arm' })
        .success,
    ).toBe(false);
  });

  it('set chỉ reps: không có tạ và đơn vị; set tạ × reps phải có đơn vị kg|lb', () => {
    const set = {
      id: '9c3e5a1a-4b6d-4e0f-9c8a-3d4e5f6a7b82',
      sessionExerciseId: SESSION_EXERCISE_ID,
      setIndex: 0,
      setType: 'working',
      weightValue: null,
      inputUnit: null,
      reps: 12,
      durationS: null,
      distanceM: null,
      rpe: null,
      completedAt: '2026-11-22T10:05:00.000Z',
      deletedAt: null,
    };
    expect(SetLogSchema.safeParse(set).success).toBe(true);
    expect(
      SetLogSchema.safeParse({ ...set, weightValue: 80, inputUnit: 'kg' })
        .success,
    ).toBe(true);
    expect(
      SetLogSchema.safeParse({ ...set, weightValue: 80, inputUnit: 'stone' })
        .success,
    ).toBe(false);
  });
});
