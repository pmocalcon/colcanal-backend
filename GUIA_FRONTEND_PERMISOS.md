# Guía Frontend - Sistema de Permisos Granulares

## 🎯 Para el Equipo de Frontend

Esta guía explica cómo funciona el nuevo sistema de permisos granulares y qué debe implementar el frontend.

---

## 📋 ¿Qué cambió?

### Antes (Sistema Antiguo)
```
Usuario tiene acceso al módulo "Levantamientos"
  ↓
Frontend muestra TODOS los botones (crear, editar, eliminar, aprobar, etc.)
  ↓
Usuario hace clic
  ↓
Backend rechaza con 403 si no tiene permiso ❌
```

### Ahora (Sistema Nuevo)
```
Usuario tiene acceso al módulo "Levantamientos"
  ↓
Frontend verifica permisos específicos del usuario
  ↓
Frontend SOLO muestra botones que el usuario puede usar ✅
  ↓
Mejor UX: usuario no ve opciones que no puede usar
```

---

## 🔑 Permisos Disponibles

```typescript
// Permisos de levantamientos
'levantamientos:ver'        // Ver lista y detalles
'levantamientos:crear'      // Botón "Crear nuevo"
'levantamientos:editar'     // Botón "Editar"
'levantamientos:eliminar'   // Botón "Eliminar"
'levantamientos:revisar'    // Revisar bloques (Director Técnico)
'levantamientos:aprobar'    // Aprobar levantamiento completo (Director Técnico)
'levantamientos:reabrir'    // Reabrir levantamiento aprobado (Director Técnico)
```

---

## 👥 Matriz de Permisos por Rol

| Rol | Ver | Crear | Editar | Eliminar | Revisar | Aprobar | Reabrir |
|-----|-----|-------|--------|----------|---------|---------|---------|
| **PQRS** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Coordinador Operativo** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Director de Proyecto** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Director Técnico** | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **analista.pmo** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🔍 Cómo Obtener los Permisos del Usuario

### Opción 1: Desde el Token JWT (Recomendado)

Cuando el usuario hace login, el backend retorna un token JWT que incluye los permisos del usuario.

```typescript
// Decodificar el token JWT
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));

// El payload incluye:
{
  userId: 12,
  email: "usuario@example.com",
  roleId: 5,
  role: {
    rolId: 5,
    nombreRol: "PQRS Jericó",
    category: "PQRS"
  },
  permissions: [
    "levantamientos:ver",
    "levantamientos:crear",
    "levantamientos:editar",
    "levantamientos:eliminar"
  ]
}
```

**IMPORTANTE:** Si el backend aún no incluye los permisos en el token, necesitan pedirlo al equipo de backend.

### Opción 2: Endpoint de Permisos (Alternativa)

Si los permisos no están en el token, pueden crear un endpoint:

```typescript
// GET /api/auth/my-permissions
const response = await fetch('/api/auth/my-permissions', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { permissions } = await response.json();
// Retorna: ["levantamientos:ver", "levantamientos:crear", ...]
```

---

## 💻 Implementación en Frontend

### 1. Crear un Hook de Permisos

```typescript
// hooks/usePermissions.ts
import { useMemo } from 'react';
import { useAuth } from './useAuth'; // O tu hook de autenticación

export const usePermissions = () => {
  const { user } = useAuth();

  const hasPermission = useMemo(() => {
    return (permission: string): boolean => {
      if (!user?.permissions) return false;
      return user.permissions.includes(permission);
    };
  }, [user?.permissions]);

  const hasAnyPermission = useMemo(() => {
    return (permissions: string[]): boolean => {
      if (!user?.permissions) return false;
      return permissions.some(p => user.permissions.includes(p));
    };
  }, [user?.permissions]);

  const hasAllPermissions = useMemo(() => {
    return (permissions: string[]): boolean => {
      if (!user?.permissions) return false;
      return permissions.every(p => user.permissions.includes(p));
    };
  }, [user?.permissions]);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions: user?.permissions || [],
  };
};
```

