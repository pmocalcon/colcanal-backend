-- ============================================
-- QUERIES PARA DEBUG DE PERMISOS
-- Sistema de Levantamiento de Obras
-- ============================================

-- 1. Ver todos los permisos disponibles en el sistema
-- (Buscar el nombre exacto del permiso de levantamientos)
SELECT
  permiso_id,
  nombre_permiso,
  descripcion
FROM permisos
WHERE nombre_permiso ILIKE '%levantamiento%'
   OR nombre_permiso ILIKE '%survey%'
   OR nombre_permiso ILIKE '%obras%'
ORDER BY nombre_permiso;

-- 2. Ver TODOS los permisos (si no encuentras nada arriba)
SELECT
  permiso_id,
  nombre_permiso,
  descripcion
FROM permisos
ORDER BY nombre_permiso;

-- 3. Ver los permisos del rol "PQRS Jericó" (o cualquier rol PQRS)
SELECT
  r.rol_id,
  r.nombre_rol,
  p.permiso_id,
  p.nombre_permiso,
  p.descripcion
FROM roles r
JOIN roles_permisos rp ON r.rol_id = rp.rol_id
JOIN permisos p ON rp.permiso_id = p.permiso_id
WHERE r.nombre_rol ILIKE '%jericó%'
   OR r.nombre_rol ILIKE '%pqrs%'
ORDER BY r.nombre_rol, p.nombre_permiso;

-- 4. Ver los permisos del usuario específico (Danelly Ramirez, userId=12)
SELECT
  u.user_id,
  u.nombre,
  u.email,
  r.rol_id,
  r.nombre_rol,
  p.permiso_id,
  p.nombre_permiso,
  p.descripcion
FROM users u
JOIN roles r ON u.rol_id = r.rol_id
JOIN roles_permisos rp ON r.rol_id = rp.rol_id
JOIN permisos p ON rp.permiso_id = p.permiso_id
WHERE u.user_id = 12  -- Cambiar por el userId del usuario bloqueado
ORDER BY p.nombre_permiso;

-- 5. Ver información completa del usuario
SELECT
  user_id,
  nombre,
  email,
  cargo,
  rol_id,
  estado
FROM users
WHERE user_id = 12;  -- Cambiar por el userId del usuario bloqueado

-- 6. Ver el rol del usuario
SELECT
  u.user_id,
  u.nombre,
  u.email,
  r.rol_id,
  r.nombre_rol,
  r.category,
  r.descripcion
FROM users u
JOIN roles r ON u.rol_id = r.rol_id
WHERE u.user_id = 12;

-- 7. Verificar si el permiso existe en la tabla permisos
-- (Buscar variaciones del nombre)
SELECT
  permiso_id,
  nombre_permiso
FROM permisos
WHERE
  nombre_permiso ILIKE '%levanta%'
  OR nombre_permiso ILIKE '%survey%'
  OR nombre_permiso ILIKE '%obra%'
  OR nombre_permiso ILIKE '%work%';

-- 8. Ver cuántos roles tienen acceso a levantamientos
-- (Una vez sepas el nombre exacto del permiso)
SELECT
  r.nombre_rol,
  r.category,
  COUNT(*) as cant_usuarios
FROM roles r
JOIN roles_permisos rp ON r.rol_id = rp.rol_id
JOIN permisos p ON rp.permiso_id = p.permiso_id
LEFT JOIN users u ON u.rol_id = r.rol_id AND u.estado = true
WHERE p.nombre_permiso = 'Nombre Exacto Del Permiso'  -- Cambiar después de ejecutar query #1
GROUP BY r.rol_id, r.nombre_rol, r.category
ORDER BY r.nombre_rol;

-- ============================================
-- SOLUCIONES SEGÚN EL PROBLEMA ENCONTRADO
-- ============================================

-- CASO A: El permiso no existe en la tabla 'permisos'
-- Solución: Crear el permiso
/*
INSERT INTO permisos (nombre_permiso, descripcion)
VALUES
  ('Ver Levantamiento de Obras', 'Permite ver el módulo de levantamiento de obras'),
  ('Crear Levantamiento de Obras', 'Permite crear obras y levantamientos');
*/

-- CASO B: El permiso existe pero el rol no lo tiene asignado
-- Solución: Asignar el permiso al rol
/*
-- Primero obtener el permiso_id
SELECT permiso_id FROM permisos WHERE nombre_permiso = 'Ver Levantamiento de Obras';

-- Luego asignar al rol (ejemplo: rol_id = 13 para "PQRS Jericó")
INSERT INTO roles_permisos (rol_id, permiso_id)
VALUES
  (13, 1),  -- Reemplazar 13 con el rol_id correcto, y 1 con el permiso_id correcto
  (13, 2);  -- Si hay múltiples permisos
*/

-- CASO C: El usuario no tiene el rol correcto
-- Solución: Actualizar el rol del usuario
/*
UPDATE users
SET rol_id = 13  -- Cambiar al rol_id correcto
WHERE user_id = 12;
*/

-- ============================================
-- QUERIES ADICIONALES ÚTILES
-- ============================================

-- Ver todos los roles PQRS y sus permisos
SELECT
  r.rol_id,
  r.nombre_rol,
  STRING_AGG(p.nombre_permiso, ', ' ORDER BY p.nombre_permiso) as permisos
FROM roles r
LEFT JOIN roles_permisos rp ON r.rol_id = rp.rol_id
LEFT JOIN permisos p ON rp.permiso_id = p.permiso_id
WHERE r.category = 'PQRS'
GROUP BY r.rol_id, r.nombre_rol
ORDER BY r.nombre_rol;

-- Ver usuarios PQRS y sus permisos
SELECT
  u.user_id,
  u.nombre,
  u.email,
  r.nombre_rol,
  STRING_AGG(p.nombre_permiso, ', ' ORDER BY p.nombre_permiso) as permisos
FROM users u
JOIN roles r ON u.rol_id = r.rol_id
LEFT JOIN roles_permisos rp ON r.rol_id = rp.rol_id
LEFT JOIN permisos p ON rp.permiso_id = p.permiso_id
WHERE r.category = 'PQRS'
  AND u.estado = true
GROUP BY u.user_id, u.nombre, u.email, r.nombre_rol
ORDER BY r.nombre_rol, u.nombre;
