# Guía de Testing - Sistema de Levantamiento de Obras

## 🎯 Cómo Probar que Todo Funciona

Esta guía te permite verificar paso a paso cada funcionalidad implementada.

---

## 📋 Pre-requisitos

1. **Backend corriendo:**
   ```bash
   npm run start:dev
   # Debe mostrar: Application is running on: http://localhost:3000
   ```

2. **Base de datos actualizada:**
   ```bash
   npm run migration:run
   ```

3. **Token de autenticación:**
   - Logearte en Swagger: `http://localhost:3000/api`
   - O usar Postman/Insomnia con token válido

---

## ✅ TEST 1: Filtro Múltiple de CompanyIds (Problema #2 - RESUELTO)

### Objetivo
Verificar que el endpoint acepta múltiples company IDs separados por coma.

### Paso a paso

**1. Crear obras de prueba (si no existen):**
```bash
# Crear obra con companyId=6
curl -X POST "http://localhost:3000/api/surveys/works" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": 6,
    "projectId": null,
    "name": "Obra Valle 1",
    "address": "Dirección prueba"
  }'

# Crear obra con companyId=7
curl -X POST "http://localhost:3000/api/surveys/works" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": 7,
    "projectId": null,
    "name": "Obra Valle 2",
    "address": "Dirección prueba"
  }'

# Crear obra con companyId=4
curl -X POST "http://localhost:3000/api/surveys/works" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": 4,
    "projectId": null,
    "name": "Obra Circasia",
    "address": "Dirección prueba"
  }'
```

**2. Probar filtro con múltiples IDs:**
```bash
# Filtrar solo Valle del Cauca (companyIds: 6, 7)
curl "http://localhost:3000/api/surveys/works?companyId=6,7" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**3. Resultado esperado:**
```json
[
  {
    "workId": 1,
    "companyId": 6,
    "name": "Obra Valle 1",
    ...
  },
  {
    "workId": 2,
    "companyId": 7,
    "name": "Obra Valle 2",
    ...
  }
  // ❌ NO debe aparecer companyId=4 (Circasia)
]
```

**4. Verificar en consola del backend:**
Deberías ver el SQL generado:
```sql
SELECT * FROM works
WHERE work.companyId IN (6, 7)
```

### ✅ Criterios de éxito
- ✅ Retorna solo obras con companyId=6 o companyId=7
- ✅ NO retorna obras de otros companyIds
- ✅ Funciona con un solo ID: `?companyId=6`
- ✅ Funciona con múltiples IDs: `?companyId=6,7,9`

---

## ✅ TEST 2: Endpoint User Access (Endpoint Fix)

### Objetivo
Verificar que el endpoint POST /surveys/user-access/:userId funciona correctamente.

### Paso a paso

**1. Asignar acceso a company:**
```bash
curl -X POST "http://localhost:3000/api/surveys/user-access/12" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": 6
  }'
```

**Resultado esperado:**
```json
{
  "accessId": 1,
  "userId": 12,
  "companyId": 6,
  "projectId": null
}
```

**2. Asignar acceso a project:**
```bash
curl -X POST "http://localhost:3000/api/surveys/user-access/12" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 3
  }'
```

**3. Verificar accesos del usuario:**
```bash
curl "http://localhost:3000/api/surveys/user-access/12" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Resultado esperado:**
```json
[
  {
    "accessId": 1,
    "userId": 12,
    "companyId": 6,
    "company": { "companyId": 6, "name": "El Cerrito" }
  },
  {
    "accessId": 2,
    "userId": 12,
    "projectId": 3,
    "project": { "projectId": 3, "name": "Ciudad Bolívar" }
  }
]
```

### ✅ Criterios de éxito
- ✅ POST funciona con userId en la URL (no error 404)
- ✅ Permite asignar company o project (no ambos)
- ✅ GET retorna todos los accesos del usuario

---

## ✅ TEST 3: Validación de Director Técnico

### Objetivo
Verificar que solo el Director Técnico asignado puede revisar/aprobar/reabrir un levantamiento.

### Paso a paso