### 2. Componente para Controlar Visibilidad

```typescript
// components/PermissionGuard.tsx
import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface PermissionGuardProps {
  permission: string | string[];
  requireAll?: boolean; // Si es true, requiere todos los permisos
  fallback?: React.ReactNode; // Componente a mostrar si no tiene permiso
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  requireAll = false,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  const hasAccess = useMemo(() => {
    if (Array.isArray(permission)) {
      return requireAll
        ? hasAllPermissions(permission)
        : hasAnyPermission(permission);
    }
    return hasPermission(permission);
  }, [permission, requireAll, hasPermission, hasAnyPermission, hasAllPermissions]);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
```

---

## 🎨 Ejemplos de Uso en Componentes

### Ejemplo 1: Botón de Crear

```tsx
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const SurveysPage = () => {
  const { hasPermission } = usePermissions();

  return (
    <div>
      <h1>Levantamientos de Obras</h1>

      {/* Opción 1: Usar PermissionGuard */}
      <PermissionGuard permission="levantamientos:crear">
        <Button onClick={handleCreate}>
          + Crear Nuevo Levantamiento
        </Button>
      </PermissionGuard>

      {/* Opción 2: Usar hook directamente */}
      {hasPermission('levantamientos:crear') && (
        <Button onClick={handleCreate}>
          + Crear Nuevo Levantamiento
        </Button>
      )}

      <SurveysList />
    </div>
  );
};
```

### Ejemplo 2: Botones de Acciones en Tabla

```tsx
const SurveyRow = ({ survey }) => {
  const { hasPermission } = usePermissions();

  return (
    <tr>
      <td>{survey.workCode}</td>
      <td>{survey.companyName}</td>
      <td>{survey.status}</td>
      <td>
        {/* Ver detalles - Todos pueden */}
        <Button onClick={() => viewDetails(survey.surveyId)}>
          Ver
        </Button>

        {/* Editar - Solo si tiene permiso */}
        {hasPermission('levantamientos:editar') && survey.status === 'pending' && (
          <Button onClick={() => editSurvey(survey.surveyId)}>
            Editar
          </Button>
        )}

        {/* Eliminar - Solo si tiene permiso */}
        {hasPermission('levantamientos:eliminar') && (
          <Button variant="danger" onClick={() => deleteSurvey(survey.surveyId)}>
            Eliminar
          </Button>
        )}

        {/* Revisar - Solo Director Técnico */}
        {hasPermission('levantamientos:revisar') && survey.status === 'in_review' && (
          <Button onClick={() => reviewSurvey(survey.surveyId)}>
            Revisar
          </Button>
        )}

        {/* Aprobar - Solo Director Técnico */}
        {hasPermission('levantamientos:aprobar') && survey.status === 'in_review' && (
          <Button variant="success" onClick={() => approveSurvey(survey.surveyId)}>
            Aprobar
          </Button>
        )}

        {/* Reabrir - Solo Director Técnico */}
        {hasPermission('levantamientos:reabrir') && survey.status === 'approved' && (
          <Button variant="warning" onClick={() => reopenSurvey(survey.surveyId)}>
            Reabrir
          </Button>
        )}
      </td>
    </tr>
  );
};
```

### Ejemplo 3: Tabs Condicionales (Director Técnico)

```tsx
const SurveyDetailPage = ({ surveyId }) => {
  const { hasPermission } = usePermissions();
  const [survey, setSurvey] = useState(null);

  return (
    <div>
      <h1>Detalle del Levantamiento</h1>

      <Tabs>
        {/* Tab de detalles - Todos */}
        <Tab label="Detalles">
          <SurveyDetails survey={survey} />
        </Tab>

        {/* Tab de revisión - Solo Director Técnico */}
        {hasPermission('levantamientos:revisar') && (
          <Tab label="Revisión">
            <SurveyReviewPanel survey={survey} />
          </Tab>
        )}
      </Tabs>

      {/* Botones de acción al final */}
      <div className="actions">
        <PermissionGuard permission="levantamientos:editar">
          <Button onClick={handleEdit}>Editar</Button>
        </PermissionGuard>

        <PermissionGuard permission="levantamientos:aprobar">
          <Button variant="success" onClick={handleApprove}>
            Aprobar Todo
          </Button>
        </PermissionGuard>
      </div>
    </div>
  );
};
```

