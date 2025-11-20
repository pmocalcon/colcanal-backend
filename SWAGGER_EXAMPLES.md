# Ejemplos Prácticos de Swagger - Canalco API

Este documento contiene ejemplos funcionales para probar el API usando Swagger o curl.

## 📋 Tabla de Contenidos

1. [Autenticación](#autenticación)
2. [Crear Requisición](#crear-requisición)
3. [Consultar Requisiciones](#consultar-requisiciones)
4. [Flujo de Aprobación](#flujo-de-aprobación)
5. [Master Data](#master-data)

---

## 🔐 Autenticación

### Login como Analista PMO (puede crear requisiciones)

```bash
curl -X 'POST' \
  'http://localhost:3000/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{
  "email": "analista.pmo@canalco.com",
  "password": "Canalco2025!"
}'
```

**Respuesta esperada:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": 5,
    "email": "analista.pmo@canalco.com",
    "nombre": "Sandra Jiménez",
    "cargo": "Analista PMO",
    "rolId": 11,
    "nombreRol": "Analista PMO"
  }
}
```

⚠️ **Importante**: Guarda el `accessToken` para usarlo en las siguientes peticiones.

---

## 📝 Crear Requisición

### Ejemplo 1: Requisición para Proyecto Ciudad Bolívar

```bash
curl -X 'POST' \
  'http://localhost:3000/api/purchases/requisitions' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer TU_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
  "companyId": 1,
  "projectId": 2,
  "items": [
    {
      "materialId": 1,
      "quantity": 10,
      "observation": "Cable #10 AWG para instalación principal"
    },
    {
      "materialId": 3,
      "quantity": 5,
      "observation": "Breakers para tablero secundario"
    }
  ]
}'
```

**Resultado esperado**: Requisición `CB-0001` creada ✅

---

### Ejemplo 2: Requisición para Proyecto Administrativo

```bash
curl -X 'POST' \
  'http://localhost:3000/api/purchases/requisitions' \
  -H 'Authorization: Bearer TU_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
  "companyId": 1,
  "projectId": 1,
  "items": [
    {
      "materialId": 8,
      "quantity": 20,
      "observation": "Resmas de papel para oficina"
    }
  ]
}'
```

**Resultado esperado**: Requisición `ADM-0001` creada ✅

---

### Ejemplo 3: Requisición para UT El Cerrito (sin proyecto)

```bash
curl -X 'POST' \
  'http://localhost:3000/api/purchases/requisitions' \
  -H 'Authorization: Bearer TU_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
  "companyId": 2,
  "items": [
    {
      "materialId": 10,
      "quantity": 15,
      "observation": "Lámparas LED 50W para iluminación"
    }
  ]
}'
```

**Resultado esperado**: Requisición `CE-0001` creada ✅

---

## 🔍 Consultar Requisiciones

### Ver todas mis requisiciones

```bash
curl -X 'GET' \
  'http://localhost:3000/api/purchases/requisitions/my-requisitions' \
  -H 'Authorization: Bearer TU_ACCESS_TOKEN'
```

### Filtrar por estado: solo pendientes

```bash
curl -X 'GET' \
  'http://localhost:3000/api/purchases/requisitions/my-requisitions?status=pendiente' \
  -H 'Authorization: Bearer TU_ACCESS_TOKEN'
```

### Filtrar por proyecto (Ciudad Bolívar = projectId: 2)

```bash
curl -X 'GET' \
  'http://localhost:3000/api/purchases/requisitions/my-requisitions?projectId=2' \
  -H 'Authorization: Bearer TU_ACCESS_TOKEN'
```

### Paginación (página 2, 20 resultados por página)

```bash
curl -X 'GET' \
  'http://localhost:3000/api/purchases/requisitions/my-requisitions?page=2&limit=20' \
  -H 'Authorization: Bearer TU_ACCESS_TOKEN'
```

---

## ✅ Flujo de Aprobación

### Paso 1: Director revisa la requisición (Nivel 1)

**Login como Director Técnico:**

```bash
curl -X 'POST' \
  'http://localhost:3000/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{
  "email": "director.tecnico@canalco.com",
  "password": "Canalco2025!"
}'
```

**Ver requisiciones pendientes de mi revisión:**

```bash
curl -X 'GET' \
  'http://localhost:3000/api/purchases/requisitions/pending-actions' \
  -H 'Authorization: Bearer TOKEN_DIRECTOR'
