import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthedRequest } from './auth.types';
import { JwtVerifierService } from './jwt-verifier.service';
import { IS_PUBLIC_KEY } from './public.decorator';

/** Guard toàn cục: mọi route cần `Authorization: Bearer <JWT>` trừ route gắn @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: JwtVerifierService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Thiếu header Authorization: Bearer <JWT>',
      );
    }

    try {
      request.auth = await this.verifier.verify(token);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new UnauthorizedException('JWT không hợp lệ hoặc đã hết hạn');
    }
    return true;
  }
}
