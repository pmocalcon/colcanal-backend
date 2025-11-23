-- Script para actualizar el dominio de correo de todos los usuarios
-- De: @canalco.com
-- A: @canalcongroup.com

-- Primero, verificamos cuántos usuarios se van a actualizar
SELECT
    email as email_anterior,
    REPLACE(email, '@canalco.com', '@canalcongroup.com') as email_nuevo
FROM users
WHERE email LIKE '%@canalco.com';

-- Si los resultados son correctos, ejecuta la actualización:
UPDATE users
SET email = REPLACE(email, '@canalco.com', '@canalcongroup.com')
WHERE email LIKE '%@canalco.com';

-- Verificar que se actualizaron correctamente
SELECT email FROM users ORDER BY email;
