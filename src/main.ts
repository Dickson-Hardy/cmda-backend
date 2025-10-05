import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure payload size limits for file uploads
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

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
    origin: [
      'http://localhost:3000',
      'http://localhost:4040',
      'http://localhost:5173',
      'http://localhost:5174',
      'https://cmdanigeria.net',
      'https://www.cmdanigeria.net',
      'https://admin.cmdanigeria.net',
      'https://api.cmdanigeria.net',
    ],
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

  app.useGlobalPipes(new ValidationPipe());

  // Swagger configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CMDA Nigeria API')
    .setDescription('API documentation for CMDA Nigeria')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('apidocs', app, swaggerDoc, {
    customCssUrl: 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.0.0/swagger-ui.css',
    customJs: [
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.0.0/swagger-ui-bundle.js',
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.0.0/swagger-ui-standalone-preset.js',
    ],
    customfavIcon: 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.0.0/favicon-32x32.png',
  });
  //
  await app.listen(3000);
}
bootstrap();
