import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type BodyMetric,
  type BodyMetricsResponse,
  type CreateBodyMetricRequest,
  isBodyMetricValueValid,
  type UpdateBodyMetricRequest,
} from '@fitness/contract';
import type { AuthContext } from '../auth/auth.types';
import type { BodyMetric as BodyMetricRow } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

const NOT_FOUND = 'Không tìm thấy chỉ số của user';

function toBodyMetric(row: BodyMetricRow): BodyMetric {
  return {
    id: row.id,
    metric: row.metric,
    value: row.value.toNumber(),
    measuredAt: row.measuredAt.toISOString(),
    source: row.source,
    edited: row.editedAt !== null,
  };
}

/**
 * Chỉ số cơ thể nhập tay (UC18), cần mạng (ADR 0002). Chỉ số không thuộc user: 404. Xoá là
 * xoá hẳn vì không đi qua outbox, không cần tombstone.
 */
@Injectable()
export class BodyMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async list(auth: AuthContext): Promise<BodyMetricsResponse> {
    const userId = await this.users.ensureUserId(auth);
    const rows = await this.prisma.bodyMetric.findMany({
      where: { userId },
      orderBy: [{ measuredAt: 'desc' }, { createdAt: 'desc' }],
    });
    return { entries: rows.map(toBodyMetric) };
  }

  async create(
    auth: AuthContext,
    body: CreateBodyMetricRequest,
  ): Promise<BodyMetric> {
    const userId = await this.users.ensureUserId(auth);
    const row = await this.prisma.bodyMetric.create({
      data: {
        userId,
        metric: body.metric,
        value: body.value,
        measuredAt: new Date(body.measuredAt),
        source: 'manual',
      },
    });
    return toBodyMetric(row);
  }

  async update(
    auth: AuthContext,
    id: string,
    body: UpdateBodyMetricRequest,
  ): Promise<BodyMetric> {
    const userId = await this.users.ensureUserId(auth);
    const row = await this.prisma.bodyMetric.findFirst({
      where: { id, userId },
    });
    if (!row) throw new NotFoundException(NOT_FOUND);
    if (
      body.value !== undefined &&
      !isBodyMetricValueValid(row.metric, body.value)
    ) {
      throw new BadRequestException('Số nằm ngoài khoảng hợp lệ của chỉ số');
    }
    const updated = await this.prisma.bodyMetric.update({
      where: { id },
      data: {
        value: body.value,
        measuredAt:
          body.measuredAt === undefined ? undefined : new Date(body.measuredAt),
        editedAt: new Date(),
      },
    });
    return toBodyMetric(updated);
  }

  async remove(auth: AuthContext, id: string): Promise<void> {
    const userId = await this.users.ensureUserId(auth);
    const { count } = await this.prisma.bodyMetric.deleteMany({
      where: { id, userId },
    });
    if (count === 0) throw new NotFoundException(NOT_FOUND);
  }
}
