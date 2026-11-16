import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JOSE, JwtVerifierService } from './jwt-verifier.service';

@Module({
  providers: [
    { provide: JOSE, useFactory: () => import('jose') },
    JwtVerifierService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [JwtVerifierService],
})
export class AuthModule {}
