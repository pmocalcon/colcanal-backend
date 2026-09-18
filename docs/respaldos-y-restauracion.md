# Respaldos de la base y prueba de restauración

Un respaldo que nunca se restauró no es un respaldo: es una suposición. Este documento
dice qué confirmar en Render, cómo sacar una copia y cómo comprobar, en media hora, que
esa copia sirve para volver a levantar el sistema.

La base pesa **20 MB** (PostgreSQL 18.3). A ese tamaño, la prueba completa —copia,
restauración en limpio y verificación— toma minutos, así que no hay excusa de tiempo.

## 1. Qué confirmar en Render (una vez)

En el panel de Render, en la base de datos del SGE:

- **Qué plan tiene.** En los planes de entrada no hay *point-in-time recovery*: no se
  puede volver a «ayer a las 3 p. m.», solo al último respaldo diario.
- **Si los respaldos automáticos están activos y cuántos días se guardan.**
- **A qué hora corren**, para saber cuánto trabajo se perdería en el peor caso: si el
  respaldo es de la 1 a. m. y el problema aparece a las 5 p. m., se pierde el día.

Anote las tres respuestas al final de este documento. Si no hay respaldos automáticos,
la copia manual de la sección 2 deja de ser una prueba y pasa a ser la única red.

## 2. Sacar una copia

Hace falta el cliente de PostgreSQL **18** (el mismo mayor que el servidor; uno anterior
se niega a leer la base). En Windows se instala con el instalador de PostgreSQL marcando
solo *Command Line Tools*, o con `winget install PostgreSQL.PostgreSQL.18`.

La contraseña no se escribe en la consola: se lee del `.env`, que ya la tiene.

```powershell
# Desde la raíz del backend
$env:PGPASSWORD = (Select-String -Path .env -Pattern '^DB_PASSWORD=(.*)$').Matches.Groups[1].Value
$host_    = (Select-String -Path .env -Pattern '^DB_HOST=(.*)$').Matches.Groups[1].Value
$usuario  = (Select-String -Path .env -Pattern '^DB_USERNAME=(.*)$').Matches.Groups[1].Value
$base     = (Select-String -Path .env -Pattern '^DB_DATABASE=(.*)$').Matches.Groups[1].Value
$archivo  = "sge-$(Get-Date -Format yyyy-MM-dd).dump"

pg_dump --host=$host_ --username=$usuario --dbname=$base `
        --format=custom --no-owner --no-privileges --file=$archivo

$env:PGPASSWORD = $null   # que no quede en la sesión
```

**El archivo tiene datos reales de personas**: usuarios, correos, contratos, nómina.
Guárdelo donde guarda la información confidencial de la empresa, nunca dentro del
repositorio, y bórrelo cuando termine la prueba.

## 3. Probar que la copia sirve

La prueba no es que el archivo exista: es que de él salga una base funcionando.

```powershell
# Una base local vacía, aparte de la de producción
createdb --username=postgres sge_prueba_restauracion

pg_restore --username=postgres --dbname=sge_prueba_restauracion `
           --no-owner --no-privileges $archivo
```

Luego, contra la base restaurada, comprobar que están las cosas que importan:

```sql
SELECT count(*) FROM users;          -- ¿están todos los usuarios?
SELECT count(*) FROM requisitions;   -- ¿y las requisiciones?
SELECT count(*) FROM work_actas;     -- ¿y las actas?
SELECT max(created_at) FROM requisition_logs;  -- ¿hasta cuándo llega la copia?
```

Los números deben parecerse a los de producción, y la última fecha debe ser cercana al
momento del respaldo. Si `pg_restore` reporta errores, **la prueba falló aunque el
archivo se haya generado**: eso es exactamente lo que se busca descubrir hoy y no el día
del incidente.

Al terminar:

```powershell
dropdb --username=postgres sge_prueba_restauracion
Remove-Item $archivo
```

## 4. Cada cuánto repetirlo

- **Cada tres meses**, y siempre después de un cambio grande de esquema.
- Anote abajo la fecha y el resultado. Una línea basta; lo que importa es que exista.

## 5. Registro de pruebas

| Fecha | Quién | Resultado | Notas |
|---|---|---|---|
| | | | |

## 6. Datos de Render (llenar)

- Plan de la base:
- Respaldos automáticos: sí / no
- Días que se conservan:
- Hora a la que corren:
- Pérdida máxima en el peor caso:
