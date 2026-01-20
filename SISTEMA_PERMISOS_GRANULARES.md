# Sistema de Permisos Granulares

## 📋 Resumen

El sistema de permisos granulares permite controlar **acciones específicas** dentro de cada módulo, no solo el acceso al módulo completo.

### Problema que resuelve

**Antes:**
```
Usuario tiene acceso al módulo "Levantamientos"
  ↓
Puede hacer TODO dentro del módulo ❌
```

**Ahora:**
```
Usuario tiene acceso al módulo "Levantamientos"
  ↓
Puede hacer SOLO lo que sus permisos permiten ✅
  - levantamientos:ver
  - levantamientos:crear
  - levantamientos:editar
  - etc.
```

---

## 🔧 Estructura del Sistema

### 1. Nomenclatura de Permisos

Los permisos siguen el formato: **`modulo:accion`**

```
levantamientos:ver
levantamientos:crear
levantamientos:editar
levantamientos:eliminar
levantamientos:revisar
levantamientos:aprobar
levantamientos:reabrir
```

**Ventajas:**
- ✅ Fácil de leer y entender
- ✅ Escalable para futuros módulos
- ✅ Compatible con el sistema actual

### 2. Tablas de Base de Datos

```sql
-- Tabla de permisos
permisos (
  permiso_id,
  nombre_permiso,  -- Ej: "levantamientos:crear"
  descripcion
)

-- Relación roles-permisos
roles_permisos (
  id,
  rol_id → roles.rol_id,
  permiso_id → permisos.permiso_id
)
```

### 3. Matriz de Permisos por Rol

| Rol | Ver | Crear | Editar | Eliminar | Revisar | Aprobar | Reabrir |
|-----|-----|-------|--------|----------|---------|---------|---------|
| **PQRS** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Coordinador Operativo** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Director de Proyecto** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Director Técnico** | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Super Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🚀 Implementación en el Código

### 1. Guard y Decorator

El sistema usa el `@Permissions()` decorator existente:

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('surveys')
export class SurveysController {

  @Get()
  @Permissions('levantamientos:ver')
  async getSurveys() {
    // Solo usuarios con permiso "levantamientos:ver" pueden acceder
  }

  @Post()
  @Permissions('levantamientos:crear')
  async createSurvey() {
    // Solo usuarios con permiso "levantamientos:crear" pueden acceder
  }

  @Patch(':id/approve-all')
  @Permissions('levantamientos:aprobar')
  async approveAllBlocks() {
    // Solo usuarios con permiso "levantamientos:aprobar" pueden acceder
  }
}
```

### 2. Cómo Funciona el Guard

```typescript
// src/common/guards/permissions.guard.ts

@Injectable()
export class PermissionsGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Obtener permisos requeridos del decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 2. Obtener usuario del request
    const { user } = context.switchToHttp().getRequest();

    // 3. Buscar permisos del rol del usuario en BD
    const userPermissions = await this.rolePermissionRepository.find({
      where: { rolId: user.role.rolId },
      relations: ['permission'],
    });

    // 4. Verificar si el usuario tiene al menos uno de los permisos requeridos
    return requiredPermissions.some((permission) =>
      permissionNames.includes(permission)
    );
  }
}
```

---

## 📊 Administración de Permisos

### Desde DBeaver (Render)

#### 1. Ver permisos de un rol

```sql
-- Ver todos los permisos del rol "PQRS Jericó"
SELECT
  r.nombre_rol,
  p.nombre_permiso,
  p.descripcion
FROM roles r
JOIN roles_permisos rp ON r.rol_id = rp.rol_id
JOIN permisos p ON rp.permiso_id = p.permiso_id
WHERE r.nombre_rol = 'PQRS Jericó'
ORDER BY p.nombre_permiso;
```

#### 2. Ver permisos de un usuario

```sql
-- Ver todos los permisos del usuario con userId=12
SELECT
  u.nombre,
  u.email,
  r.nombre_rol,
  p.nombre_permiso,
  p.descripcion
