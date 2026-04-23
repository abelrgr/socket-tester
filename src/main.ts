import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './core/all-exceptions.filter';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  // Request ID middleware — injects a UUID into every request for log traceability
  app.use((req: Request, res: Response, next: NextFunction) => {
    const id = (req.headers['x-request-id'] as string) || uuidv4();
    res.setHeader('x-request-id', id);
    (req as Request & { requestId: string }).requestId = id;
    next();
  });

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://umami.abelgalloruiz.me'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", 'ws:', 'wss:', 'https://umami.abelgalloruiz.me'],
        imgSrc: ["'self'", 'data:'],
      },
    },
  }));

  // CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) ?? ['http://localhost:3000', 'http://localhost:5173'];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger (disabled in production by default)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Socket Tester API')
      .setDescription('Universal Socket Testing Platform — API Reference')
      .setVersion('1.0.0')
      .addTag('Health')
      .addTag('Connections - WebSocket')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger UI available at /api/docs');
  }

  const port = parseInt(process.env.PORT ?? '3000');
  await app.listen(port);
  logger.log(`Socket Tester running on http://localhost:${port}`);
}

bootstrap();