**1. Crear un usuario Director Técnico:**
```sql
-- Ejecutar en la base de datos
INSERT INTO users (nombre, email, cargo, rol_id, estado)
VALUES ('Juan Pérez', 'juan.perez@test.com', 'Director Técnico', 5, true)
RETURNING user_id;
-- Asumir que retorna user_id = 20
```

**2. Crear una obra y levantamiento:**
```bash
# Crear obra
curl -X POST "http://localhost:3000/api/surveys/works" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": 6,
    "name": "Obra Test Validación",
    "address": "Dirección test"
  }'
# Retorna workId (ej: 100)

# Crear levantamiento con Director Técnico asignado
curl -X POST "http://localhost:3000/api/surveys" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workId": 100,
    "assignedReviewerId": 20,
    "budgetItems": [],
    "investmentItems": [],
    "materials": [],
    "travelExpenses": []
  }'
# Retorna surveyId (ej: 50)
```

**3. Intentar revisar con USUARIO CORRECTO (Director asignado):**
```bash
# Login como Juan Pérez (userId=20)
curl -X PATCH "http://localhost:3000/api/surveys/50/review-block" \
  -H "Authorization: Bearer TOKEN_DE_JUAN" \
  -H "Content-Type: application/json" \
  -d '{
    "block": "budget",
    "status": "approved",
    "comments": "Presupuesto aprobado"
  }'
```

**Resultado esperado:** ✅ **200 OK** - Revisión guardada exitosamente

**4. Intentar revisar con USUARIO INCORRECTO (otro Director):**
```bash
# Login como otro usuario (userId=25)
curl -X PATCH "http://localhost:3000/api/surveys/50/review-block" \
  -H "Authorization: Bearer TOKEN_OTRO_USUARIO" \
  -H "Content-Type: application/json" \
  -d '{
    "block": "budget",
    "status": "approved",
    "comments": "Intento de revisión"
  }'
```

**Resultado esperado:** ❌ **403 Forbidden**
```json
{
  "statusCode": 403,
  "message": "Solo el Director Técnico asignado puede revisar este levantamiento"
}
```

### ✅ Criterios de éxito
- ✅ Director asignado puede revisar (200 OK)
- ✅ Otro usuario recibe 403 Forbidden
- ✅ Mismo comportamiento en `approve-all` y `reopen`
- ✅ Mensaje de error claro y en español

---

## ✅ TEST 4: Sistema de 4 Bloques Independientes

### Objetivo
Verificar que cada bloque puede ser aprobado/rechazado de forma independiente.

### Paso a paso

**1. Crear levantamiento con datos en todos los bloques:**
```bash
curl -X POST "http://localhost:3000/api/surveys" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workId": 100,
    "assignedReviewerId": 20,
    "budgetItems": [
      {
        "ucapCode": "1.1.1",
        "description": "Poste concreto",
        "quantity": 10,
        "unit": "UND",
        "unitPrice": 150000
      }
    ],
    "investmentItems": [
      {
        "description": "Transformador",
        "quantity": 2,
        "unit": "UND",
        "unitPrice": 500000
      }
    ],
    "materials": [
      {
        "name": "Cable calibre 12",
        "quantity": 100,
        "unit": "M"
      }
    ],
    "travelExpenses": [
      {
        "description": "Transporte Cali-Jericó",
        "amount": 80000
      }
    ]
  }'
# Retorna surveyId (ej: 51)
```

**2. Revisar cada bloque con diferentes resultados:**
```bash
# Aprobar presupuesto
curl -X PATCH "http://localhost:3000/api/surveys/51/review-block" \
  -H "Authorization: Bearer DIRECTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "block": "budget",
    "status": "approved",
    "comments": "Presupuesto OK"
  }'

# Rechazar inversión
curl -X PATCH "http://localhost:3000/api/surveys/51/review-block" \
  -H "Authorization: Bearer DIRECTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "block": "investment",
    "status": "rejected",
    "comments": "Falta justificación de transformador"
  }'

# Aprobar materiales
curl -X PATCH "http://localhost:3000/api/surveys/51/review-block" \
  -H "Authorization: Bearer DIRECTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "block": "materials",
    "status": "approved",
    "comments": "Materiales verificados"
  }'

# Aprobar viáticos
curl -X PATCH "http://localhost:3000/api/surveys/51/review-block" \
  -H "Authorization: Bearer DIRECTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "block": "travelExpenses",
    "status": "approved",
    "comments": "Viáticos razonables"
  }'
```

