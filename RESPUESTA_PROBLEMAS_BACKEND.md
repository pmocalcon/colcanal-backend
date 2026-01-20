# Respuesta a Problemas Reportados - Sistema de Accesos

**Fecha:** 2026-01-20
**Commit:** `801a8a0c`
**Estado:** 1 problema resuelto, 2 requieren investigación

---

## ✅ Problema 2: RESUELTO - Filtro companyId ahora acepta múltiples IDs

### Cambios implementados

**Antes:**
```typescript
GET /surveys/works?companyId=6  // ✅ Funcionaba
GET /surveys/works?companyId=6,7,9  // ❌ No funcionaba - retornaba obras incorrectas
```

**Ahora:**
```typescript
GET /surveys/works?companyId=6  // ✅ Funciona (single ID)
GET /surveys/works?companyId=6,7,9  // ✅ Funciona (múltiples IDs separados por comas)
```

### Detalles técnicos

**Controller ([surveys.controller.ts:62-73](src/modules/surveys/surveys.controller.ts#L62-L73)):**
```typescript
async getWorks(
  @Query('companyId') companyIdParam?: string,  // Ahora es string, no number
  @Query('projectId') projectId?: number,
  @Query('createdBy') createdBy?: number,
) {
  // Parsea IDs separados por coma
  const companyIds = companyIdParam
    ? companyIdParam.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id))
    : undefined;

  return this.surveysService.getWorks(companyIds, projectId, createdBy);
}
```

**Service ([surveys.service.ts:128-149](src/modules/surveys/surveys.service.ts#L128-L149)):**
```typescript
async getWorks(companyIds?: number[], projectId?: number, createdBy?: number): Promise<Work[]> {
  const query = this.workRepository.createQueryBuilder('work')
    .leftJoinAndSelect('work.company', 'company')
    .leftJoinAndSelect('work.project', 'project')
    .leftJoinAndSelect('work.creator', 'creator');

  if (companyIds && companyIds.length > 0) {
    query.andWhere('work.companyId IN (:...companyIds)', { companyIds });  // Usa IN en vez de =
  }

  // ... resto del código
}
```

### Ejemplos de uso

```bash
# Single ID
GET /surveys/works?companyId=6
# SQL: WHERE work.companyId IN (6)

# Multiple IDs
GET /surveys/works?companyId=6,7,9
# SQL: WHERE work.companyId IN (6, 7, 9)

# Con otros filtros
GET /surveys/works?companyId=6,7,9&createdBy=12
# SQL: WHERE work.companyId IN (6, 7, 9) AND work.createdBy = 12
```

### Testing

**Caso 1: Valle del Cauca (companyIds: 6, 7, 9)**
```bash
curl "http://localhost:3000/api/surveys/works?companyId=6,7,9" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Debe retornar SOLO obras con companyId = 6, 7, o 9
# NO debe retornar obras con companyId = 4 (Circasia)
```

**Caso 2: Un solo ID**
```bash
curl "http://localhost:3000/api/surveys/works?companyId=6" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Debe retornar SOLO obras con companyId = 6
```

### Retrocompatibilidad

✅ **Completamente retrocompatible**
- URLs con un solo ID siguen funcionando exactamente igual
- No se requieren cambios en código existente que use un solo ID

---

## ⚠️ Problema 1: REQUIERE INVESTIGACIÓN - Estructura de datos companies vs projects

### Estado actual del código

El método `getMyAccess()` **está correctamente implementado** y separa companies de projects:

```typescript
// surveys.service.ts línea 994-1023
async getMyAccess(userId: number): Promise<{
  companies: { companyId: number; name: string }[];
  projects: { projectId: number; name: string; companyId: number }[];
}> {
  const accesses = await this.surveyReviewerAccessRepository.find({
    where: { userId },
    relations: ['company', 'project', 'project.company'],
  });

  const companies: { companyId: number; name: string }[] = [];
  const projects: { projectId: number; name: string; companyId: number }[] = [];

  for (const access of accesses) {
    if (access.companyId && access.company) {
      companies.push({
        companyId: access.company.companyId,
        name: access.company.name,
      });
    }
    if (access.projectId && access.project) {
      projects.push({
        projectId: access.project.projectId,
        name: access.project.name,
        companyId: access.project.companyId,  // Incluye relación con company
      });
    }
  }

  return { companies, projects };
}
```

### Estructura de base de datos

**Tabla `companies`:**
- `company_id` (PK)
- `name` (ej: "Unión Temporal Alumbrado Público Santa Bárbara")
- `abbreviation`
- IPP config

**Tabla `projects`:**
- `project_id` (PK)
- `company_id` (FK → companies)
- `name` (ej: "Ciudad Bolívar", "Jericó")
- `abbreviation`
- IPP config

**Tabla `survey_reviewer_access`:**
- `access_id` (PK)
- `user_id` (FK → users)
- `company_id` (FK → companies) - **NULL si es project**
- `project_id` (FK → projects) - **NULL si es company**
- **Constraint:** `CHECK (company_id IS NOT NULL XOR project_id IS NOT NULL)`

### Posibles causas del problema reportado

1. **Datos mal insertados en `survey_reviewer_access`:**
   - Alguien pudo haber insertado `projectId` en el campo `companyId`
   - Query para verificar:
   ```sql
   SELECT
     sra.access_id,
     sra.user_id,
     sra.company_id,
     sra.project_id,
     c.name as company_name,
     p.name as project_name
   FROM survey_reviewer_access sra
   LEFT JOIN companies c ON c.company_id = sra.company_id
   LEFT JOIN projects p ON p.project_id = sra.project_id
   WHERE sra.user_id = 12;  -- Usuario ejemplo
   ```

2. **Frontend interpretando mal la respuesta:**
   - Backend retorna correctamente separados
   - Pero frontend los combina o muestra incorrectamente

3. **Confusión entre Work.companyId y Project:**
   - La tabla `works` tiene `companyId` que puede apuntar a una empresa real
   - O puede apuntar a un "project" (que en realidad está en la tabla `companies`)

### Acción requerida

**Para el equipo de frontend:**
```typescript
// Verificar qué retorna el endpoint
const response = await fetch('/api/surveys/my-access');
const data = await response.json();

console.log('Companies:', data.companies);
console.log('Projects:', data.projects);

// ¿Qué array tiene datos?
// ¿Los "companies" tienen projectId o companyId?
```

**Para el equipo de backend:**
```sql
-- Verificar la tabla survey_reviewer_access
SELECT * FROM survey_reviewer_access WHERE user_id = 12;

-- Verificar si hay companyIds que en realidad son projectIds
SELECT
  sra.*,
  c.name as company_name,
  p.name as project_name
FROM survey_reviewer_access sra
LEFT JOIN companies c ON c.company_id = sra.company_id
LEFT JOIN projects p ON p.project_id = sra.project_id;
```

---

## ❓ Problema 3: REQUIERE INFORMACIÓN ADICIONAL - Permisos de rol

### Información necesaria para diagnosticar

No tengo acceso al sistema de permisos completo. Necesito saber:

1. **¿Cuál es el slug exacto del módulo en la BD?**
   ```sql
   SELECT * FROM modules WHERE name LIKE '%levantamiento%' OR slug LIKE '%survey%';
   ```

2. **¿El usuario tiene el permiso asignado?**
   ```sql
   SELECT
     u.user_id,
     u.nombre,
     r.rol_id,
     r.nombre_rol,
     p.permission_id,
     m.name as module_name,
     m.slug as module_slug,
     p.action
   FROM users u
   JOIN roles r ON u.rol_id = r.rol_id
   JOIN role_permissions rp ON r.rol_id = rp.rol_id
   JOIN permissions p ON rp.permission_id = p.permission_id
   JOIN modules m ON p.module_id = m.module_id
   WHERE u.user_id = 12  -- Usuario ejemplo
     AND (m.slug LIKE '%levantamiento%' OR m.slug LIKE '%survey%' OR m.slug LIKE '%works%');
   ```

3. **¿Hay cache de permisos?**
   - ¿Los permisos se cachean en JWT token?
   - ¿Se cachean en Redis/Memcached?
   - ¿El usuario hizo logout/login después de asignar permisos?

4. **¿Qué middleware valida permisos?**
   - Necesito ver el código del middleware de permisos
   - Archivo probable: `src/common/guards/permissions.guard.ts` o similar

### Debug recomendado

**Agregar logs temporales al middleware de permisos:**
```typescript
console.log('🔍 [PermissionsGuard] Validando acceso:', {
  userId: req.user.userId,
  roleId: req.user.roleId,
  requiredSlug: requiredModule,
  userPermissions: req.user.permissions,
  hasAccess: result
});
```

**Verificar en Swagger:**
```bash
# Hacer una petición a Swagger y ver la respuesta
GET /api/surveys/works
Authorization: Bearer YOUR_TOKEN

# ¿Retorna 200 OK o 403 Forbidden?
```

---

## 📊 Resumen

| Problema | Estado | Acción |
|----------|--------|--------|
| **#1: Estructura companies/projects** | ⚠️ Requiere investigación | Verificar datos en `survey_reviewer_access` |
| **#2: Filtro companyId múltiple** | ✅ **RESUELTO** | Pull latest from GitHub y reiniciar backend |
| **#3: Permisos de rol** | ❓ Falta información | Enviar queries SQL para diagnóstico |

---

## 🚀 Para el frontend

### 1. Actualizar el backend

```bash
cd colcanal-backend
git pull origin main
npm run start:dev
```

### 2. Probar el filtro arreglado

```typescript
// Esto ahora funciona correctamente
const response = await fetch('/api/surveys/works?companyId=6,7,9&createdBy=12');
const works = await response.json();

console.log('Obras recibidas:', works.length);
console.log('CompanyIds únicos:', [...new Set(works.map(w => w.companyId))]);
// Debe mostrar solo: [6, 7, 9]
```

### 3. Ayudar con diagnóstico

**Para Problema 1:**
```typescript
const { companies, projects } = await fetch('/api/surveys/my-access').then(r => r.json());
console.log('📦 Companies:', JSON.stringify(companies, null, 2));
console.log('📦 Projects:', JSON.stringify(projects, null, 2));
```

**Para Problema 3:**
```typescript
// Verificar token JWT
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('👤 User permissions:', payload.permissions);
```

---

## 📞 Contacto

Si persisten problemas después de actualizar:
- **Problema 1:** Enviar screenshot de lo que retorna `/surveys/my-access`
- **Problema 3:** Enviar resultado de las queries SQL

**Commit con fix:** [`801a8a0c`](https://github.com/pmocalcon/colcanal-backend/commit/801a8a0c)
