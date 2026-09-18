# Seguridad del SGE

Estado al 17/09/2026. Recoge la revisión del código y de la base de producción hecha ese
día, qué se corrigió y qué sigue abierto. Escrito para quien mantenga el sistema y para
quien tenga que decidir qué se atiende primero.

La revisión fue de lectura: código, configuración y consultas de solo lectura a la base.
No se hicieron pruebas de intrusión contra el sistema en vivo.

## Cómo funciona el control de acceso

Conviene entenderlo antes de leer los hallazgos, porque casi todos salen de aquí.

Hay tres guards: sesión (`JwtAuthGuard`), rol (`RolesGuard`) y permiso
(`PermissionsGuard`). **No son globales**: se aplican controlador por controlador. Un
controlador que solo declare `JwtAuthGuard` queda abierto a cualquier usuario con sesión,
sin importar su rol. Esa es la trampa que produjo los dos hallazgos más graves.

Los permisos se arman combinando la *gestión* que tiene el rol (`compras`, `auditorias`,
`proveedores`, `levantamiento-obras`…) con sus *permisos* (Ver, Crear, Revisar, Aprobar,
Autorizar, Cotizar, Exportar, Validar), y se piden en el código como `gestion:accion`,
por ejemplo `@Permissions("auditorias:ver")`. El resultado se cachea 5 minutos en memoria
del proceso: un cambio de permisos puede tardar ese rato en notarse.

## Corregido el 17/09/2026

| Qué estaba mal | Cómo estaba | Cómo quedó |
|---|---|---|
| Auditoría de compras abierta | Sus 7 endpoints pedían solo sesión: cualquier rol podía leer por la URL la bitácora completa, el detalle de cualquier requisición y las compras por proveedor | Exigen `auditorias:ver`, la misma puerta que ya tenía la auditoría de obras |
| Proveedores abierto | Cualquier rol podía listar proveedores y además crear, editar o desactivar | Consultar pide `proveedores:ver`; modificar pide `proveedores:crear` |
| Administración de usuarios por parecido de nombre | El rol entraba si su nombre *contenía* a uno permitido. Así entraba «Gerencia de Proyectos», que contiene «gerencia», a crear usuarios, restablecer contraseñas y repartir permisos | Comparación exacta contra la lista. Cualquier rol nuevo que deba administrar usuarios se agrega a propósito |
| Claves de firma con valor por defecto | `JWT_SECRET` y `JWT_REFRESH_SECRET` caían a literales escritos en el código. Un entorno sin esas variables firmaba sesiones con una clave pública | Faltan y el backend no arranca, con un mensaje que dice cuál falta |
| El esquema se cambiaba solo | `synchronize: true` en producción: en cada despliegue TypeORM alteraba la base, incluidos índices que borraba si no los encontraba declarados | Apagado. Solo se enciende a propósito con `DB_SYNCHRONIZE=true` |
| Swagger público | `/api/docs` publicaba sin pedir sesión el mapa de los 345 endpoints | Fuera de producción, salvo `SWAGGER_ENABLED=true` |

Tras cerrar auditoría y proveedores se comprobó contra los 36 roles de producción quiénes
conservan el acceso: Gerencia, Director PMO, Analista PMO, Dirección Financiera y Compras
para auditoría; los cuatro últimos para proveedores. Los otros 31 roles lo pierden, que
es justamente lo que se buscaba.

## Abierto

Ordenado por lo que más rinde atenderlo primero.

### 1. Endpoints sin control de permisos

De 351 endpoints, **unos 150 no declaran ningún permiso ni rol**. Varios validan por
dentro del servicio, otros no validan nada. Se cerraron los dos peores casos; el resto
sigue pendiente de revisar uno por uno.

Ejemplo conocido y aceptado por ahora: `GET /purchases/requisitions/all-requisitions`
devuelve todas las requisiciones a cualquier usuario con sesión. Se dejó así a propósito
porque lo usa el Historial de RQ del cronograma, que abren Directores de Proyecto y PQRS.
Cerrarlo bien pide separar «lo mío» de «todo» por rol y por proyecto.

### 2. Límite de peticiones

Solo el login tiene límite. Y está mal contado: el backend no confía en el proxy de
Render, así que ve la IP del proxy y no la del usuario, con lo que los 5 intentos por
minuto se reparten **entre todos los usuarios juntos**. Si alguien recibe «demasiadas
peticiones» sin motivo, es esto.

El arreglo es, en orden: que el backend vea la IP real, un límite general amplio (del
orden de 600 por minuto, sabiendo que la pantalla más pesada hace unas 15 llamadas al
abrirse) y límites estrictos en login y restablecimiento de contraseñas.

### 3. Dependencias con vulnerabilidades conocidas

Backend 59 avisos (2 críticos), frontend 30 (5 críticos). Los críticos vienen de
herramientas de desarrollo y no corren en producción. Lo que sí corre y conviene subir:
**axios**, **react-router**, **typeorm**, **multer**, **nodemailer** y **csv-parse**.

Empezar por el frontend, que no tiene `node_modules` versionado y es donde están las que
de verdad se ejecutan en el navegador.

### 4. CORS permisivo

`origin: true` con `credentials: true` acepta cualquier origen. **El riesgo real hoy es
bajo**: el token vive en `localStorage` y viaja en una cabecera, así que una página ajena
no puede leerlo ni hacer que el navegador lo mande sola. Es higiene, y pasaría a importar
de verdad el día que se migre a cookies. Para cerrarlo hacen falta los dominios exactos
del frontend, y una lista mal puesta deja a todo el mundo sin sistema.

### 5. Sin alcance por municipio

No existe un modelo que limite a un usuario a su municipio o regional: la separación es
por rol y por permiso de módulo. Un rol con permiso de compras puede consultar por API
datos de municipios que no son el suyo. La pantalla lo esconde; el servidor no.

### 6. Token en `localStorage`

Funciona y es común en aplicaciones de una sola página, pero queda expuesto si algún día
se cuela una inyección de script en el frontend. Cambiarlo a cookie `httpOnly` es
rediseñar el manejo de sesión: mucho trabajo, poco beneficio inmediato.

## Lo que está bien

También importa saber qué no hay que tocar:

- Las 631 consultas SQL usan parámetros. No se encontró inyección.
- Contraseñas con bcrypt, temporales aleatorias y obligación de cambiarlas.
- El `.env` no está versionado.
- `helmet` y validación de entrada con lista blanca, que descarta campos no declarados.
- El filtro de errores no expone detalles internos de la base.
- La impersonación está restringida al PMO y queda marcada en el token.
- El frontend escapa el HTML que arma a mano.

## Qué revisar cada tanto

- Al crear un rol nuevo, comprobar a qué le da acceso, sobre todo si su nombre se parece
  a uno con privilegios.
- Al crear un controlador, declarar sus permisos. Que solo pida sesión es la falla más
  repetida de este sistema.
- Cada tanto, `npm audit` en los dos repositorios.
