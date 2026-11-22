import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type SyncPullResponse,
  SyncPullQuerySchema,
  SyncPullResponseSchema,
  type SyncPushResponse,
  SyncPushRequestSchema,
  SyncPushResponseSchema,
} from '@fitness/contract';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { type AuthContext, CurrentAuth } from '../auth/auth.types';
import { SyncService } from './sync.service';

class SyncPushRequestDto extends createZodDto(SyncPushRequestSchema) {}
class SyncPushResponseDto extends createZodDto(SyncPushResponseSchema) {}
class SyncPullQueryDto extends createZodDto(SyncPullQuerySchema) {}
class SyncPullResponseDto extends createZodDto(SyncPullResponseSchema) {}

@ApiTags('sync')
@ApiBearerAuth()
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  /**
   * Nhận một batch sự kiện outbox (SDD 3.2), lưu cả batch hoặc không lưu gì. Dữ liệu không
   * thuộc user (kể cả qua buổi/bài cha) thì trả 403 `forbidden`.
   */
  @Post('push')
  @HttpCode(200)
  @ZodResponse({ type: SyncPushResponseDto })
  push(
    @CurrentAuth() auth: AuthContext,
    @Body() body: SyncPushRequestDto,
  ): Promise<SyncPushResponse> {
    return this.sync.push(auth, body.events);
  }

  /**
   * Thay đổi sau cursor `since` của mọi bảng đi qua outbox, kể cả tombstone (SDD 3.2).
   * `hasMore` thì kéo tiếp ngay với `cursor` trả về. Cursor sai: 400.
   */
  @Get('pull')
  @ZodResponse({ type: SyncPullResponseDto })
  pull(
    @CurrentAuth() auth: AuthContext,
    @Query() query: SyncPullQueryDto,
  ): Promise<SyncPullResponse> {
    return this.sync.pull(auth, query);
  }
}