**3. Consultar el levantamiento:**
```bash
curl "http://localhost:3000/api/surveys/51" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Resultado esperado:**
```json
{
  "surveyId": 51,
  "status": "in_review",  // ❗ Aún en revisión porque investment está rejected
  "budgetStatus": "approved",
  "investmentStatus": "rejected",
  "materialsStatus": "approved",
  "travelExpensesStatus": "approved",
  "reviewComments": "Falta justificación de transformador",
  ...
}
```

**4. Aprobar todos los bloques:**
```bash
# Corregir y aprobar inversión
curl -X PATCH "http://localhost:3000/api/surveys/51/review-block" \
  -H "Authorization: Bearer DIRECTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "block": "investment",
    "status": "approved",
    "comments": "Justificación agregada OK"
  }'

# Verificar status general
curl "http://localhost:3000/api/surveys/51" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Resultado esperado:**
```json
{
  "surveyId": 51,
  "status": "approved",  // ✅ Ahora aprobado porque todos los bloques están approved
  "budgetStatus": "approved",
  "investmentStatus": "approved",
  "materialsStatus": "approved",
  "travelExpensesStatus": "approved",
  ...
}
```

### ✅ Criterios de éxito
- ✅ Cada bloque puede ser aprobado/rechazado independientemente
- ✅ Status general es "approved" solo cuando TODOS los bloques están approved
- ✅ Comments se guarda en reviewComments
- ✅ Cada revisión actualiza reviewedAt y reviewedBy

---

## ✅ TEST 5: Endpoint My Access (Problema #1)

### Objetivo
Verificar que el endpoint retorna correctamente companies y projects separados.

### Paso a paso

**1. Asignar accesos mixtos a un usuario:**
```bash
# Asignar company
curl -X POST "http://localhost:3000/api/surveys/user-access/12" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "companyId": 6 }'

# Asignar project
curl -X POST "http://localhost:3000/api/surveys/user-access/12" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "projectId": 3 }'
```

**2. Consultar accesos del usuario:**
```bash
# Login como el usuario 12
curl "http://localhost:3000/api/surveys/my-access" \
  -H "Authorization: Bearer USER_12_TOKEN"
```

**Resultado esperado:**
```json
{
  "companies": [
    {
      "companyId": 6,
      "name": "Unión Temporal Alumbrado Público El Cerrito"
    }
  ],
  "projects": [
    {
      "projectId": 3,
      "name": "Ciudad Bolívar",
      "companyId": 1
    }
  ]
}
```

**3. Verificar estructura:**
```javascript
// En frontend o Postman
const response = await fetch('/api/surveys/my-access');
const data = await response.json();

console.log('Companies:', data.companies);
// Cada item debe tener: companyId, name

console.log('Projects:', data.projects);
// Cada item debe tener: projectId, name, companyId
```

### ✅ Criterios de éxito
- ✅ Retorna objeto con dos arrays: companies y projects
- ✅ Companies contiene solo accesos a nivel de company
- ✅ Projects contiene solo accesos a nivel de project
- ✅ NO se mezclan companies y projects en el mismo array
- ✅ Projects incluyen companyId (relación padre)

---

## ✅ TEST 6: Reapertura de Levantamiento

### Objetivo
Verificar que solo el Director Técnico asignado puede reabrir un levantamiento aprobado.

### Paso a paso

**1. Aprobar un levantamiento completo:**
```bash
curl -X PATCH "http://localhost:3000/api/surveys/51/approve-all" \
  -H "Authorization: Bearer DIRECTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "comments": "Todo aprobado"
  }'
```