### Ejemplo 4: Menú de Navegación

```tsx
const SidebarMenu = () => {
  const { hasPermission } = usePermissions();

  return (
    <nav>
      {/* Todos los que tienen acceso al módulo ven esto */}
      {hasPermission('levantamientos:ver') && (
        <MenuItem to="/levantamientos">
          Levantamientos
        </MenuItem>
      )}

      {/* Submenu solo para Director Técnico */}
      {hasPermission('levantamientos:revisar') && (
        <MenuItem to="/levantamientos/pendientes-revision">
          Pendientes de Revisión
        </MenuItem>
      )}
    </nav>
  );
};
```

---

## ⚠️ Manejo de Errores 403

Aunque ocultes botones en el frontend, siempre puede haber un caso donde el usuario intente acceder a algo sin permisos. Debes manejar el error 403:

```typescript
// services/api.ts
const apiClient = axios.create({
  baseURL: '/api',
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      // Mostrar mensaje al usuario
      toast.error('No tienes permisos para realizar esta acción');

      // Opcional: Redirigir a home
      // router.push('/dashboard');
    }
    return Promise.reject(error);
  }
);
```

---

## 🧪 Testing

### Probar con diferentes roles

1. **Login como PQRS:**
   - Debe ver: botones Crear, Editar, Eliminar
   - NO debe ver: botones Revisar, Aprobar, Reabrir

2. **Login como Director Técnico:**
   - Debe ver: botones Revisar, Aprobar, Reabrir
   - NO debe ver: botones Crear, Editar, Eliminar

3. **Login como Director de Proyecto:**
   - Debe ver: botones Crear, Editar, Eliminar
   - NO debe ver: botones Revisar, Aprobar, Reabrir

4. **Login como analista.pmo:**
   - Debe ver: TODOS los botones

---

## 📝 Checklist de Implementación

### Paso 1: Obtener Permisos
- [ ] Verificar que el token JWT incluye `permissions` array
- [ ] Si no, solicitar al backend que agregue permisos al token
- [ ] Crear hook `usePermissions()`

### Paso 2: Componentes de Control
- [ ] Crear componente `PermissionGuard`
- [ ] Agregar manejo de errores 403 en axios/fetch

### Paso 3: Aplicar en Páginas
- [ ] Página de lista de levantamientos
  - [ ] Botón "Crear" → `levantamientos:crear`
  - [ ] Botón "Editar" en tabla → `levantamientos:editar`
  - [ ] Botón "Eliminar" en tabla → `levantamientos:eliminar`

- [ ] Página de detalle de levantamiento
  - [ ] Tab "Revisión" → `levantamientos:revisar`
  - [ ] Botón "Aprobar Todo" → `levantamientos:aprobar`
  - [ ] Botón "Reabrir" → `levantamientos:reabrir`

### Paso 4: Testing
- [ ] Probar con usuario PQRS
- [ ] Probar con usuario Director Técnico
- [ ] Probar con usuario Director de Proyecto
- [ ] Probar con usuario analista.pmo
- [ ] Verificar que errores 403 se manejan correctamente

---

## 🎯 Resumen para el Frontend

1. **Obtener permisos** del token JWT o endpoint
2. **Crear hook** `usePermissions()` para usar en componentes
3. **Ocultar botones** que el usuario no puede usar
4. **Manejar error 403** si el usuario intenta algo sin permisos
5. **Mejor UX** - usuario solo ve lo que puede hacer

---

## 📞 Preguntas Frecuentes

**Q: ¿Los permisos se actualizan en tiempo real?**
A: No, el usuario debe hacer logout/login para que se actualicen los permisos.

