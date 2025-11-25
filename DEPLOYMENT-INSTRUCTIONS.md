# Instrucciones de Deployment - Flujo de Autorización

## Paso 1: Verificar que el deployment se completó en Render

1. Ve a tu dashboard de Render: https://dashboard.render.com/
2. Selecciona el servicio `colcanal-backend`
3. Ve a la pestaña "Events" o "Logs"
4. Verifica que el deployment se haya completado exitosamente
5. Busca en los logs que las migraciones se hayan ejecutado:
   ```
   ✅ Migration 1732500000000-UpdateCompaniesAndProjects executed
   ✅ Migration 1732501000000-AddConfigurationForNewCompanies executed
   ✅ Migration 1732502000000-AddAuthorizationWorkflow executed
   ✅ Migration 1732503000000-AddAuthorizationPermissions executed
   ```

## Paso 2: Crear el usuario de Gerencia de Proyectos en producción

### Opción A: Usando el Shell de Render (Recomendado)

1. En el dashboard de Render, selecciona tu servicio `colcanal-backend`
2. Haz clic en "Shell" en el menú superior
3. Espera a que se abra la terminal
4. Ejecuta el siguiente comando:

```bash
npm run create:gerencia-proyectos
```

5. Verás una salida similar a esta:

```
🚀 Iniciando creación de usuario Gerencia de Proyectos...

✅ Conexión a la base de datos establecida

📋 Verificando rol "Gerencia de Proyectos"...
✅ Rol encontrado (ID: 2)

👤 Verificando si el usuario ya existe...

🔐 Generando hash de contraseña...
✅ Hash generado

💾 Creando usuario en la base de datos...
✅ Usuario creado exitosamente:

   📧 Email:    gerencia.proyectos@canalcongroup.com
   🔑 Password: password123
   👤 Nombre:   Carlos Ramírez
   💼 Cargo:    Gerente de Proyectos
   🆔 User ID:  123

⚠️  IMPORTANTE:
   Por seguridad, se recomienda cambiar la contraseña
   después del primer login en producción.

🔍 Verificando permisos del rol...
✅ Permisos asignados al rol:
   • Ver: Permiso para ver requisiciones
   • Crear: Permiso para crear requisiciones
   • Autorizar: Permiso para autorizar requisiciones de Directores de Proyecto

🔍 Verificando gestiones del rol...
✅ Gestiones asignadas al rol:
   • Inventarios (inventarios)

🎉 Proceso completado exitosamente!
```

### Opción B: Usando el SQL Shell de PostgreSQL (Alternativa)

Si la Opción A no funciona, puedes crear el usuario directamente con SQL:

1. Ve a tu dashboard de Render
2. Selecciona tu base de datos PostgreSQL
3. Haz clic en "Shell" o "SQL"
4. Ejecuta el siguiente script SQL:

```sql
-- 1. Obtener el rol_id de Gerencia de Proyectos
SELECT rol_id FROM roles WHERE nombre_rol = 'Gerencia de Proyectos';

-- 2. Verificar si el usuario ya existe
SELECT user_id, email FROM users WHERE email = 'gerencia.proyectos@canalcongroup.com';

-- 3. Si NO existe, crear el usuario (reemplaza $HASH con el hash de bcrypt)
-- Nota: Necesitarás generar el hash de 'password123' con bcrypt antes
INSERT INTO users (email, password, nombre, cargo, rol_id, estado)
VALUES (
  'gerencia.proyectos@canalcongroup.com',
  '$2b$10$JIlcikblQpvlNpLLDP5.NelFZAUhUMPJJzVp7edY0q7WXalaIwZz.',
  'Carlos Ramírez',
  'Gerente de Proyectos',
  2,  -- Reemplaza con el rol_id obtenido en el paso 1
  true
);
```

**Nota**: El hash incluido arriba es para la contraseña `password123`.

## Paso 3: Verificar que todo funciona

