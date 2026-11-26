import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { BodyMetricsController } from './body-metrics.controller';
import { BodyMetricsService } from './body-metrics.service';

@Module({
  imports: [UsersModule],
  controllers: [BodyMetricsController],
  providers: [BodyMetricsService],
})
export class BodyMetricsModule {}
