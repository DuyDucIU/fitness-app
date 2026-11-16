import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { validateEnv } from '../config/env';
import { PrismaModule } from '../prisma/prisma.module';
import { StreakService } from './streak.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    ScheduleModule.forRoot(),
  ],
  providers: [StreakService],
})
export class WorkerModule {}
