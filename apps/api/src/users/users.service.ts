import { Injectable } from '@nestjs/common';
import type { MeResponse } from '@fitness/contract';
import type { AuthContext } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lấy user theo JWT; lần đầu đăng nhập thì tạo bản ghi USERS (UC01 bước 3). */
  async getOrCreateMe(auth: AuthContext): Promise<MeResponse> {
    const user = await this.upsert(auth);
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      unitPref: user.unitPref,
      locale: user.locale,
      timezone: user.timezone,
      rpeEnabled: user.rpeEnabled,
    };
  }

  /** Id của user theo JWT, tạo bản ghi nếu chưa có (như GET /me). */
  async ensureUserId(auth: AuthContext): Promise<string> {
    return (await this.upsert(auth)).id;
  }

  private upsert(auth: AuthContext) {
    return this.prisma.user.upsert({
      where: { authSubject: auth.sub },
      create: {
        authSubject: auth.sub,
        email: auth.email,
        authProvider: auth.provider,
      },
      update: {},
    });
  }
}
