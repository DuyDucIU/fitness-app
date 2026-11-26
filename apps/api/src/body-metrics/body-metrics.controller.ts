import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type BodyMetric,
  BodyMetricSchema,
  type BodyMetricsResponse,
  BodyMetricsResponseSchema,
  CreateBodyMetricRequestSchema,
  UpdateBodyMetricRequestSchema,
} from '@fitness/contract';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { type AuthContext, CurrentAuth } from '../auth/auth.types';
import { BodyMetricsService } from './body-metrics.service';

class BodyMetricDto extends createZodDto(BodyMetricSchema) {}
class BodyMetricsResponseDto extends createZodDto(BodyMetricsResponseSchema) {}
class CreateBodyMetricRequestDto extends createZodDto(
  CreateBodyMetricRequestSchema,
) {}
class UpdateBodyMetricRequestDto extends createZodDto(
  UpdateBodyMetricRequestSchema,
) {}

/** Chỉ số cơ thể nhập tay (UC18), cần mạng (ADR 0002). */
@ApiTags('body-metrics')
@ApiBearerAuth()
@Controller('body-metrics')
export class BodyMetricsController {
  constructor(private readonly bodyMetrics: BodyMetricsService) {}

  /** Mọi chỉ số của user, mới đo trước. */
  @Get()
  @ZodResponse({ type: BodyMetricsResponseDto })
  list(@CurrentAuth() auth: AuthContext): Promise<BodyMetricsResponse> {
    return this.bodyMetrics.list(auth);
  }

  /** Nhập tay một chỉ số (`source = manual`); số ngoài khoảng của loại chỉ số: 400. */
  @Post()
  @ZodResponse({ status: 201, type: BodyMetricDto })
  create(
    @CurrentAuth() auth: AuthContext,
    @Body() body: CreateBodyMetricRequestDto,
  ): Promise<BodyMetric> {
    return this.bodyMetrics.create(auth, body);
  }

  /** Sửa số hoặc thời điểm đo; không đổi loại chỉ số. */
  @Patch(':id')
  @ZodResponse({ type: BodyMetricDto })
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateBodyMetricRequestDto,
  ): Promise<BodyMetric> {
    return this.bodyMetrics.update(auth, id, body);
  }

  /** Xoá hẳn. */
  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.bodyMetrics.remove(auth, id);
  }
}
