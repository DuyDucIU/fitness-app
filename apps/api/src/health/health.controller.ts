import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthResponseSchema } from '@fitness/contract';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { Public } from '../auth/public.decorator';

class HealthResponseDto extends createZodDto(HealthResponseSchema) {}

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ZodResponse({ type: HealthResponseDto })
  check(): { status: 'ok'; time: string } {
    return { status: 'ok', time: new Date().toISOString() };
  }
}
