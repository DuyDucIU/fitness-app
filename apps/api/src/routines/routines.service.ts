import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type AddRoutineExerciseRequest,
  type CreateRoutineDayRequest,
  type CreateRoutineRequest,
  type Routine,
  type RoutinesResponse,
  targetRangesInOrder,
  type UpdateRoutineDayRequest,
  type UpdateRoutineExerciseRequest,
  type UpdateRoutineRequest,
} from '@fitness/contract';
import type { AuthContext } from '../auth/auth.types';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

type Tx = Prisma.TransactionClient;

const TREE = {
  days: {
    orderBy: { position: 'asc' },
    include: { exercises: { orderBy: { position: 'asc' } } },
  },
} satisfies Prisma.RoutineInclude;

type RoutineTree = Prisma.RoutineGetPayload<{ include: typeof TREE }>;

function toRoutine(routine: RoutineTree): Routine {
  return {
    id: routine.id,
    name: routine.name,
    source: routine.source,
    programId: routine.programId,
    isActive: routine.isActive,
    createdAt: routine.createdAt.toISOString(),
    days: routine.days.map((day) => ({
      id: day.id,
      name: day.name,
      position: day.position,
      exercises: day.exercises.map((e) => ({
        id: e.id,
        exerciseId: e.exerciseId,
        position: e.position,
        supersetGroup: e.supersetGroup,
        targetSets: e.targetSets,
        repMin: e.repMin,
        repMax: e.repMax,
        targetDurationMinS: e.targetDurationMinS,
        targetDurationMaxS: e.targetDurationMaxS,
        initialWeightKg:
          e.initialWeightKg === null ? null : e.initialWeightKg.toNumber(),
        warmupEnabled: e.warmupEnabled,
        restSeconds: e.restSeconds,
      })),
    })),
  };
}

/** Trùng khoá (vd id client gửi đã có, hai routine cùng đang dùng): 409. */
function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

const NOT_FOUND = 'Không tìm thấy routine của user';

/**
 * Routine của user (UC05, SDD 7.1). Ghi thẳng, cần mạng (ADR 0002); mọi thao tác ghi trả
 * lại cả routine để app làm mới cache. Quyền sở hữu kiểm qua `routines.user_id`: routine
 * của user khác hay đã xoá đều là 404, không lộ việc nó tồn tại.
 */