```

**Aprobar requisición (cambia :id por el ID real):**

```bash
curl -X 'POST' \
  'http://localhost:3000/api/purchases/requisitions/1/review' \
  -H 'Authorization: Bearer TOKEN_DIRECTOR' \
  -H 'Content-Type: application/json' \
  -d '{
  "decision": "approve",
  "comments": "Requisición aprobada, materiales necesarios para el proyecto"
}'
```

**Rechazar requisición:**

```bash
curl -X 'POST' \
  'http://localhost:3000/api/purchases/requisitions/1/review' \
  -H 'Authorization: Bearer TOKEN_DIRECTOR' \
  -H 'Content-Type: application/json' \
  -d '{
  "decision": "reject",
  "comments": "Materiales ya disponibles en bodega, no es necesario comprar"
}'
```

---

### Paso 2: Gerencia aprueba la requisición (Nivel 2)

**Login como Gerencia:**

```bash
curl -X 'POST' \
  'http://localhost:3000/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{
  "email": "gerencia@canalco.com",
  "password": "Canalco2025!"
}'
```

**Aprobar requisición:**

```bash
curl -X 'POST' \
  'http://localhost:3000/api/purchases/requisitions/1/approve' \
  -H 'Authorization: Bearer TOKEN_GERENCIA' \
  -H 'Content-Type: application/json' \
  -d '{
  "comments": "Aprobado por gerencia, proceder con la compra"
}'
```

**Rechazar requisición:**

```bash
curl -X 'POST' \
  'http://localhost:3000/api/purchases/requisitions/1/reject' \
  -H 'Authorization: Bearer TOKEN_GERENCIA' \
  -H 'Content-Type: application/json' \
  -d '{
  "comments": "Presupuesto insuficiente para esta requisición en el trimestre actual"
}'
```

---

## 📊 Master Data

### Obtener todas las empresas

```bash
curl -X 'GET' \
  'http://localhost:3000/api/purchases/master-data/companies' \
  -H 'Authorization: Bearer TU_ACCESS_TOKEN'
```

**Respuesta:**
```json
{
  "data": [
    { "companyId": 1, "name": "Canales & Contactos" },
    { "companyId": 2, "name": "UT El Cerrito" },
    { "companyId": 3, "name": "UT Circasia" }
  ],
  "total": 8
}
```

### Obtener todos los proyectos

```bash
curl -X 'GET' \
  'http://localhost:3000/api/purchases/master-data/projects' \
  -H 'Authorization: Bearer TU_ACCESS_TOKEN'
```

**Respuesta:**
```json
{
  "data": [
    { "projectId": 1, "name": "Administrativo", "companyId": 1 },
    { "projectId": 2, "name": "Ciudad Bolívar", "companyId": 1 },
    { "projectId": 3, "name": "Jericó", "companyId": 1 },
    { "projectId": 4, "name": "Pueblo Rico", "companyId": 1 },
    { "projectId": 5, "name": "Tarso", "companyId": 1 }
  ],
  "total": 5
}
```

### Obtener todos los materiales

```bash
curl -X 'GET' \
  'http://localhost:3000/api/purchases/master-data/materials' \
  -H 'Authorization: Bearer TU_ACCESS_TOKEN'
```

**Respuesta:**
```json
{
  "data": [
    {
      "materialId": 1,
      "code": "ELEC-001",
      "description": "Cable #10 AWG",
      "materialGroup": { "groupId": 7, "name": "Eléctrico" }
    },
    {
      "materialId": 3,
      "code": "ELEC-003",
      "description": "Breaker 2x20A",
      "materialGroup": { "groupId": 7, "name": "Eléctrico" }
    }
  ],
  "total": 12
}
```

### Obtener todos los estados disponibles

```bash
curl -X 'GET' \
  'http://localhost:3000/api/purchases/master-data/statuses' \
  -H 'Authorization: Bearer TU_ACCESS_TOKEN'