FROM users u
JOIN roles r ON u.rol_id = r.rol_id
JOIN roles_permisos rp ON r.rol_id = rp.rol_id
JOIN permisos p ON rp.permiso_id = p.permiso_id
WHERE u.user_id = 12
AND p.nombre_permiso LIKE 'levantamientos:%'
ORDER BY p.nombre_permiso;
```

#### 3. Agregar un permiso a un rol

```sql
-- Agregar permiso "levantamientos:crear" al rol "Director de Proyecto"
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.rol_id, p.permiso_id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre_rol = 'Director de Proyecto'
AND p.nombre_permiso = 'levantamientos:crear'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
```

#### 4. Quitar un permiso de un rol

```sql
-- Quitar permiso "levantamientos:eliminar" del rol "PQRS Jericó"
DELETE FROM roles_permisos
WHERE rol_id = (SELECT rol_id FROM roles WHERE nombre_rol = 'PQRS Jericó')
AND permiso_id = (SELECT permiso_id FROM permisos WHERE nombre_permiso = 'levantamientos:eliminar');
```

#### 5. Crear un nuevo rol con permisos

```sql
-- 1. Crear el rol
INSERT INTO roles (nombre_rol, descripcion, category)
VALUES ('Supervisor de Obras', 'Puede ver y revisar levantamientos', NULL)
RETURNING rol_id;