### 3.1 Probar el Login

Usa Swagger o Postman para probar:

**URL**: `https://tu-app.onrender.com/api/auth/login`

**Request**:
```json
{
  "email": "gerencia.proyectos@canalcongroup.com",
  "password": "password123"
}
```

**Response esperada** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": 123,
    "email": "gerencia.proyectos@canalcongroup.com",
    "nombre": "Carlos Ramírez",
    "cargo": "Gerente de Proyectos",
    "role": {
      "roleId": 2,
      "nombreRol": "Gerencia de Proyectos",
      "category": "GERENCIA"
    }
  }
}
```

### 3.2 Verificar que el nuevo endpoint funciona

**URL**: `https://tu-app.onrender.com/api/purchases/requisitions/:id/authorize`

**Headers**:
```
Authorization: Bearer {token_de_gerencia_proyectos}
Content-Type: application/json
```

**Request**:
```json
{
  "decision": "authorize",
  "comments": "Prueba de autorización"
}
```

### 3.3 Verificar los nuevos estados

1. Login como Director de Proyecto Antioquia:
   - Email: `director.antioquia@canalcongroup.com`
   - Password: `password123`

2. Crear una requisición para el proyecto "Ciudad Bolívar"

3. Login como Director PMO:
   - Email: `director.pmo@canalcongroup.com`
   - Password: `password123`

4. Revisar y aprobar la requisición

5. Verificar que el estado cambió a `pendiente_autorizacion`

6. Login como Gerencia de Proyectos (credenciales arriba)

7. Autorizar la requisición

8. Verificar que el estado cambió a `autorizado`

## Paso 4: Notificar al equipo de Frontend

Una vez que todo esté funcionando en producción:

1. Enviar el documento [FRONTEND-AUTHORIZATION-WORKFLOW.md](FRONTEND-AUTHORIZATION-WORKFLOW.md) al equipo de frontend
2. Informarles que el backend está desplegado y funcionando
3. Darles acceso a Swagger en producción para que puedan probar: `https://tu-app.onrender.com/api`
4. Compartir las credenciales de prueba

## Troubleshooting

### Error: "Rol 'Gerencia de Proyectos' no encontrado"

**Causa**: Las migraciones no se ejecutaron correctamente.

**Solución**:
1. Ve a Shell de Render
2. Ejecuta: `npm run migration:run`
3. Verifica que todas las migraciones se ejecuten
4. Intenta crear el usuario nuevamente

### Error: "Usuario ya existe"

**Solución**: El usuario ya fue creado. Puedes verificarlo con:

```bash
npm run create:gerencia-proyectos
```

El script detectará que ya existe y te mostrará la información.

### Error: "No se encontraron permisos asignados al rol"

**Causa**: La migración `1732503000000-AddAuthorizationPermissions.ts` no se ejecutó.

**Solución**:
1. Verifica en los logs de Render que la migración se haya ejecutado
2. Si no, ejecuta manualmente: `npm run migration:run`

## Comandos Útiles en Render Shell

```bash
# Ver todas las migraciones ejecutadas
npm run typeorm migration:show

# Ejecutar migraciones pendientes
npm run migration:run

# Crear usuario de Gerencia de Proyectos
npm run create:gerencia-proyectos

# Ver logs del servidor
tail -f logs/app.log

# Verificar variables de entorno
env | grep DB_
```

## Cambiar la Contraseña en Producción

Por seguridad, se recomienda cambiar la contraseña después del primer login.

**Opción 1**: Implementar un endpoint de cambio de contraseña en el backend

**Opción 2**: Actualizar directamente en la base de datos:

```sql
-- Generar un nuevo hash de bcrypt para la nueva contraseña
-- Luego ejecutar:
UPDATE users
SET password = '$2b$10$NUEVO_HASH_AQUI'
WHERE email = 'gerencia.proyectos@canalcongroup.com';
```

---

**Última actualización**: 2024-11-25
