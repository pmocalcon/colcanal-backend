# Configuración del SGE

Cómo está montado el sistema: dónde corre, de qué rama sale cada cosa y qué variables
necesita para arrancar. Escrito para quien tenga que mantenerlo sin haberlo construido.

## Dónde corre

| Pieza | Servicio | Detalle |
|---|---|---|
| Frontend | Vercel, proyecto `colcanal-frontend-pmo` | React 19 + Vite. Dominio `colcanal-frontend-pmo.vercel.app` |
| Backend | Render | NestJS 11. `colcanal-backend.onrender.com` |
| Base de datos | Render Postgres | PostgreSQL 18.3, ~20 MB |

## De qué rama despliega cada uno

Esto confunde a cualquiera que llegue nuevo, así que conviene tenerlo claro:

- **Vercel despliega de `main`.** Durante meses la producción se actualizó promoviendo a
  mano vistas previas de las ramas `DP-xx`, y `main` quedó atrás. El 17/09/2026 se puso
  al día y volvió a ser la rama de producción de verdad.
- **Render despliega de `DP-29`.** Es la rama de trabajo del backend. Cualquier push a
  `DP-29` sale a producción de inmediato, sin ninguna comprobación previa más que el
  flujo de CI. `main` en el backend existe, está al día, pero no despliega nada.

El trabajo diario se hace en ramas `DP-xx`, una por iteración.

## Variables de entorno

Los valores viven en Render (Environment) y, para trabajar en local, en un `.env` que
**no se versiona**. Aquí solo van los nombres y para qué sirve cada una.

### Obligatorias

| Variable | Para qué |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | Conexión a PostgreSQL |
| `JWT_SECRET` | Firma los tokens de sesión. **Sin ella el backend no arranca** |
| `JWT_REFRESH_SECRET` | Firma los tokens de refresco. Igual de obligatoria |
| `JWT_EXPIRATION`, `JWT_REFRESH_EXPIRATION` | Duración de cada token, en segundos |

Las dos claves JWT dejaron de tener valor por defecto a propósito: antes, un entorno sin
ellas firmaba sesiones con una clave escrita en el repositorio y nada lo delataba.
Cambiarlas invalida todas las sesiones y obliga a todos a entrar de nuevo.

### Correo

`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` para el envío directo, y
`GRAPH_TENANT_ID`, `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET`, `GRAPH_SENDER` para el envío
por Microsoft Graph.

### Opcionales, con efecto importante

| Variable | Qué hace si se pone |
|---|---|
| `DB_SYNCHRONIZE=true` | Deja que TypeORM altere el esquema al arrancar. **Solo para una base local vacía.** En producción estuvo encendida hasta el 17/09/2026 y era el riesgo más grave del sistema |
| `SWAGGER_ENABLED=true` | Publica `/api/docs` en producción. Por defecto solo existe en desarrollo |
| `ALERTAS_PLAZOS_OBRAS` | `off` apaga el correo diario de plazos de obras; `on` lo fuerza en desarrollo |
| `FRONTEND_URL` | Base de los enlaces que llevan los correos. Sin ella los avisos llegan sin enlace |
| `CORPORATE_EMAIL_DOMAIN` | Dominio de correo permitido al crear usuarios. Por defecto `@canalcongroup.com` |
| `PASSWORD_EXEMPT_EMAILS` | Cuentas que no se obligan a cambiar la contraseña temporal |
| `NODE_ENV`, `PORT` | Entorno y puerto |

## Cambios de esquema

Desde que `synchronize` está apagado, la base **solo cambia por migración**:

```bash
npm run migration:generate   # tras cambiar una entidad
npm run migration:run        # aplica lo pendiente
npm run migration:revert     # deshace la última
```

`migration:run` hay que correrlo **después de desplegar y antes de que el código nuevo
use la columna**. No corre solo: `migrationsRun` está en `false`.

Hay dos migraciones sin registrar en producción a la espera del próximo despliegue:
`AddActaProvisionalYRequisicionAnticipada` (de julio, que `synchronize` ya había aplicado
por su cuenta) y `AlinearDefaultsConLasEntidades`. Las dos son idempotentes y no tocan
datos existentes.

## Integración continua

Cada repositorio tiene `.github/workflows/ci.yml`, que corre en cada push y cada pull
request. No despliega ni toca la base.

- **Backend**: instala, exige cero errores de tipos y compila. El lint es informativo.
- **Frontend**: la compilación frena el paso. Los tipos y el lint no se exigen limpios
  —hoy no lo están— sino que **no empeoren**: los topes están escritos en el propio
  archivo (49 errores de tipos, 433 de lint). Al arreglar un grupo, se baja el número.

## Respaldos

El procedimiento completo, con la prueba de restauración, está en
[`respaldos-y-restauracion.md`](respaldos-y-restauracion.md). Falta
confirmar en Render si los respaldos automáticos están activos y cuántos días se guardan.

## Detalles que sorprenden

- **`node_modules` está versionado en el backend.** Cualquier `npm install` mueve miles
  de archivos rastreados. Es la razón por la que actualizar dependencias ahí es una tarea
  aparte y no un arreglo rápido.
- **El `.env` del frontend apunta a `localhost`** en la máquina de desarrollo y no debe
  subirse.
- **El backend local apunta a la base de producción.** Cualquier script que se ejecute
  desde un portátil escribe en producción si no se limita a leer.