-- 2. Asignar permisos al nuevo rol (reemplazar 999 con el rol_id del paso 1)
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT 999, p.permiso_id
FROM permisos p
WHERE p.nombre_permiso IN (
  'levantamientos:ver',
  'levantamientos:revisar'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
```

---

## 🔄 Escalabilidad para Futuros Módulos

### Ejemplo: Módulo de Inventarios

**1. Crear permisos:**
```sql
INSERT INTO permisos (nombre_permiso, descripcion)
VALUES
  ('inventarios:ver', 'Ver inventarios'),
  ('inventarios:crear', 'Crear items en inventario'),
  ('inventarios:editar', 'Editar items de inventario'),
  ('inventarios:eliminar', 'Eliminar items de inventario'),
  ('inventarios:aprobar', 'Aprobar movimientos de inventario')
ON CONFLICT (nombre_permiso) DO NOTHING;
```

**2. Asignar a roles:**
```sql
-- Asignar permisos de inventarios a "Coordinador Operativo"
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.rol_id, p.permiso_id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre_rol = 'Coordinador Operativo'
AND p.nombre_permiso LIKE 'inventarios:%'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
```

**3. Aplicar en el código:**
```typescript
@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {

  @Get()
  @Permissions('inventarios:ver')
  async getInventory() { }

  @Post()
  @Permissions('inventarios:crear')
  async createItem() { }

  @Patch(':id/approve')
  @Permissions('inventarios:aprobar')
  async approveMovement() { }
}
```

---

## ✅ Ventajas del Sistema

1. **Control Granular**
   - Control preciso de qué puede hacer cada rol
   - No más "todo o nada" por módulo

2. **Escalable**
   - Fácil agregar nuevos permisos
   - Fácil agregar nuevos módulos
   - Nomenclatura consistente

3. **Administrable**
   - Queries SQL simples para gestionar permisos
   - No requiere cambios en código para ajustar permisos
   - Transparente y auditable

4. **Compatible**
   - NO toca el sistema actual de requisiciones
   - Reutiliza infraestructura existente (PermissionsGuard)
   - Convive con otros sistemas de permisos

5. **Mantenible**
   - Código limpio con decorators
   - Un solo lugar para definir permisos (BD)
   - Fácil de testear

---

## 🧪 Testing

### Verificar que los permisos funcionan

**1. Login como usuario PQRS:**
```bash
# Debe funcionar (tiene permiso "levantamientos:crear")
POST /api/surveys
Authorization: Bearer TOKEN_PQRS

# Debe fallar con 403 (NO tiene permiso "levantamientos:aprobar")
PATCH /api/surveys/1/approve-all
Authorization: Bearer TOKEN_PQRS
```

**2. Login como Director Técnico:**
```bash
# Debe fallar con 403 (NO tiene permiso "levantamientos:crear")
POST /api/surveys
Authorization: Bearer TOKEN_DIRECTOR_TECNICO

# Debe funcionar (tiene permiso "levantamientos:aprobar")
PATCH /api/surveys/1/approve-all
Authorization: Bearer TOKEN_DIRECTOR_TECNICO
```

### Respuesta esperada sin permisos

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

---

## 📁 Archivos Modificados

### Backend (TypeScript)

1. **src/modules/surveys/surveys.controller.ts**
   - Agregado `@Permissions()` decorator a cada endpoint
   - Agregado `PermissionsGuard` a nivel de controller

2. **src/modules/surveys/surveys.module.ts**
   - Agregado `RolePermission` entity al módulo

3. **src/database/migrations/1736400000000-AddSurveyGranularPermissions.ts**
   - Migration para crear permisos y asignarlos a roles

### Base de Datos (SQL)

4. **PERMISOS_GRANULARES_LEVANTAMIENTOS.sql**
   - Script SQL para ejecutar en DBeaver/Render
   - Incluye permisos, asignaciones y queries de verificación

### Documentación

5. **SISTEMA_PERMISOS_GRANULARES.md** (este archivo)
   - Documentación completa del sistema

---

## 🚨 Importante

### Para NO perder datos en Render

1. **SIEMPRE ejecutar queries con `ON CONFLICT DO NOTHING`**
   ```sql
   INSERT INTO permisos (nombre_permiso, descripcion)
   VALUES ('nuevo:permiso', 'Descripción')
   ON CONFLICT (nombre_permiso) DO NOTHING;
   ```

2. **NUNCA ejecutar `DROP TABLE` o `TRUNCATE`**

3. **Hacer backup antes de queries grandes**
   ```sql
   -- Backup de roles_permisos
   CREATE TABLE roles_permisos_backup AS
   SELECT * FROM roles_permisos;
   ```

4. **Probar queries en local primero**
   - Ejecutar en base de datos local
   - Verificar resultados
   - Luego ejecutar en Render

---

## 📞 Soporte

**Para agregar un nuevo módulo con permisos:**
1. Crear permisos en BD con nomenclatura `modulo:accion`
2. Asignar permisos a roles correspondientes
3. Agregar `@Permissions()` decorator en el controller
4. Agregar `PermissionsGuard` a nivel de controller
5. Agregar `RolePermission` entity al módulo

**Para cambiar permisos de un rol:**
1. Ejecutar queries SQL en DBeaver
2. Usuario debe hacer logout/login para refrescar permisos
3. Verificar en Swagger que funciona correctamente

**Si un endpoint retorna 403 Forbidden:**
1. Verificar que el rol tiene el permiso asignado (SQL query)
2. Verificar que el usuario tiene el rol correcto
3. Verificar que el permiso está en el decorator del endpoint
4. Usuario debe hacer logout/login

---

## 🎯 Próximos Pasos

Para otros módulos que necesiten permisos granulares:

1. **Inventarios** → `inventarios:ver`, `inventarios:crear`, `inventarios:aprobar`
2. **Reportes** → `reportes:ver`, `reportes:generar`, `reportes:exportar`
3. **Usuarios** → `usuarios:ver`, `usuarios:crear`, `usuarios:editar`, `usuarios:eliminar`
4. **Requisiciones** (si se quiere migrar) → `requisiciones:ver`, `requisiciones:crear`, `requisiciones:autorizar`

El sistema está listo para escalar a cualquier módulo nuevo.
