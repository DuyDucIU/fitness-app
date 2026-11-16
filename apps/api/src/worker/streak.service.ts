import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * UC16 — đánh giá streak tuần. Khung chạy được, chưa có logic:
 * chạy mỗi giờ vì ranh giới tuần tính theo múi giờ của từng user.
 */
@Injectable()
export class StreakService {
  private readonly logger = new Logger(StreakService.name);

  @Cron(CronExpression.EVERY_HOUR)
  evaluateWeeklyStreaks(): void {
    this.logger.log('Đánh giá streak tuần: chưa hiện thực');
  }
}
