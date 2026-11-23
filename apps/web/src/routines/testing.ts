/** Server routine giả trong bộ nhớ cho test: chỉ import từ file test. */
import type {
  AddRoutineExerciseRequest,
  Routine,
  RoutineDay,
} from '@fitness/contract';
import { vi } from 'vitest';

import type { RoutinesApi } from '@/lib/api';
import { ApiError } from '@/lib/errors';

let seq = 0;
/** UUID hợp lệ, tăng dần để thứ tự dễ đoán. */
export function testUuid(): string {
  seq += 1;
  return `00000000-0000-4000-9000-${String(seq).padStart(12, '0')}`;
}

const renumber = <T extends { position: number }>(items: T[]) =>
  items.forEach((item, position) => (item.position = position));

/**
 * REST routine giả, hành xử như API thật ở mức user thấy được (UC05): một routine đang
 * dùng, ngày cuối không xoá được, mỗi thao tác ghi trả lại cả routine. Mọi hàm là `vi.fn`
 * để test kiểm request.
 */
export function fakeRoutinesServer(initial: Routine[] = []) {
  const routines: Routine[] = structuredClone(initial);
  const clone = <T>(value: T): T => structuredClone(value);
  const notFound = () => new ApiError('not_found', 404);

  const routineOf = (id: string) => {
    const routine = routines.find((r) => r.id === id);
    if (!routine) throw notFound();
    return routine;
  };
  const dayOf = (dayId: string): [Routine, RoutineDay] => {
    for (const routine of routines) {
      const day = routine.days.find((d) => d.id === dayId);
      if (day) return [routine, day];
    }
    throw notFound();
  };
  const exerciseOf = (id: string) => {
    for (const routine of routines) {
      for (const day of routine.days) {
        const row = day.exercises.find((e) => e.id === id);
        if (row) return { routine, day, row };
      }
    }
    throw notFound();
  };
  const toRow = (e: AddRoutineExerciseRequest, position: number) => ({
    id: e.id ?? testUuid(),
    exerciseId: e.exerciseId,
    position,
    supersetGroup: null,
    targetSets: e.targetSets,
    repMin: e.repMin,
    repMax: e.repMax,
    targetDurationMinS: e.targetDurationMinS,
    targetDurationMaxS: e.targetDurationMaxS,
    initialWeightKg: e.initialWeightKg,
    warmupEnabled: e.warmupEnabled,
    restSeconds: e.restSeconds,
  });
  const insert = <T extends { position: number }>(
    list: T[],
    item: T,
    position?: number,
  ) => {
    list.splice(Math.min(position ?? list.length, list.length), 0, item);
    renumber(list);
  };
  const reorder = <T extends { id: string; position: number }>(
    list: T[],
    ids: string[],
  ) => {
    const sorted = ids.map((id) => list.find((x) => x.id === id)!);
    list.splice(0, list.length, ...sorted);
    renumber(list);
  };

  const api: RoutinesApi = {
    list: vi.fn<RoutinesApi['list']>(async () => ({ routines: clone(routines) })),
    create: vi.fn<RoutinesApi['create']>(async (body) => {
      if (body.isActive) routines.forEach((r) => (r.isActive = false));
      const routine: Routine = {
        id: testUuid(),
        name: body.name.trim(),
        source: 'manual',
        programId: null,
        isActive: body.isActive,
        createdAt: new Date(Date.UTC(2026, 10, 22, 0, 0, seq)).toISOString(),
        days: body.days.map((d, position) => ({
          id: testUuid(),
          name: d.name,
          position,
          exercises: [],
        })),
      };
      routines.push(routine);
      return clone(routine);
    }),
    update: vi.fn<RoutinesApi['update']>(async (id, body) => {
      const routine = routineOf(id);
      if (body.isActive) routines.forEach((r) => (r.isActive = false));
      if (body.name !== undefined) routine.name = body.name;
      if (body.isActive !== undefined) routine.isActive = body.isActive;
      return clone(routine);
    }),
    archive: vi.fn<RoutinesApi['archive']>(async (id) => {
      routineOf(id);
      routines.splice(
        routines.findIndex((r) => r.id === id),
        1,
      );
    }),
    addDay: vi.fn<RoutinesApi['addDay']>(async (routineId, body) => {
      const routine = routineOf(routineId);
      insert(
        routine.days,
        {
          id: body.id ?? testUuid(),
          name: body.name,
          position: 0,
          exercises: body.exercises.map(toRow),
        },
        body.position,
      );
      return clone(routine);
    }),
    reorderDays: vi.fn<RoutinesApi['reorderDays']>(async (routineId, ids) => {
      const routine = routineOf(routineId);
      reorder(routine.days, ids);
      return clone(routine);
    }),
    updateDay: vi.fn<RoutinesApi['updateDay']>(async (dayId, body) => {
      const [routine, day] = dayOf(dayId);
      day.name = body.name;
      return clone(routine);
    }),
    deleteDay: vi.fn<RoutinesApi['deleteDay']>(async (dayId) => {
      const [routine] = dayOf(dayId);
      if (routine.days.length <= 1) throw new ApiError('conflict', 409);
      routine.days = routine.days.filter((d) => d.id !== dayId);
      renumber(routine.days);
      return clone(routine);
    }),
    addExercise: vi.fn<RoutinesApi['addExercise']>(async (dayId, body) => {
      const [routine, day] = dayOf(dayId);
      insert(day.exercises, toRow(body, 0), body.position);
      return clone(routine);
    }),
    reorderExercises: vi.fn<RoutinesApi['reorderExercises']>(async (dayId, ids) => {
      const [routine, day] = dayOf(dayId);
      reorder(day.exercises, ids);
      return clone(routine);
    }),
    updateExercise: vi.fn<RoutinesApi['updateExercise']>(async (id, body) => {
      const { routine, row } = exerciseOf(id);
      Object.assign(row, body);
      return clone(routine);
    }),
    deleteExercise: vi.fn<RoutinesApi['deleteExercise']>(async (id) => {
      const { routine, day } = exerciseOf(id);
      day.exercises = day.exercises.filter((e) => e.id !== id);
      renumber(day.exercises);
      return clone(routine);
    }),
  };
  return { api, routines };
}