**2. Intentar editarlo (debe fallar):**
```bash
curl -X PATCH "http://localhost:3000/api/surveys/51" \
  -H "Authorization: Bearer CREATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budgetItems": [...]
  }'
```

**Resultado esperado:** ❌ **403 Forbidden**
```json
{
  "statusCode": 403,
  "message": "Cannot edit survey in current status"
}
```

**3. Reabrir el levantamiento:**
```bash
curl -X PATCH "http://localhost:3000/api/surveys/51/reopen" \
  -H "Authorization: Bearer DIRECTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Falta agregar costos de transporte adicional"
  }'
```

**Resultado esperado:** ✅ **200 OK**
```json
{
  "surveyId": 51,
  "status": "pending",
  "budgetStatus": "pending",
  "investmentStatus": "pending",
  "materialsStatus": "pending",
  "travelExpensesStatus": "pending",
  "reopenReason": "Falta agregar costos de transporte adicional",
  ...
}
```

**4. Ahora sí se puede editar:**
```bash
curl -X PATCH "http://localhost:3000/api/surveys/51" \
  -H "Authorization: Bearer CREATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "travelExpenses": [
      {
        "description": "Transporte adicional",
        "amount": 50000
      }
    ]
  }'
```

**Resultado esperado:** ✅ **200 OK** - Edición exitosa

### ✅ Criterios de éxito
- ✅ Solo Director Técnico asignado puede reabrir
- ✅ reopenReason se guarda correctamente
- ✅ Todos los bloques vuelven a "pending"
- ✅ status general vuelve a "pending"
- ✅ Después de reabrir, se puede editar nuevamente

---

## ✅ TEST 7: Cálculo Automático de IPP

### Objetivo
Verificar que el sistema calcula automáticamente el IPP para UCAPs.

### Paso a paso

**1. Obtener IPP actual de una company:**
```sql
-- Ejecutar en DB
SELECT
  company_id,
  name,
  ipp_base_year,
  ipp_base_month,
  ipp_initial_value
FROM companies
WHERE company_id = 6;
```

**Resultado esperado:**
```
company_id | name        | ipp_base_year | ipp_base_month | ipp_initial_value
-----------|-------------|---------------|----------------|------------------
6          | El Cerrito  | 2023          | 1              | 128.45
```

**2. Crear levantamiento con UCAP:**
```bash
curl -X POST "http://localhost:3000/api/surveys" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workId": 100,
    "assignedReviewerId": 20,
    "budgetItems": [
      {
        "ucapCode": "1.1.1",
        "description": "Poste concreto 12m",
        "quantity": 5,
        "unit": "UND",
        "unitPrice": 150000
      }
    ],
    "investmentItems": [],
    "materials": [],
    "travelExpenses": []
  }'
```

