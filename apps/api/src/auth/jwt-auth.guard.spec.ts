import {
  ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthedRequest } from './auth.types';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { JwtVerifierService } from './jwt-verifier.service';

function setup(options: {
  isPublic?: boolean;
  authorization?: string;
  verify?: jest.Mock;
}) {
  const request = {
    headers: { authorization: options.authorization },
  } as unknown as AuthedRequest;
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  const reflector = {
    getAllAndOverride: () => options.isPublic ?? false,
  } as unknown as Reflector;
  const verifier = {
    verify: options.verify ?? jest.fn(),
  } as unknown as JwtVerifierService;
  return { request, context, guard: new JwtAuthGuard(reflector, verifier) };
}

describe('JwtAuthGuard', () => {
  it('cho qua route @Public() mà không cần token', async () => {
    const { guard, context } = setup({ isPublic: true });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('từ chối khi thiếu header Authorization', async () => {
    const { guard, context } = setup({});
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('từ chối khi scheme không phải Bearer', async () => {
    const { guard, context } = setup({ authorization: 'Basic abc' });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('gắn AuthContext vào request khi token hợp lệ', async () => {
    const auth = { sub: 's', email: 'a@example.com', provider: 'email' };
    const { guard, context, request } = setup({
      authorization: 'Bearer tok',
      verify: jest.fn().mockResolvedValue(auth),
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.auth).toEqual(auth);
  });

  it('token sai: 401', async () => {
    const { guard, context } = setup({
      authorization: 'Bearer tok',
      verify: jest
        .fn()
        .mockRejectedValue(new Error('signature verification failed')),
    });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('lỗi cấu hình (503) không bị che thành 401', async () => {
    const { guard, context } = setup({
      authorization: 'Bearer tok',
      verify: jest.fn().mockRejectedValue(new ServiceUnavailableException('x')),
    });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
