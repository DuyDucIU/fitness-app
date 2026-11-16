import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker/worker.module';

/** Tiến trình worker: không mở cổng HTTP, chỉ chạy các job định kỳ. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
}

void bootstrap();
