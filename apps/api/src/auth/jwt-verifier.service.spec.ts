import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';
import { type JoseModule, JwtVerifierService } from './jwt-verifier.service';

type Values = Partial<Record<'SUPABASE_URL' | 'SUPABASE_JWT_SECRET', string>>;

function setup(
  values: Values,
  header: { alg: string },
  payload: Record<string, unknown>,
) {
  const jose = {
    decodeProtectedHeader: jest.fn().mockReturnValue(header),
    createRemoteJWKSet: jest.fn().mockReturnValue('JWKS'),
    jwtVerify: jest.fn().mockResolvedValue({ payload }),
  };
  const config = {
    get: (key: keyof Values) => values[key],
  } as unknown as ConfigService<Env, true>;
  return {
    jose,
    service: new JwtVerifierService(jose as unknown as JoseModule, config),
  };
}

const claims = {
  sub: 'user-1',
  email: 'a@example.com',
  app_metadata: { provider: 'google' },
};

describe('JwtVerifierService', () => {
  it('token bất đối xứng: verify bằng JWKS của project, kèm issuer và audience', async () => {
    const { jose, service } = setup(
      { SUPABASE_URL: 'https://p.supabase.co/' },
      { alg: 'ES256' },
      claims,
    );

    await expect(service.verify('t')).resolves.toEqual({
      sub: 'user-1',
      email: 'a@example.com',
      provider: 'google',
    });

    expect(jose.createRemoteJWKSet).toHaveBeenCalledWith(
      new URL('https://p.supabase.co/auth/v1/.well-known/jwks.json'),
    );
    expect(jose.jwtVerify).toHaveBeenCalledWith('t', 'JWKS', {
      issuer: 'https://p.supabase.co/auth/v1',
      audience: 'authenticated',
    });
  });

  it('token HS256: verify bằng SUPABASE_JWT_SECRET', async () => {
    const { jose, service } = setup(
      { SUPABASE_URL: 'https://p.supabase.co', SUPABASE_JWT_SECRET: 'secret' },
      { alg: 'HS256' },
      claims,
    );

    await service.verify('t');

    expect(jose.createRemoteJWKSet).not.toHaveBeenCalled();
    expect(jose.jwtVerify).toHaveBeenCalledWith(
      't',
      new TextEncoder().encode('secret'),
      expect.objectContaining({ algorithms: ['HS256'] }),
    );
  });

  it('token HS256 mà chưa có secret: 503', async () => {
    const { service } = setup(
      { SUPABASE_URL: 'https://p.supabase.co' },
      { alg: 'HS256' },
      claims,
    );
    await expect(service.verify('t')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('chưa cấu hình SUPABASE_URL: 503', async () => {
    const { service } = setup({}, { alg: 'ES256' }, claims);
    await expect(service.verify('t')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('JWT thiếu email: từ chối', async () => {
    const { service } = setup(
      { SUPABASE_URL: 'https://p.supabase.co' },
      { alg: 'ES256' },
      { sub: 'user-1' },
    );
    await expect(service.verify('t')).rejects.toThrow('thiếu sub hoặc email');
  });

  it('provider mặc định là email khi JWT không có app_metadata', async () => {
    const { service } = setup(
      { SUPABASE_URL: 'https://p.supabase.co' },
      { alg: 'ES256' },
      { sub: 'user-1', email: 'a@example.com' },
    );
    await expect(service.verify('t')).resolves.toMatchObject({
      provider: 'email',
    });
  });
});
