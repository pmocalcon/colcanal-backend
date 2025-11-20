# Canalco Backend - NestJS

Modern backend API for Canalco ERP System built with NestJS, TypeORM, PostgreSQL, and JWT authentication.

## Description

Enterprise-grade RESTful API built with the [NestJS](https://github.com/nestjs/nest) framework, featuring comprehensive authentication, authorization, and database management.

## Features

- **Authentication & Authorization**
  - JWT-based authentication with access and refresh tokens
  - Role-based access control (RBAC)
  - Permission-based authorization
  - Corporate email domain validation (@canalco.com)
  - Bcrypt password hashing

- **Security**
  - Helmet for HTTP security headers
  - Rate limiting with throttler
  - CORS configuration
  - Input validation and sanitization
  - SQL injection protection via TypeORM ORM

- **Database**
  - PostgreSQL 16
  - TypeORM for ORM
  - Database migrations
  - Automated seeding system

- **API Documentation**
  - Swagger/OpenAPI at `/api/docs`
  - Complete endpoint documentation with examples

## Prerequisites

- Node.js 18+ or 20+
- npm
- PostgreSQL 16 (or use Docker)
- Docker & Docker Compose (optional)

## Installation

### 1. Install dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and update with your configuration:

```bash
cp .env.example .env
```

Key environment variables:
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `CORPORATE_EMAIL_DOMAIN`

## Running the Application

### Option 1: With Docker Compose (Recommended)

```bash
docker-compose up
```

This will automatically:
1. Start PostgreSQL 16
2. Run database migrations
3. Seed the database
4. Start the API on port 3000

### Option 2: Local Development

Start PostgreSQL (locally or with Docker):

```bash
# Using Docker for PostgreSQL only
docker run --name canalco-postgres \
  -e POSTGRES_USER=canalco \
  -e POSTGRES_PASSWORD=canalco \
  -e POSTGRES_DB=canalco \
  -p 5432:5432 -d postgres:16-alpine
```

Run migrations and seeds:

```bash
npm run migration:run
npm run seed:run
```

Start the application:

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## API Endpoints

### Base URL
```
http://localhost:3000/api
```

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/profile` | Get current user profile |

### API Documentation

Access Swagger UI at: `http://localhost:3000/api/docs`

## 📝 How to Test with Swagger (Step-by-Step)

### Testing Protected Endpoints

1. **Open Swagger UI**
   ```
   http://localhost:3000/api/docs
   ```

2. **Login to Get Access Token**
   - Find the `POST /api/auth/login` endpoint
   - Click "Try it out"
   - The default credentials are already filled:
     ```json
     {
       "email": "admin@canalco.com",
       "password": "admin123"
     }
     ```
   - Click "Execute"
   - Copy the `accessToken` from the response (the long string starting with `eyJ...`)

3. **Authorize Swagger**
   - Click the **"Authorize" button** at the top right of the page (🔓 icon)
   - Paste your `accessToken` in the "Value" field
   - **Important:** Just paste the token, don't add "Bearer" prefix
   - Click "Authorize" then "Close"

4. **Test Protected Endpoints**
   - Now you can test any protected endpoint, like `GET /api/auth/profile`
   - Click "Try it out" then "Execute"
   - The token will be automatically included in the request

### Example with cURL

If you prefer using cURL instead of Swagger:

```bash
# 1. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@canalco.com","password":"admin123"}'

# 2. Copy the accessToken from the response

# 3. Use it in protected endpoints
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### Token Information

- **Access Token:** Expires in 1 hour (3600 seconds)
- **Refresh Token:** Expires in 7 days (604800 seconds)
- Tokens are signed with HS256 algorithm

### Health Check

```
GET http://localhost:3000/health
```

## Default Credentials

After running seeds:

```
Email: admin@canalco.com
Password: admin123
```

**⚠️ IMPORTANT:** Change this password in production!

## Database Management

### Migrations

```bash
# Generate migration from entities
npm run migration:generate -- src/database/migrations/MigrationName

# Create empty migration
npm run migration:create -- src/database/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### Seeding

```bash
npm run seed:run
```

Seeds create:
- 6 roles (Administrador, Gerente, Compras, Almacen, PMO, Analista)
- 6 permissions (Ver, Crear, Editar, Eliminar, Aprobar, Exportar)
- 8 modules/gestiones (Dashboard, Compras, Inventarios, Reportes, Usuarios, Proveedores, Auditorías, Notificaciones)
- 1 admin user with full access

## Project Structure

```
backend-nestjs/
├── src/
│   ├── common/              # Shared resources
│   │   ├── decorators/      # Custom decorators (@Public, @Roles, etc.)
│   │   └── guards/          # Auth & authorization guards
│   ├── config/              # Environment configuration
│   ├── database/
│   │   ├── entities/        # TypeORM entities
│   │   ├── migrations/      # Database migrations
│   │   └── seeds/           # Database seeds
│   ├── modules/             # Feature modules
│   │   └── auth/            # Authentication module
│   ├── app.module.ts        # Root module
│   └── main.ts              # Entry point
├── .env                     # Environment variables
├── docker-compose.yml       # Docker orchestration
├── Dockerfile               # Docker image
└── package.json             # Dependencies & scripts
```

## Database Schema

### Auth Schema
- `roles` - User roles
- `permisos` - Permissions
- `roles_permisos` - Role-permission mapping
- `users` - User accounts
- `autorizaciones` - Authorization hierarchy
- `gestiones` - System modules
- `roles_gestiones` - Role-module mapping

### Business Schema
- `companies` - Companies
- `projects` - Projects
- `operation_centers` - Operation centers
- `project_codes` - Project codes
- `requisition_prefixes` - Requisition prefixes
- `requisition_sequences` - Requisition number sequences
- `material_groups` - Material groups
- `materials` - Materials catalog

## Security

### Guards

- **JwtAuthGuard** - Protects routes requiring authentication
- **RolesGuard** - Role-based access control
- **PermissionsGuard** - Permission-based access control

### Usage Example

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Administrador', 'Gerente')
@Get('protected')
async protectedRoute() {
  // Only Admin and Manager can access
}

@Public()
@Post('login')
async login() {
  // Public endpoint, no auth required
}
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Production Deployment

1. Set strong JWT secrets (min 32 characters)
2. Update `NODE_ENV=production`
3. Change default admin password
4. Build: `npm run build`
5. Run migrations: `npm run migration:run`
6. Start: `npm run start:prod`

## Troubleshooting

### Database connection issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres
```

### Port already in use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

## License

UNLICENSED - Private Project
