import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AllExceptionsFilter } from './_global/filters/all-exceptions.filter';
import { ALLOWED_ORIGINS } from './_global/constants/cors.constants';
import helmet from 'helmet';
import { OperationalMetricsService } from './monitoring/operational-metrics.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const httpServer = app.getHttpServer();
  httpServer.requestTimeout = Number(process.env.HTTP_REQUEST_TIMEOUT_MS || 30_000);
  httpServer.headersTimeout = Number(process.env.HTTP_HEADERS_TIMEOUT_MS || 35_000);
  httpServer.keepAliveTimeout = Number(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS || 65_000);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Serve static files from public directory
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/',
  });

  // Configure payload size limits for file uploads
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));

  // Configure timeout for file uploads
  app.use((req, res, next) => {
    if (req.url.includes('/events') && req.method === 'POST') {
      req.setTimeout(300000); // 5 minutes timeout for file uploads
      res.setTimeout(300000);
    }
    next();
  });

  // Configure CORS with specific origins
  app.enableCors({
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Access-Control-Allow-Headers',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 200,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger configuration - only in development
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CMDA Nigeria API')
      .setDescription('API documentation for CMDA Nigeria')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('apidocs', app, swaggerDoc);
  }

  // Use PORT from environment (Digital Ocean sets this) or default to 3000
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  const metrics = app.get(OperationalMetricsService);
  setInterval(() => metrics.logSnapshot(), 60_000).unref();

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation is available at: http://localhost:${port}/apidocs`);
}
bootstrap();