```

---

## 🎯 Casos de Uso Completos

### Caso 1: Crear y aprobar una requisición de principio a fin

1. **Login como Analista PMO**
2. **Consultar empresas y proyectos disponibles** (master-data)
3. **Consultar materiales disponibles** (master-data)
4. **Crear requisición** con companyId, projectId e items
5. **Logout y login como Director Técnico**
6. **Ver requisiciones pendientes de revisión**
7. **Revisar y aprobar la requisición** (POST /review con decision: approve)
8. **Logout y login como Gerencia**
9. **Ver requisiciones pendientes de aprobación**
10. **Aprobar la requisición final** (POST /approve)
11. **Verificar el estado final** (debe estar en "aprobada_gerencia")

---

## ⚠️ Errores Comunes

### Error 404: Prefijo no encontrado

```json
{
  "statusCode": 404,
  "message": ["No se encontró prefijo para companyId=1, projectId=99"]
}
```

**Solución**: Verifica que la combinación companyId/projectId tenga un prefijo configurado.

### Error 403: Sin permisos para crear

```json
{
  "statusCode": 403,
  "message": "Los usuarios con rol Gerencia o Compras no pueden crear requisiciones"
}
```

**Solución**: Usa un usuario con rol Analista PMO, PQRS o Director.

### Error 400: Material no encontrado

```json
{
  "statusCode": 400,
  "message": ["Material no encontrado"]
}
```

**Solución**: Consulta los materiales disponibles en GET /master-data/materials.

---

## 📚 IDs de Referencia Rápida

### Empresas (companyId)
- 1: Canales & Contactos
- 2: UT El Cerrito
- 3: UT Circasia
- 4-8: Otras UT

### Proyectos de Canales & Contactos (projectId)
- 1: Administrativo → Prefijo: `ADM`
- 2: Ciudad Bolívar → Prefijo: `CB`
- 3: Jericó → Prefijo: `JE`
- 4: Pueblo Rico → Prefijo: `PR`
- 5: Tarso → Prefijo: `TA`

### Materiales Disponibles (materialId)
Los IDs comienzan desde 1 después de ejecutar los seeds:

| ID | Código | Descripción | Grupo |
|----|--------|-------------|-------|
| 1 | ELEC-001 | Cable #10 AWG | Eléctrico |
| 2 | ELEC-002 | Cable #12 AWG | Eléctrico |
| 3 | ELEC-003 | Breaker 2x20A | Eléctrico |
| 4 | CONST-001 | Poste de concreto 12m | Construcción |
| 5 | CONST-002 | Cemento gris 50kg | Construcción |
| 6 | HERR-001 | Alicate universal 8" | Herramientas |
| 7 | HERR-002 | Destornillador plano | Herramientas |
| 8 | OFIC-001 | Resma papel carta | Suministros de Oficina |
| 9 | OFIC-002 | Carpeta AZ | Suministros de Oficina |
| 10 | ILUM-001 | Lámpara LED 50W | Iluminación |
| 11 | ILUM-002 | Lámpara LED 100W | Iluminación |
| 12 | ILUM-003 | Reflector LED 150W | Iluminación |

✅ **Todos estos IDs están disponibles para usar en requisiciones**

### Usuarios de Prueba
| Email | Password | Rol | Puede Crear | Puede Revisar | Puede Aprobar |
|-------|----------|-----|-------------|---------------|---------------|
| analista.pmo@canalco.com | Canalco2025! | Analista PMO | ✅ | ❌ | ❌ |
| pqrs@canalco.com | Canalco2025! | PQRS | ✅ | ❌ | ❌ |
| director.tecnico@canalco.com | Canalco2025! | Director Técnico | ✅ | ✅ | ❌ |
| gerencia@canalco.com | Canalco2025! | Gerencia | ❌ | ❌ | ✅ |
| compras@canalco.com | Canalco2025! | Compras | ❌ | ❌ | ❌ |

---

## 🚀 Inicio Rápido con Swagger

1. Abre **http://localhost:3000/api/docs**
2. Haz clic en **POST /auth/login**
3. Haz clic en **"Try it out"**
4. Ingresa credenciales de `analista.pmo@canalco.com`
5. Haz clic en **"Execute"**
6. Copia el **accessToken** de la respuesta
7. Haz clic en el botón **"Authorize"** (🔒) arriba
8. Pega el token y haz clic en **"Authorize"**
9. ¡Ahora puedes probar todos los endpoints protegidos!

---

**Última actualización**: Noviembre 2025
**Versión del API**: 1.0.0
