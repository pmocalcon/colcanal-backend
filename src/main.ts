import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // CORS - Enable FIRST before helmet
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
  });

  // Security - Configure helmet to not interfere with CORS
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // Global exception filter - catches all errors and prevents 500 errors from reaching the client
  app.useGlobalFilters(new AllExceptionsFilter());

  // Validation pipe with sanitization
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that are not in the DTO
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Canalco ERP - API REST')
    .setDescription(
      `
      ## Sistema de Gestión Empresarial - Canales & Contactos

      API REST para el sistema ERP de Canalco, especializado en gestión de compras,
      requisiciones y control de autorizaciones jerárquicas.

      ### Características principales

      - 🔐 **Autenticación JWT** con tokens de acceso y refresco
      - 👥 **Control de roles** (Gerencia, Directores, Analistas, PQRS, Compras)
      - 📝 **Gestión de requisiciones** con flujo de aprobación multinivel
      - 🏢 **Multi-empresa** con soporte para Canales & Contactos y Uniones Temporales
      - 📊 **Centros de operación** y códigos de proyecto integrados
      - 🔢 **Numeración automática** de requisiciones con secuencias por empresa/proyecto
      - 📋 **Catálogo de materiales** con grupos y códigos SAP

      ### Flujo de aprobación de requisiciones

      1. **Creación**: Analistas PMO o PQRS crean requisiciones
      2. **Revisión**: Directores revisan y aprueban/rechazan (Nivel 1)
      3. **Aprobación**: Gerencia aprueba/rechaza definitivamente (Nivel 2)
      4. **Procesamiento**: Área de Compras procesa requisiciones aprobadas

      ### Cómo empezar

      1. Usa el endpoint **POST /auth/login** con credenciales de prueba
      2. Copia el **accessToken** de la respuesta
      3. Haz clic en el botón **"Authorize"** (🔒) arriba
      4. Pega el token y autoriza
      5. ¡Explora todos los endpoints!

      ### Dominio de email permitido

      - @canalcongroup.com

      ---

      **Versión**: 1.0.0
      **Última actualización**: Noviembre 2024
      `,
    )
    .setVersion('1.0.0')
    .addTag('Authentication', 'Endpoints de autenticación y gestión de sesiones')
    .addTag(
      'Purchases - Requisitions',
      'Gestión de requisiciones de compra (CRUD y flujo de aprobación)',
    )
    .addTag(
      'Purchases - Master Data',
      'Datos maestros: empresas, proyectos, materiales, estados',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description:
          'Ingresa tu token JWT obtenido del endpoint /auth/login (sin el prefijo "Bearer")',
        in: 'header',
      },
      'JWT-auth',
    )
    .addServer('http://localhost:3000', 'Servidor de Desarrollo Local')
    .addServer('https://colcanal-backend.onrender.com', 'Servidor de Render')
    .addServer('https://api.canalco.com', 'Servidor de Producción')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Canalco API - Documentación',
    customfavIcon: 'https://canalco.com/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 50px 0 }
      .swagger-ui .info .title { font-size: 36px }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai',
      },
    },
  });

  // Health check endpoint
  app.getHttpAdapter().get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const port = configService.get('port') || 3000;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
