-- ============================================
-- SCRIPT SQL: Permisos Granulares para Levantamientos
-- IMPORTANTE: Revisar antes de ejecutar en Render
-- Este script NO elimina datos, solo agrega permisos
-- ============================================

-- PASO 1: Verificar permisos existentes (EJECUTAR PRIMERO)
-- Esto te muestra qué permisos ya existen
SELECT permiso_id, nombre_permiso, descripcion
FROM permisos
WHERE nombre_permiso LIKE '%levantamiento%'
ORDER BY nombre_permiso;

-- ============================================
-- PASO 2: Crear permisos granulares
-- ============================================

-- Insertar nuevos permisos (ON CONFLICT DO NOTHING = no falla si ya existen)
INSERT INTO permisos (nombre_permiso, descripcion)
VALUES
    ('levantamientos:ver', 'Ver levantamientos de obras'),
    ('levantamientos:crear', 'Crear levantamientos de obras'),
    ('levantamientos:editar', 'Editar levantamientos de obras'),
    ('levantamientos:eliminar', 'Eliminar levantamientos de obras'),
    ('levantamientos:revisar', 'Revisar bloques de levantamientos'),
    ('levantamientos:aprobar', 'Aprobar levantamientos completos'),
    ('levantamientos:reabrir', 'Reabrir levantamientos aprobados')
ON CONFLICT (nombre_permiso) DO NOTHING;

-- Verificar que se insertaron correctamente
SELECT permiso_id, nombre_permiso, descripcion
FROM permisos
WHERE nombre_permiso LIKE 'levantamientos:%'
ORDER BY nombre_permiso;

-- ============================================
-- PASO 3: Asignar permisos a roles
-- ============================================

-- 3.1 Asignar a roles PQRS (category = 'PQRS')
-- PQRS puede: ver, crear, editar, eliminar (NO revisar/aprobar/reabrir)
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.rol_id, p.permiso_id
FROM roles r
CROSS JOIN permisos p
WHERE r.category = 'PQRS'
AND p.nombre_permiso IN (
    'levantamientos:ver',
    'levantamientos:crear',
    'levantamientos:editar',
    'levantamientos:eliminar'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- 3.2 Asignar a "Coordinador Operativo"
-- Coordinador puede: ver, crear, editar, eliminar (NO revisar/aprobar/reabrir)
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.rol_id, p.permiso_id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre_rol = 'Coordinador Operativo'
AND p.nombre_permiso IN (
    'levantamientos:ver',
    'levantamientos:crear',
    'levantamientos:editar',
    'levantamientos:eliminar'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- 3.3 Asignar a "Director de Proyecto"
-- Director de Proyecto solo puede: ver (NO crear)
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.rol_id, p.permiso_id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre_rol = 'Director de Proyecto'
AND p.nombre_permiso = 'levantamientos:ver'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- 3.4 Asignar a "Director Técnico"
-- Director Técnico puede: ver, revisar, aprobar, reabrir (NO crear/editar/eliminar)
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.rol_id, p.permiso_id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre_rol = 'Director Técnico'
AND p.nombre_permiso IN (
    'levantamientos:ver',
    'levantamientos:revisar',
    'levantamientos:aprobar',
    'levantamientos:reabrir'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- 3.5 Asignar TODOS los permisos a "Super Admin" (si existe)
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.rol_id, p.permiso_id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre_rol = 'Super Admin'
AND p.nombre_permiso LIKE 'levantamientos:%'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- ============================================
-- PASO 4: Verificar asignaciones
-- ============================================

-- Ver todos los roles y sus permisos de levantamientos
SELECT
    r.rol_id,
    r.nombre_rol,
    r.category,
    STRING_AGG(p.nombre_permiso, ', ' ORDER BY p.nombre_permiso) as permisos_levantamientos
FROM roles r
LEFT JOIN roles_permisos rp ON r.rol_id = rp.rol_id
LEFT JOIN permisos p ON rp.permiso_id = p.permiso_id AND p.nombre_permiso LIKE 'levantamientos:%'
GROUP BY r.rol_id, r.nombre_rol, r.category
HAVING COUNT(p.permiso_id) > 0
ORDER BY r.nombre_rol;

-- Ver permisos de un rol específico (cambiar 'PQRS Jericó' por el rol que quieras verificar)
SELECT
    r.nombre_rol,
    p.nombre_permiso,
    p.descripcion
FROM roles r
JOIN roles_permisos rp ON r.rol_id = rp.rol_id
JOIN permisos p ON rp.permiso_id = p.permiso_id
WHERE r.nombre_rol = 'PQRS Jericó'
AND p.nombre_permiso LIKE 'levantamientos:%'
ORDER BY p.nombre_permiso;

-- ============================================
-- MATRIZ DE PERMISOS ESPERADA
-- ============================================
/*
Rol                      | Ver | Crear | Editar | Eliminar | Revisar | Aprobar | Reabrir
-------------------------|-----|-------|--------|----------|---------|---------|--------
PQRS                     | ✅  | ✅    | ✅     | ✅       | ❌      | ❌      | ❌
Coordinador Operativo    | ✅  | ✅    | ✅     | ✅       | ❌      | ❌      | ❌
Director de Proyecto     | ✅  | ❌    | ❌     | ❌       | ❌      | ❌      | ❌
Director Técnico         | ✅  | ❌    | ❌     | ❌       | ✅      | ✅      | ✅
Super Admin              | ✅  | ✅    | ✅     | ✅       | ✅      | ✅      | ✅
*/

-- ============================================
-- ROLLBACK (solo si algo salió mal)
-- ============================================
/*
-- SOLO ejecutar si necesitas revertir los cambios

-- 1. Eliminar asignaciones de permisos a roles
DELETE FROM roles_permisos
WHERE permiso_id IN (
    SELECT permiso_id FROM permisos
    WHERE nombre_permiso LIKE 'levantamientos:%'
);

-- 2. Eliminar los permisos granulares
DELETE FROM permisos
WHERE nombre_permiso LIKE 'levantamientos:%';
*/
