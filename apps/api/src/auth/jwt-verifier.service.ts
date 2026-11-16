import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';
import type { AuthContext } from './auth.types';

/**
 * `jose` v6 chỉ có bản ESM còn Jest chạy CommonJS, nên module được nạp qua DI:
 * runtime dùng `import('jose')`, test thay bằng bản giả.
 */
export type JoseModule = typeof import('jose');
export const JOSE = Symbol('JOSE');

@Injectable()
export class JwtVerifierService {
  private jwks?: ReturnType<JoseModule['createRemoteJWKSet']>;

  constructor(
    @Inject(JOSE) private readonly jose: JoseModule,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Verify JWT của Supabase Auth.
   * - Token ký bất đối xứng (RS256/ES256): verify bằng JWKS của project, tự cache public key.
   * - Token HS256: verify bằng SUPABASE_JWT_SECRET.
   * Ném lỗi nếu token sai; ném ServiceUnavailableException nếu chưa cấu hình Supabase.
   */
  async verify(token: string): Promise<AuthContext> {
    // Token sai định dạng ném lỗi ở đây (-> 401) trước khi kiểm tra cấu hình.
    const { alg } = this.jose.decodeProtectedHeader(token);

    const supabaseUrl = this.config.get('SUPABASE_URL', { infer: true });
    if (!supabaseUrl) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình SUPABASE_URL cho API',
      );
    }
    const issuer = `${supabaseUrl.replace(/\/$/, '')}/auth/v1`;
    const options = { issuer, audience: 'authenticated' };

    let payload;
    if (alg === 'HS256') {
      const secret = this.config.get('SUPABASE_JWT_SECRET', { infer: true });
      if (!secret) {
        throw new ServiceUnavailableException(
          'Token HS256 nhưng chưa cấu hình SUPABASE_JWT_SECRET',
        );
      }
      ({ payload } = await this.jose.jwtVerify(
        token,
        new TextEncoder().encode(secret),
        {
          ...options,
          algorithms: ['HS256'],
        },
      ));
    } else {
      this.jwks ??= this.jose.createRemoteJWKSet(
        new URL(`${issuer}/.well-known/jwks.json`),
      );
      ({ payload } = await this.jose.jwtVerify(token, this.jwks, options));
    }

    const email = payload['email'];
    if (!payload.sub || typeof email !== 'string') {
      throw new Error('JWT thiếu sub hoặc email');
    }
    const appMetadata = payload['app_metadata'] as
      { provider?: string } | undefined;
    return {
      sub: payload.sub,
      email,
      provider: appMetadata?.provider ?? 'email',
    };
  }
}