**Q: ¿Qué pasa si el token JWT no incluye permisos?**
A: Deben solicitar al backend que agregue el campo `permissions` al payload del JWT.

**Q: ¿Es suficiente ocultar botones en el frontend?**
A: No, el backend SIEMPRE valida permisos. Ocultar botones es solo para UX.

**Q: ¿Qué pasa si un usuario cambia de rol?**
A: Debe hacer logout/login para que el nuevo token incluya los nuevos permisos.

**Q: ¿Puedo cachear los permisos?**
A: Sí, pero deben refrescarse cada vez que el usuario hace login.

---

## 📊 Endpoints del Backend

**Endpoints que requieren permisos específicos:**

```typescript
// Ver
GET /api/surveys              → levantamientos:ver
GET /api/surveys/:id          → levantamientos:ver
GET /api/surveys/works        → levantamientos:ver
GET /api/surveys/my-access    → levantamientos:ver

// Crear
POST /api/surveys             → levantamientos:crear
POST /api/surveys/works       → levantamientos:crear

// Editar
PUT /api/surveys/:id          → levantamientos:editar
PUT /api/surveys/works/:id    → levantamientos:editar

// Eliminar
DELETE /api/surveys/:id       → levantamientos:eliminar
DELETE /api/surveys/works/:id → levantamientos:eliminar

// Revisar (Director Técnico)
PATCH /api/surveys/:id/review       → levantamientos:revisar
PATCH /api/surveys/:id/review-block → levantamientos:revisar

// Aprobar (Director Técnico)
PATCH /api/surveys/:id/approve-all  → levantamientos:aprobar

// Reabrir (Director Técnico)
PATCH /api/surveys/:id/reopen       → levantamientos:reabrir
```

---

## 🚀 Ejemplo Completo de Integración

```typescript
// App.tsx - Configuración inicial
import { AuthProvider } from './contexts/AuthContext';
import { PermissionsProvider } from './contexts/PermissionsContext';

function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <Router>
          <Routes>
            <Route path="/levantamientos" element={<SurveysPage />} />
            <Route path="/levantamientos/:id" element={<SurveyDetailPage />} />
          </Routes>
        </Router>
      </PermissionsProvider>
    </AuthProvider>
  );
}

// contexts/AuthContext.tsx
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    const { token } = await api.post('/auth/login', { email, password });

    // Decodificar token para obtener permisos
    const payload = JSON.parse(atob(token.split('.')[1]));

    setUser({
      ...payload,
      permissions: payload.permissions || [],
    });

    localStorage.setItem('token', token);
  };

  return (
    <AuthContext.Provider value={{ user, login }}>
      {children}
    </AuthContext.Provider>
  );
};

// pages/SurveysPage.tsx - Uso final
import { usePermissions } from '@/hooks/usePermissions';

const SurveysPage = () => {
  const { hasPermission } = usePermissions();
  const [surveys, setSurveys] = useState([]);

  return (
    <div>
      <div className="header">
        <h1>Levantamientos de Obras</h1>

        {hasPermission('levantamientos:crear') && (
          <Button onClick={handleCreate}>
            + Nuevo Levantamiento
          </Button>
        )}
      </div>

      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Empresa</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {surveys.map(survey => (
            <tr key={survey.surveyId}>
              <td>{survey.workCode}</td>
              <td>{survey.companyName}</td>
              <td>{survey.status}</td>
              <td>
                <Button onClick={() => view(survey.surveyId)}>Ver</Button>

                {hasPermission('levantamientos:editar') && (
                  <Button onClick={() => edit(survey.surveyId)}>Editar</Button>
                )}

                {hasPermission('levantamientos:eliminar') && (
                  <Button onClick={() => remove(survey.surveyId)}>Eliminar</Button>
                )}

                {hasPermission('levantamientos:aprobar') && (
                  <Button onClick={() => approve(survey.surveyId)}>Aprobar</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

**¿Necesitan ayuda con la implementación? Consulten con el equipo de backend.**