**3. Consultar el levantamiento:**
```bash
curl "http://localhost:3000/api/surveys/{surveyId}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Resultado esperado:**
```json
{
  "surveyId": 52,
  "budgetItems": [
    {
      "ucapCode": "1.1.1",
      "description": "Poste concreto 12m",
      "quantity": 5,
      "unit": "UND",
      "unitPrice": 150000,
      "totalPrice": 750000,
      "ippAdjustment": 1.15,  // ✅ Calculado automáticamente
      "adjustedUnitPrice": 172500,  // 150000 * 1.15
      "adjustedTotalPrice": 862500  // 172500 * 5
    }
  ],
  "totalBudget": 862500,
  ...
}
```

### ✅ Criterios de éxito
- ✅ ippAdjustment se calcula automáticamente
- ✅ adjustedUnitPrice = unitPrice * ippAdjustment
- ✅ adjustedTotalPrice = adjustedUnitPrice * quantity
- ✅ totalBudget incluye el ajuste de IPP

---

## 🔍 TEST 8: Vista de Base de Datos con Filtros

### Objetivo
Verificar que la vista de base de datos retorna datos paginados y filtrados correctamente.

### Paso a paso

**1. Consultar sin filtros (primeros 10):**
```bash
curl "http://localhost:3000/api/surveys/database?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**2. Filtrar por company:**
```bash
curl "http://localhost:3000/api/surveys/database?companyId=6&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**3. Filtrar por status:**
```bash
curl "http://localhost:3000/api/surveys/database?status=approved&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**4. Filtrar por fecha:**
```bash
curl "http://localhost:3000/api/surveys/database?startDate=2026-01-01&endDate=2026-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Resultado esperado:**
```json
{
  "data": [
    {
      "surveyId": 1,
      "workCode": "WORK-001",
      "companyName": "El Cerrito",
      "projectName": null,
      "workName": "Obra Test",
      "status": "approved",
      "creatorName": "Juan Pérez",
      "reviewerName": "María García",
      "totalBudget": 1500000,
      "totalInvestment": 500000,
      "createdAt": "2026-01-15T10:30:00Z",
      "reviewedAt": "2026-01-18T15:45:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

### ✅ Criterios de éxito
- ✅ Retorna objeto con data, total, page, limit, totalPages
- ✅ Paginación funciona correctamente
- ✅ Filtros funcionan (company, project, status, dates)
- ✅ Solo retorna surveys del área territorial del usuario

---

## 📊 Resumen de Tests

| Test | Funcionalidad | Estado | Archivo |
|------|--------------|--------|---------|
| 1 | Filtro múltiple companyIds | ✅ Implementado | surveys.controller.ts:62-73 |
| 2 | Endpoint user-access/:userId | ✅ Implementado | surveys.controller.ts:266-275 |
| 3 | Validación Director Técnico | ✅ Implementado | surveys.service.ts:520-525 |
| 4 | 4 bloques independientes | ✅ Implementado | surveys.service.ts:496-559 |
| 5 | My access (companies/projects) | ✅ Implementado | surveys.service.ts:994-1023 |
| 6 | Reapertura de levantamiento | ✅ Implementado | surveys.service.ts:596-647 |
| 7 | Cálculo automático IPP | ✅ Implementado | surveys.service.ts:186-196 |
| 8 | Vista de base de datos | ✅ Implementado | surveys.service.ts:649-823 |

---

## 🐛 Si Encuentras Problemas

### Problema: "403 Forbidden" en todos los endpoints
**Causa:** Token expirado o sin permisos
**Solución:** Relogearte en Swagger y copiar nuevo token

### Problema: "Cannot POST /api/surveys/user-access"
**Causa:** Falta el userId en la URL
**Solución:** Usar `/api/surveys/user-access/12` (con userId al final)

### Problema: No calcula IPP
**Causa:** Company sin configuración de IPP
**Solución:** Verificar que company tenga ipp_base_year, ipp_base_month, ipp_initial_value

### Problema: No separa companies y projects
**Causa:** Datos mal insertados en survey_reviewer_access
**Solución:** Ejecutar queries de [QUERIES_DEBUG_PERMISOS.sql](QUERIES_DEBUG_PERMISOS.sql)

---

## 🎯 Checklist Rápido

Antes de marcar como completo, verificar:

- [ ] ✅ TEST 1: Filtro múltiple de companyIds funciona
- [ ] ✅ TEST 2: POST user-access/:userId funciona (no 404)
- [ ] ✅ TEST 3: Solo Director asignado puede revisar (403 para otros)
- [ ] ✅ TEST 4: Bloques se aprueban independientemente
- [ ] ✅ TEST 5: My access retorna companies y projects separados
- [ ] ✅ TEST 6: Reapertura funciona y permite editar
- [ ] ✅ TEST 7: IPP se calcula automáticamente
- [ ] ✅ TEST 8: Vista de DB con paginación funciona

---

## 📞 Soporte

Si algún test falla:
1. Revisar logs del backend en consola
2. Verificar que las migraciones estén corridas
3. Verificar que el token tenga permisos correctos
4. Consultar [RESPUESTA_PROBLEMAS_BACKEND.md](RESPUESTA_PROBLEMAS_BACKEND.md) para más detalles

**Commits con fixes:**
- `149774b6` - Director Técnico + user-access endpoint
- `801a8a0c` - Filtro múltiple companyIds
- `b3c5abb8` - SQL queries para debug de permisos
