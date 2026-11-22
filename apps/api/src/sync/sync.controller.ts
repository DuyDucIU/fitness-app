import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type SyncPushResponse,
  SyncPushRequestSchema,
  SyncPushResponseSchema,
} from '@fitness/contract';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { type AuthContext, CurrentAuth } from '../auth/auth.types';
import { SyncService } from './sync.service';

class SyncPushRequestDto extends createZodDto(SyncPushRequestSchema) {}
class SyncPushResponseDto extends createZodDto(SyncPushResponseSchema) {}

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
}
