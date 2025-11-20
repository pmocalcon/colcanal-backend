# Guía API para Frontend - Formulario de Requisiciones

Esta guía contiene todos los endpoints necesarios para implementar el formulario de creación de requisiciones en el frontend.

---

## 📋 Tabla de Contenidos

1. [Flujo del Formulario](#flujo-del-formulario)
2. [Endpoints para Llenar el Formulario](#endpoints-para-llenar-el-formulario)
3. [Crear Requisición](#crear-requisición)
4. [Validaciones del Frontend](#validaciones-del-frontend)
5. [Ejemplos de Implementación](#ejemplos-de-implementación)

---

## 🔄 Flujo del Formulario

### Paso 1: Cargar datos iniciales

Cuando se carga el formulario, hacer estas peticiones en paralelo:

```typescript
async function loadFormData() {
  const [companies, materialGroups, materials] = await Promise.all([
    fetch('/api/purchases/master-data/companies'),
    fetch('/api/purchases/master-data/material-groups'),
    fetch('/api/purchases/master-data/materials'),
  ]);

  return {
    companies: companies.data,
    materialGroups: materialGroups.data,
    materials: materials.data,
  };
}
```

### Paso 2: Cuando el usuario selecciona una empresa

```typescript
async function handleCompanyChange(companyId: number) {
  // Cargar proyectos de esta empresa
  const { data: projects } = await fetch(
    `/api/purchases/master-data/projects?companyId=${companyId}`
  );

  setProjectOptions(projects);

  // Limpiar el campo de proyecto si había uno seleccionado
  setSelectedProject(null);
}
```

### Paso 3: Usuario agrega materiales

```typescript
function addMaterialToRequisition(material: Material, quantity: number) {
  setItems([
    ...items,
    {
      materialId: material.materialId,
      quantity: quantity,
      observation: '', // Opcional
    },
  ]);
}
```

### Paso 4: Submit del formulario

```typescript
async function submitRequisition() {
  const requisition = {
    companyId: selectedCompany,
    projectId: selectedProject, // Opcional según la empresa
    items: items, // Array de { materialId, quantity, observation }
  };

  const response = await fetch('/api/purchases/requisitions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(requisition),
  });

  if (response.ok) {
    const createdRequisition = await response.json();
    console.log('Requisición creada:', createdRequisition.requisitionNumber);
  }
}
```

---

## 📡 Endpoints para Llenar el Formulario

### 1. GET /api/purchases/master-data/companies

**Descripción**: Obtener todas las empresas disponibles

**Cuándo llamarlo**: Al cargar el formulario (carga inicial)

**Response**:
```json
{
  "data": [
    {
      "companyId": 1,
      "name": "Canales & Contactos"
    },
    {
      "companyId": 2,
      "name": "UT El Cerrito"
    }
  ],
  "total": 8
}
```

**Uso en el formulario**:
```jsx
<select name="companyId" onChange={handleCompanyChange}>
  <option value="">Seleccione una empresa</option>
  {companies.map(company => (
    <option key={company.companyId} value={company.companyId}>
      {company.name}
    </option>
  ))}
</select>
```

---

### 2. GET /api/purchases/master-data/projects?companyId={id}

**Descripción**: Obtener proyectos de una empresa específica

**Cuándo llamarlo**: Cuando el usuario selecciona una empresa

**Query Parameters**:
- `companyId` (opcional): ID de la empresa para filtrar

**Response**:
```json
{
  "data": [
    {
      "projectId": 1,
      "name": "Administrativo",
      "companyId": 1,
      "company": {
        "companyId": 1,
        "name": "Canales & Contactos"
      }
    },
    {
      "projectId": 2,
      "name": "Ciudad Bolívar",
      "companyId": 1,
      "company": {
        "companyId": 1,
        "name": "Canales & Contactos"
      }
    }
  ],
  "total": 5
}
```

**Uso en el formulario**:
```jsx
<select
  name="projectId"
  disabled={!selectedCompany || projects.length === 0}
>
  <option value="">Seleccione un proyecto</option>
  {projects.map(project => (
    <option key={project.projectId} value={project.projectId}>
      {project.name}
    </option>
  ))}
</select>
```

**⚠️ Nota importante**:
- **Canales & Contactos** (companyId: 1): Tiene 5 proyectos → **Campo REQUERIDO**
- **Uniones Temporales** (companyId: 2-8): NO tienen proyectos → **Campo OPCIONAL/OCULTO**

---

### 3. GET /api/purchases/master-data/material-groups

**Descripción**: Obtener todos los grupos de materiales

**Cuándo llamarlo**: Al cargar el formulario (opcional, para categorizar materiales)

**Response**:
```json
{
  "data": [
    {
      "groupId": 1,
      "name": "Eléctrico"
    },
    {
      "groupId": 2,
      "name": "Construcción"
    },
    {
      "groupId": 3,
      "name": "Herramientas"
    }
  ],
  "total": 6
}
```

**Uso en el formulario**:
```jsx
// Para filtrar materiales por grupo
<select onChange={(e) => loadMaterialsByGroup(e.target.value)}>
  <option value="">Todos los grupos</option>
  {materialGroups.map(group => (
    <option key={group.groupId} value={group.groupId}>
      {group.name}
    </option>
  ))}
</select>
```

---

### 4. GET /api/purchases/master-data/materials?groupId={id}

**Descripción**: Obtener todos los materiales (opcionalmente filtrados por grupo)

**Cuándo llamarlo**:
- Al cargar el formulario (todos los materiales)
- Cuando el usuario filtra por grupo
- Para implementar autocomplete/búsqueda

**Query Parameters**:
- `groupId` (opcional): ID del grupo para filtrar

**Response**:
```json
{
  "data": [
    {
      "materialId": 1,
      "code": "ELEC-001",
      "description": "Cable #10 AWG",
      "materialGroup": {
        "groupId": 1,
        "name": "Eléctrico"
      }
    },
    {
      "materialId": 2,
      "code": "ELEC-002",
      "description": "Cable #12 AWG",
      "materialGroup": {
        "groupId": 1,
        "name": "Eléctrico"
      }
    }
  ],
  "total": 12
}
```

**Uso en el formulario**:

**Opción 1: Autocomplete**
```jsx
import Autocomplete from '@mui/material/Autocomplete';

<Autocomplete
  options={materials}
  getOptionLabel={(material) => `${material.code} - ${material.description}`}
  onChange={(event, newValue) => {
    if (newValue) {
      addMaterialToRequisition(newValue);
    }
  }}
  renderInput={(params) => (
    <TextField {...params} label="Buscar material" />
  )}
/>
```

**Opción 2: Select tradicional**
```jsx
<select onChange={(e) => handleMaterialSelect(e.target.value)}>
  <option value="">Seleccione un material</option>
  {materials.map(material => (
    <option key={material.materialId} value={material.materialId}>
      {material.code} - {material.description}
    </option>
  ))}
</select>
```

---

## ✅ Crear Requisición

### POST /api/purchases/requisitions

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "companyId": 1,
  "projectId": 2,
  "items": [
    {
      "materialId": 1,
      "quantity": 10,
      "observation": "Cable para instalación principal"
    },
    {
      "materialId": 3,
      "quantity": 5,
      "observation": "Breakers para tablero secundario"
    }
  ]
}
```

**Response (201 Created)**:
```json
{
  "requisitionId": 1,
  "requisitionNumber": "CB-0001",
  "status": "pendiente",
  "companyId": 1,
  "projectId": 2,
  "operationCenterId": 2,
  "projectCodeId": 1,
  "createdBy": 5,
  "createdAt": "2025-11-06T02:00:00.000Z",
  "items": [
    {
      "itemId": 1,
      "itemNumber": 1,
      "materialId": 1,
      "quantity": 10,
      "observation": "Cable para instalación principal",
      "material": {
        "materialId": 1,
        "code": "ELEC-001",
        "description": "Cable #10 AWG"
      }
    }
  ],
  "company": {
    "companyId": 1,
    "name": "Canales & Contactos"
  },
  "project": {
    "projectId": 2,
    "name": "Ciudad Bolívar"
  }
}
```

**Errores posibles**:

**400 Bad Request** - Datos inválidos:
```json
{
  "statusCode": 400,
  "message": [
    "Debe incluir al menos un ítem",
    "La cantidad debe ser mayor a 0"
  ],
  "error": "Bad Request"
}
```

**403 Forbidden** - Sin permisos:
```json
{
  "statusCode": 403,
  "message": "Los usuarios con rol Gerencia o Compras no pueden crear requisiciones",
  "error": "Forbidden"
}
```

**404 Not Found** - Referencia no existe:
```json
{
  "statusCode": 404,
  "message": [
    "No se encontró prefijo para companyId=1, projectId=99"
  ],
  "error": "Not Found"
}
```

---

## ✔️ Validaciones del Frontend

Implementa estas validaciones ANTES de enviar el formulario:

### 1. Validación de Empresa
```typescript
if (!formData.companyId) {
  showError('Debe seleccionar una empresa');
  return false;
}
```

### 2. Validación de Proyecto (solo para Canales & Contactos)
```typescript
if (selectedCompany.companyId === 1 && !formData.projectId) {
  showError('Debe seleccionar un proyecto para Canales & Contactos');
  return false;
}
```

### 3. Validación de Ítems
```typescript
if (formData.items.length === 0) {
  showError('Debe agregar al menos un material');
  return false;
}

// Validar cada ítem
for (const item of formData.items) {
  if (!item.materialId) {
    showError('Cada ítem debe tener un material seleccionado');
    return false;
  }

  if (!item.quantity || item.quantity <= 0) {
    showError('La cantidad debe ser mayor a 0');
    return false;
  }
}
```

### 4. Validación de Duplicados
```typescript
const materialIds = formData.items.map(item => item.materialId);
const hasDuplicates = new Set(materialIds).size !== materialIds.length;

if (hasDuplicates) {
  showError('No puede agregar el mismo material dos veces');
  return false;
}
```

---

## 💻 Ejemplos de Implementación

### React + TypeScript

```typescript
import React, { useState, useEffect } from 'react';

interface FormData {
  companyId: number | null;
  projectId: number | null;
  items: RequisitionItem[];
}

interface RequisitionItem {
  materialId: number;
  quantity: number;
  observation: string;
}

export function RequisitionForm() {
  const [formData, setFormData] = useState<FormData>({
    companyId: null,
    projectId: null,
    items: [],
  });

  const [companies, setCompanies] = useState([]);
  const [projects, setProjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    const [companiesRes, materialsRes] = await Promise.all([
      fetch('/api/purchases/master-data/companies', {
        headers: { Authorization: `Bearer ${getToken()}` },
      }),
      fetch('/api/purchases/master-data/materials', {
        headers: { Authorization: `Bearer ${getToken()}` },
      }),
    ]);

    const companiesData = await companiesRes.json();
    const materialsData = await materialsRes.json();

    setCompanies(companiesData.data);
    setMaterials(materialsData.data);
  }

  // Cuando cambia la empresa, cargar sus proyectos
  async function handleCompanyChange(companyId: number) {
    setFormData({ ...formData, companyId, projectId: null });

    const res = await fetch(
      `/api/purchases/master-data/projects?companyId=${companyId}`,
      {
        headers: { Authorization: `Bearer ${getToken()}` },
      }
    );

    const data = await res.json();
    setProjects(data.data);
  }

  // Agregar material
  function addMaterial(materialId: number) {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          materialId,
          quantity: 1,
          observation: '',
        },
      ],
    });
  }

  // Actualizar cantidad
  function updateQuantity(index: number, quantity: number) {
    const newItems = [...formData.items];
    newItems[index].quantity = quantity;
    setFormData({ ...formData, items: newItems });
  }

  // Eliminar ítem
  function removeItem(index: number) {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  }

  // Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validaciones
    if (!formData.companyId) {
      alert('Seleccione una empresa');
      return;
    }

    if (formData.companyId === 1 && !formData.projectId) {
      alert('Seleccione un proyecto');
      return;
    }

    if (formData.items.length === 0) {
      alert('Agregue al menos un material');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/purchases/requisitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const requisition = await res.json();
        alert(`Requisición ${requisition.requisitionNumber} creada exitosamente`);
        // Redirigir o limpiar formulario
      } else {
        const error = await res.json();
        alert(`Error: ${error.message.join(', ')}`);
      }
    } catch (error) {
      alert('Error al crear la requisición');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* SELECT DE EMPRESA */}
      <div>
        <label>Empresa *</label>
        <select
          value={formData.companyId || ''}
          onChange={(e) => handleCompanyChange(Number(e.target.value))}
          required
        >
          <option value="">Seleccione una empresa</option>
          {companies.map((company: any) => (
            <option key={company.companyId} value={company.companyId}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      {/* SELECT DE PROYECTO (solo si es Canales & Contactos) */}
      {formData.companyId === 1 && (
        <div>
          <label>Proyecto *</label>
          <select
            value={formData.projectId || ''}
            onChange={(e) =>
              setFormData({ ...formData, projectId: Number(e.target.value) })
            }
            required
          >
            <option value="">Seleccione un proyecto</option>
            {projects.map((project: any) => (
              <option key={project.projectId} value={project.projectId}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* LISTA DE MATERIALES */}
      <div>
        <h3>Materiales</h3>

        {/* Selector de material */}
        <select
          onChange={(e) => {
            if (e.target.value) {
              addMaterial(Number(e.target.value));
              e.target.value = '';
            }
          }}
        >
          <option value="">Agregar material...</option>
          {materials
            .filter(
              (m: any) =>
                !formData.items.some((item) => item.materialId === m.materialId)
            )
            .map((material: any) => (
              <option key={material.materialId} value={material.materialId}>
                {material.code} - {material.description}
              </option>
            ))}
        </select>

        {/* Tabla de ítems */}
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Cantidad</th>
              <th>Observación</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {formData.items.map((item, index) => {
              const material = materials.find(
                (m: any) => m.materialId === item.materialId
              );
              return (
                <tr key={index}>
                  <td>
                    {material?.code} - {material?.description}
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateQuantity(index, Number(e.target.value))
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.observation}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[index].observation = e.target.value;
                        setFormData({ ...formData, items: newItems });
                      }}
                      placeholder="Opcional"
                    />
                  </td>
                  <td>
                    <button type="button" onClick={() => removeItem(index)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Creando...' : 'Crear Requisición'}
      </button>
    </form>
  );
}

function getToken() {
  return localStorage.getItem('accessToken') || '';
}
```

---

## 📝 Resumen de Endpoints

| Endpoint | Método | Cuándo Usar | Descripción |
|----------|--------|-------------|-------------|
| `/api/purchases/master-data/companies` | GET | Carga inicial | Obtener todas las empresas |
| `/api/purchases/master-data/projects?companyId={id}` | GET | Al seleccionar empresa | Obtener proyectos de la empresa |
| `/api/purchases/master-data/material-groups` | GET | Carga inicial (opcional) | Obtener grupos de materiales |
| `/api/purchases/master-data/materials?groupId={id}` | GET | Carga inicial | Obtener todos los materiales |
| `/api/purchases/requisitions` | POST | Submit del formulario | Crear nueva requisición |

---

## 🎯 Tips para el Frontend

1. **Carga Paralela**: Usa `Promise.all()` para cargar empresas y materiales en paralelo
2. **Validación en Tiempo Real**: Valida mientras el usuario llena el formulario
3. **Feedback Visual**: Muestra loaders mientras se cargan datos
4. **Caché Inteligente**: Cachea la lista de materiales (no cambia frecuentemente)
5. **Autocomplete**: Considera usar un autocomplete para materiales (mejor UX)
6. **Prevenir Duplicados**: No permitas agregar el mismo material dos veces
7. **Confirmación**: Muestra un resumen antes de enviar
8. **Manejo de Errores**: Muestra mensajes de error claros al usuario

---

**Última actualización**: Noviembre 2025
**Versión del API**: 1.0.0
