import { Injectable } from '@nestjs/common';
import type { CatalogResponse } from '@fitness/contract';
import type { AuthContext } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Catalog chung cộng bài tuỳ chỉnh của user; alias chung cộng alias của user. User chưa
   * có bản ghi (chưa gọi GET /me) chỉ nhận catalog chung.
   */
  async forUser(auth: AuthContext): Promise<CatalogResponse> {
    const user = await this.prisma.user.findUnique({
      where: { authSubject: auth.sub },
      select: { id: true },
    });
    const owners = user ? [null, user.id] : [null];
    const visible = {
      OR: owners.map((ownerId) => ({ ownerId })),
    };
    const exercises = await this.prisma.exercise.findMany({
      where: visible,
      include: {
        muscles: { include: { muscle: true }, orderBy: { muscleId: 'asc' } },
        aliases: { where: visible, orderBy: { alias: 'asc' } },
      },
      orderBy: { nameEn: 'asc' },
    });
    return {
      exercises: exercises.map((exercise) => ({
        id: exercise.id,
        nameEn: exercise.nameEn,
        nameVi: exercise.nameVi,
        equipment: exercise.equipment,
        mechanic: exercise.mechanic,
        metricType: exercise.metricType,
        mine: exercise.ownerId !== null,
        isArchived: exercise.isArchived,
        muscles: exercise.muscles.map(({ role, muscle }) => ({
          code: muscle.code,
          nameEn: muscle.nameEn,
          nameVi: muscle.nameVi,
          muscleGroup: muscle.muscleGroup,
          role,
        })),
        aliases: exercise.aliases.map((alias) => ({
          alias: alias.alias,
          lang: alias.lang,
          mine: alias.ownerId !== null,
        })),
      })),
    };
  }
}
