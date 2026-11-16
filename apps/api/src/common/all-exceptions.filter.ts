import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ErrorResponse } from '@fitness/contract';
import type { Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { z } from 'zod';

/** Mọi lỗi trả về dạng thống nhất { code, message } (SDD 8.1). */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.toResponse(exception);
    response.status(status).json(body);
  }

  private toResponse(exception: unknown): {
    status: number;
    body: ErrorResponse;
  } {
    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError();
      const message =
        zodError instanceof z.ZodError
          ? z.prettifyError(zodError)
          : 'Dữ liệu không hợp lệ';
      return {
        status: HttpStatus.BAD_REQUEST,
        body: { code: 'validation_failed', message },
      };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = (HttpStatus[status] ?? 'error').toLowerCase();
      return { status, body: { code, message: exception.message } };
    }
    this.logger.error(
      exception instanceof Error
        ? (exception.stack ?? exception.message)
        : String(exception),
    );
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { code: 'internal_server_error', message: 'Lỗi hệ thống' },
    };
  }
}
