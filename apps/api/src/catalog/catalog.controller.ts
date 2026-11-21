import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type CatalogResponse, CatalogResponseSchema } from '@fitness/contract';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { type AuthContext, CurrentAuth } from '../auth/auth.types';
import { CatalogService } from './catalog.service';

class CatalogResponseDto extends createZodDto(CatalogResponseSchema) {}

@ApiTags('catalog')
@ApiBearerAuth()
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  /** Toàn bộ catalog để app làm mới cache chỉ đọc trên máy (UC03, ADR 0002). */
  @Get()
  @ZodResponse({ type: CatalogResponseDto })
  get(@CurrentAuth() auth: AuthContext): Promise<CatalogResponse> {
    return this.catalog.forUser(auth);
  }
}
