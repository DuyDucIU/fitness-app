import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type ProgressResponse,
  ProgressResponseSchema,
} from '@fitness/contract';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { type AuthContext, CurrentAuth } from '../auth/auth.types';
import { ProgressService } from './progress.service';

class ProgressResponseDto extends createZodDto(ProgressResponseSchema) {}

/** Biểu đồ tiến độ (UC19), cần mạng: app không có bản cache. */
@ApiTags('progress')
@ApiBearerAuth()
@Controller()
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  /** Tần suất theo tuần/tháng, working set mỗi tuần theo nhóm cơ, e1RM theo bài. */
  @Get('progress')
  @ZodResponse({ type: ProgressResponseDto })
  get(@CurrentAuth() auth: AuthContext): Promise<ProgressResponse> {
    return this.progress.get(auth);
  }
}
