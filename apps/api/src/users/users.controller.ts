import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type MeResponse, MeResponseSchema } from '@fitness/contract';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { type AuthContext, CurrentAuth } from '../auth/auth.types';
import { UsersService } from './users.service';

class MeResponseDto extends createZodDto(MeResponseSchema) {}

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ZodResponse({ type: MeResponseDto })
  me(@CurrentAuth() auth: AuthContext): Promise<MeResponse> {
    return this.users.getOrCreateMe(auth);
  }
}
