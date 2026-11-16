import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

/** Cấu hình dùng chung cho main.ts và test e2e. */
export function setupApp(
  app: INestApplication,
  options: { swagger: boolean; corsOrigins: string[] },
): void {
  // Mọi endpoint nằm dưới /v1 (SDD 11.6).
  app.setGlobalPrefix('v1');

  // Web app (PWA) chạy khác origin với API: chỉ cho phép các origin cấu hình trong CORS_ORIGINS (SDD 8.1).
  app.enableCors({
    origin: options.corsOrigins,
    allowedHeaders: ['Authorization', 'Content-Type'],
  });

  // Swagger UI sinh từ schema Zod của @fitness/contract; chỉ bật ngoài production.
  if (options.swagger) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Fitness Tracking API')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup('api', app, cleanupOpenApiDoc(document));
  }
}