@Injectable()
export class RoutinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  /** Routine chưa xoá của user, cũ trước mới sau. User chưa có bản ghi: danh sách rỗng. */
  async list(auth: AuthContext): Promise<RoutinesResponse> {
    const user = await this.prisma.user.findUnique({
      where: { authSubject: auth.sub },
      select: { id: true },
    });
    if (!user) return { routines: [] };
    const routines = await this.prisma.routine.findMany({
      where: { userId: user.id, archivedAt: null },
      include: TREE,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return { routines: routines.map(toRoutine) };
  }

  async create(
    auth: AuthContext,
    body: CreateRoutineRequest,
  ): Promise<Routine> {
    const userId = await this.users.ensureUserId(auth);
    return this.write(async (tx) => {
      if (body.isActive) await this.deactivateAll(tx, userId);
      const routine = await tx.routine.create({
        data: {
          userId,
          name: body.name,
          source: 'manual',
          isActive: body.isActive,
          days: {
            create: body.days.map((day, position) => ({
              name: day.name,
              position,
            })),
          },
        },
      });
      return routine.id;
    });
  }

  async update(
    auth: AuthContext,
    routineId: string,
    body: UpdateRoutineRequest,
  ): Promise<Routine> {
    const userId = await this.userId(auth);
    return this.write(async (tx) => {
      await this.ownedRoutine(tx, userId, routineId);
      // Hai câu riêng: thôi dùng routine cũ trước rồi mới đặt routine này, để index
      // "một routine đang dùng" không vấp giữa chừng.
      if (body.isActive) await this.deactivateAll(tx, userId);
      await tx.routine.update({
        where: { id: routineId },
        data: { name: body.name, isActive: body.isActive },
      });
      return routineId;
    });
  }

  /**
   * Xoá routine: đặt `archived_at` và thôi dùng. Ngày tập và bài vẫn giữ trong DB để buổi
   * tập cũ còn tra được tên ngày; buổi tập không bị đụng tới.
   */
  async archive(auth: AuthContext, routineId: string): Promise<void> {
    const userId = await this.userId(auth);
    await this.prisma.$transaction(async (tx) => {
      await this.ownedRoutine(tx, userId, routineId);
      await tx.routine.update({
        where: { id: routineId },
        data: { archivedAt: new Date(), isActive: false },
      });
    });
  }

  async addDay(
    auth: AuthContext,
    routineId: string,
    body: CreateRoutineDayRequest,
  ): Promise<Routine> {
    const userId = await this.userId(auth);
    return this.write(async (tx) => {
      await this.ownedRoutine(tx, userId, routineId);
      await this.assertVisible(
        tx,
        userId,
        body.exercises.map((e) => e.exerciseId),
      );
      const days = await tx.routineDay.findMany({
        where: { routineId },
        orderBy: { position: 'asc' },
        select: { id: true },
      });
      const day = await tx.routineDay.create({
        data: {
          id: body.id,
          routineId,
          name: body.name,
          position: days.length,
          exercises: {
            create: body.exercises.map((e, position) => ({
              ...exerciseData(e),
              id: e.id,
              position,
            })),
          },
        },
      });
      await renumberDays(tx, insertAt(days, day.id, body.position));
      return routineId;
    });
  }

  async updateDay(
    auth: AuthContext,
    dayId: string,
    body: UpdateRoutineDayRequest,
  ): Promise<Routine> {
    const userId = await this.userId(auth);
    return this.write(async (tx) => {
      const day = await this.ownedDay(tx, userId, dayId);
      await tx.routineDay.update({
        where: { id: dayId },
        data: { name: body.name },
      });
      return day.routineId;
    });
  }

  /** Xoá hẳn một ngày tập (kèm bài). Routine phải còn ít nhất một ngày: 409. */
  async deleteDay(auth: AuthContext, dayId: string): Promise<Routine> {
    const userId = await this.userId(auth);
    return this.write(async (tx) => {
      const day = await this.ownedDay(tx, userId, dayId);
      const days = await tx.routineDay.findMany({
        where: { routineId: day.routineId },
        orderBy: { position: 'asc' },
        select: { id: true },
      });
      if (days.length <= 1) {
        throw new ConflictException('Routine cần ít nhất một ngày tập');
      }
      await tx.routineDay.delete({ where: { id: dayId } });
      await renumberDays(
        tx,
        days.map((d) => d.id).filter((id) => id !== dayId),
      );
      return day.routineId;
    });
  }

  async reorderDays(
    auth: AuthContext,
    routineId: string,
    ids: string[],
  ): Promise<Routine> {
    const userId = await this.userId(auth);
    return this.write(async (tx) => {
      await this.ownedRoutine(tx, userId, routineId);
      const days = await tx.routineDay.findMany({
        where: { routineId },
        select: { id: true },
      });
      assertSameIds(
        days.map((d) => d.id),
        ids,
      );
      await renumberDays(tx, ids);
      return routineId;
    });
  }

  async addExercise(
    auth: AuthContext,
    dayId: string,
    body: AddRoutineExerciseRequest,
  ): Promise<Routine> {
    const userId = await this.userId(auth);
    return this.write(async (tx) => {
      const day = await this.ownedDay(tx, userId, dayId);
      await this.assertVisible(tx, userId, [body.exerciseId]);
      const rows = await tx.routineExercise.findMany({
        where: { routineDayId: dayId },
        orderBy: { position: 'asc' },
        select: { id: true },
      });
      const created = await tx.routineExercise.create({
        data: {
          ...exerciseData(body),
          id: body.id,
          routineDayId: dayId,
          position: rows.length,
        },
      });
      await renumberExercises(tx, insertAt(rows, created.id, body.position));
      return day.routineId;
    });
  }

  async updateExercise(
    auth: AuthContext,
    routineExerciseId: string,
    body: UpdateRoutineExerciseRequest,
  ): Promise<Routine> {
    const userId = await this.userId(auth);
    return this.write(async (tx) => {
      const row = await this.ownedExercise(tx, userId, routineExerciseId);
      // Khoảng target kiểm trên giá trị sau khi gộp, vì PATCH có thể chỉ gửi một đầu.
      if (!targetRangesInOrder({ ...row, ...body })) {
        throw new BadRequestException('Khoảng target bị ngược (min > max)');
      }
      if (body.exerciseId)
        await this.assertVisible(tx, userId, [body.exerciseId]);
      await tx.routineExercise.update({
        where: { id: routineExerciseId },
        data: body,
      });
      return row.day.routineId;
    });
  }

  async deleteExercise(
    auth: AuthContext,
    routineExerciseId: string,
  ): Promise<Routine> {
    const userId = await this.userId(auth);
    return this.write(async (tx) => {
      const row = await this.ownedExercise(tx, userId, routineExerciseId);
      await tx.routineExercise.delete({ where: { id: routineExerciseId } });
      const rest = await tx.routineExercise.findMany({
        where: { routineDayId: row.routineDayId },
        orderBy: { position: 'asc' },
        select: { id: true },
      });
      await renumberExercises(
        tx,
        rest.map((r) => r.id),
      );
      return row.day.routineId;
    });
  }

  async reorderExercises(
    auth: AuthContext,
    dayId: string,
    ids: string[],
  ): Promise<Routine> {
    const userId = await this.userId(auth);
    return this.write(async (tx) => {
      const day = await this.ownedDay(tx, userId, dayId);
      const rows = await tx.routineExercise.findMany({
        where: { routineDayId: dayId },
        select: { id: true },
      });
      assertSameIds(
        rows.map((r) => r.id),
        ids,
      );
      await renumberExercises(tx, ids);
      return day.routineId;
    });
  }

  /** Chạy một thao tác ghi trong transaction rồi trả lại routine bị sửa. */
  private async write(apply: (tx: Tx) => Promise<string>): Promise<Routine> {
    try {
      const routineId = await this.prisma.$transaction(apply);
      return toRoutine(
        await this.prisma.routine.findUniqueOrThrow({
          where: { id: routineId },
          include: TREE,
        }),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Bản ghi đã tồn tại');
      }
      throw error;
    }
  }

  /** Sửa routine cần user đã có bản ghi; chưa có thì chắc chắn chưa có routine nào. */
  private async userId(auth: AuthContext): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { authSubject: auth.sub },
      select: { id: true },
    });
    if (!user) throw new NotFoundException(NOT_FOUND);
    return user.id;
  }

  private deactivateAll(tx: Tx, userId: string) {
    return tx.routine.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
  }

  private async ownedRoutine(tx: Tx, userId: string, id: string) {
    const routine = await tx.routine.findFirst({
      where: { id, userId, archivedAt: null },
      select: { id: true },
    });
    if (!routine) throw new NotFoundException(NOT_FOUND);
    return routine;
  }

  private async ownedDay(tx: Tx, userId: string, id: string) {
    const day = await tx.routineDay.findFirst({
      where: { id, routine: { userId, archivedAt: null } },
      select: { id: true, routineId: true },
    });
    if (!day) throw new NotFoundException(NOT_FOUND);
    return day;
  }

  private async ownedExercise(tx: Tx, userId: string, id: string) {
    const row = await tx.routineExercise.findFirst({
      where: { id, day: { routine: { userId, archivedAt: null } } },
      include: { day: { select: { routineId: true } } },
    });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  /** Bài phải nằm trong catalog user thấy: catalog chung hoặc bài tuỳ chỉnh của chính user. */
  private async assertVisible(tx: Tx, userId: string, exerciseIds: string[]) {
    const unique = [...new Set(exerciseIds)];
    if (unique.length === 0) return;
    const found = await tx.exercise.count({
      where: {
        id: { in: unique },
        isArchived: false,
        OR: [{ ownerId: null }, { ownerId: userId }],
      },
    });
    if (found !== unique.length) {
      throw new NotFoundException('Không tìm thấy bài tập');
    }
  }
}

