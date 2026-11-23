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
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AddRoutineExerciseRequestSchema,
  CreateRoutineDayRequestSchema,
  CreateRoutineRequestSchema,
  ReorderRequestSchema,
  type Routine,
  RoutineSchema,
  type RoutinesResponse,
  RoutinesResponseSchema,
  UpdateRoutineDayRequestSchema,
  UpdateRoutineExerciseRequestSchema,
  UpdateRoutineRequestSchema,
} from '@fitness/contract';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { type AuthContext, CurrentAuth } from '../auth/auth.types';
import { RoutinesService } from './routines.service';

class RoutineDto extends createZodDto(RoutineSchema) {}
class RoutinesResponseDto extends createZodDto(RoutinesResponseSchema) {}
class CreateRoutineRequestDto extends createZodDto(
  CreateRoutineRequestSchema,
) {}
class UpdateRoutineRequestDto extends createZodDto(
  UpdateRoutineRequestSchema,
) {}
class CreateRoutineDayRequestDto extends createZodDto(
  CreateRoutineDayRequestSchema,
) {}
class UpdateRoutineDayRequestDto extends createZodDto(
  UpdateRoutineDayRequestSchema,
) {}
class AddRoutineExerciseRequestDto extends createZodDto(
  AddRoutineExerciseRequestSchema,
) {}
class UpdateRoutineExerciseRequestDto extends createZodDto(
  UpdateRoutineExerciseRequestSchema,
) {}
class ReorderRequestDto extends createZodDto(ReorderRequestSchema) {}

const Id = (name: string) => Param(name, ParseUUIDPipe);

/**
 * Tạo/sửa routine (UC05), cần mạng (ADR 0002). Mọi thao tác ghi trả lại cả routine bị sửa;
 * routine, ngày tập hay bài không thuộc user: 404.
 */
@ApiTags('routines')
@ApiBearerAuth()
@Controller()
export class RoutinesController {
  constructor(private readonly routines: RoutinesService) {}

  /** Mọi routine chưa xoá kèm ngày tập và bài, để app làm mới cache chỉ đọc. */
  @Get('routines')
  @ZodResponse({ type: RoutinesResponseDto })
  list(@CurrentAuth() auth: AuthContext): Promise<RoutinesResponse> {
    return this.routines.list(auth);
  }

  /** Routine soạn tay; `isActive` thì routine đang dùng cũ thôi dùng. */
  @Post('routines')
  @ZodResponse({ status: 201, type: RoutineDto })
  create(
    @CurrentAuth() auth: AuthContext,
    @Body() body: CreateRoutineRequestDto,
  ): Promise<Routine> {
    return this.routines.create(auth, body);
  }

  @Patch('routines/:id')
  @ZodResponse({ type: RoutineDto })
  update(
    @CurrentAuth() auth: AuthContext,
    @Id('id') id: string,
    @Body() body: UpdateRoutineRequestDto,
  ): Promise<Routine> {
    return this.routines.update(auth, id, body);
  }

  /** Xoá routine (lưu trữ); buổi tập đã ghi giữ nguyên. */
  @Delete('routines/:id')
  @HttpCode(204)
  archive(
    @CurrentAuth() auth: AuthContext,
    @Id('id') id: string,
  ): Promise<void> {
    return this.routines.archive(auth, id);
  }

  @Post('routines/:id/days')
  @ZodResponse({ status: 201, type: RoutineDto })
  addDay(
    @CurrentAuth() auth: AuthContext,
    @Id('id') id: string,
    @Body() body: CreateRoutineDayRequestDto,
  ): Promise<Routine> {
    return this.routines.addDay(auth, id, body);
  }

  @Put('routines/:id/day-order')
  @ZodResponse({ type: RoutineDto })
  reorderDays(
    @CurrentAuth() auth: AuthContext,
    @Id('id') id: string,
    @Body() body: ReorderRequestDto,
  ): Promise<Routine> {
    return this.routines.reorderDays(auth, id, body.ids);
  }

  @Patch('routine-days/:id')
  @ZodResponse({ type: RoutineDto })
  updateDay(
    @CurrentAuth() auth: AuthContext,
    @Id('id') id: string,
    @Body() body: UpdateRoutineDayRequestDto,
  ): Promise<Routine> {
    return this.routines.updateDay(auth, id, body);
  }

  /** Xoá hẳn ngày tập; ngày cuối cùng của routine thì 409. */
  @Delete('routine-days/:id')
  @ZodResponse({ type: RoutineDto })
  deleteDay(
    @CurrentAuth() auth: AuthContext,
    @Id('id') id: string,
  ): Promise<Routine> {
    return this.routines.deleteDay(auth, id);
  }

  @Post('routine-days/:id/exercises')
  @ZodResponse({ status: 201, type: RoutineDto })
  addExercise(
    @CurrentAuth() auth: AuthContext,
    @Id('id') id: string,
    @Body() body: AddRoutineExerciseRequestDto,
  ): Promise<Routine> {
    return this.routines.addExercise(auth, id, body);
  }

  @Put('routine-days/:id/exercise-order')
  @ZodResponse({ type: RoutineDto })
  reorderExercises(
    @CurrentAuth() auth: AuthContext,
    @Id('id') id: string,
    @Body() body: ReorderRequestDto,
  ): Promise<Routine> {
    return this.routines.reorderExercises(auth, id, body.ids);
  }

  @Patch('routine-exercises/:id')
  @ZodResponse({ type: RoutineDto })
  updateExercise(
    @CurrentAuth() auth: AuthContext,
    @Id('id') id: string,
    @Body() body: UpdateRoutineExerciseRequestDto,
  ): Promise<Routine> {
    return this.routines.updateExercise(auth, id, body);
  }

  @Delete('routine-exercises/:id')
  @ZodResponse({ type: RoutineDto })
  deleteExercise(
    @CurrentAuth() auth: AuthContext,
    @Id('id') id: string,
  ): Promise<Routine> {
    return this.routines.deleteExercise(auth, id);
  }
}
