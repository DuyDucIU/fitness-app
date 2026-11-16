import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** Thông tin đọc từ JWT đã verify (Supabase Auth). */
export interface AuthContext {
  /** USERS.auth_subject */
  sub: string;
  email: string;
  /** USERS.auth_provider, vd "email" hoặc "google" */
  provider: string;
}

export type AuthedRequest = Request & { auth?: AuthContext };

/** Lấy AuthContext của request hiện tại trong controller: `@CurrentAuth() auth: AuthContext`. */
export const CurrentAuth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!request.auth)
      throw new Error('CurrentAuth dùng trên route chưa qua JwtAuthGuard');
    return request.auth;
  },
);