/** Cột của bài trong ngày lấy từ request (không gồm id và thứ tự). */
function exerciseData(e: AddRoutineExerciseRequest) {
  return {
    exerciseId: e.exerciseId,
    targetSets: e.targetSets,
    repMin: e.repMin,
    repMax: e.repMax,
    targetDurationMinS: e.targetDurationMinS,
    targetDurationMaxS: e.targetDurationMaxS,
    initialWeightKg: e.initialWeightKg,
    warmupEnabled: e.warmupEnabled,
    restSeconds: e.restSeconds,
  };
}

/** Thứ tự mới khi chèn `id` vào `position` (mặc định cuối danh sách). */
function insertAt(
  existing: { id: string }[],
  id: string,
  position?: number,
): string[] {
  const ids = existing.map((e) => e.id);
  ids.splice(Math.min(position ?? ids.length, ids.length), 0, id);
  return ids;
}

function assertSameIds(current: string[], next: string[]) {
  const set = new Set(current);
  if (next.length !== set.size || next.some((id) => !set.has(id))) {
    throw new BadRequestException('Thứ tự mới phải gồm đúng mọi id hiện có');
  }
}

async function renumberDays(tx: Tx, ids: string[]) {
  for (const [position, id] of ids.entries()) {
    await tx.routineDay.update({ where: { id }, data: { position } });
  }
}

async function renumberExercises(tx: Tx, ids: string[]) {
  for (const [position, id] of ids.entries()) {
    await tx.routineExercise.update({ where: { id }, data: { position } });
  }
}
