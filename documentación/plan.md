# Plan de trabajo del SGE

Qué hay pendiente, en qué orden y por qué. Estado al 17/09/2026. Escrito para retomar el
hilo sin tener que reconstruirlo de memoria.

## Dónde estamos

El SGE es un ERP interno: NestJS + PostgreSQL detrás, React + Vite delante. 16 módulos,
351 endpoints, 131 pantallas, ~58.500 líneas en el backend. Lo mantiene una sola persona.

La arquitectura aguanta el tamaño actual. El problema no es capacidad de servidor: **el
sistema creció más rápido que la red de seguridad que lo rodea** —pruebas, integración
continua, configuración de producción endurecida, respaldos probados—. Casi todo lo
pendiente son cambios de código que no cuestan infraestructura.

## Entrega pendiente

Hay trabajo terminado y probado que **todavía no está en producción**: 15 commits en el
backend y 17 en el frontend. Incluyen las correcciones de seguridad, la composición
comparada de UCAP, los plazos de obras con su alerta diaria, las reglas nuevas de
requisición y presupuesto, y la memoria de pantalla de los listados.

Varias de esas funciones necesitan las dos partes a la vez, así que el orden importa:

1. **Subir el backend** (push a `DP-29`, que es de donde despliega Render).
2. **Correr `npm run migration:run`** en cuanto termine el despliegue. Quedan dos
   migraciones sin registrar y `synchronize` ya está apagado, así que nadie las va a
   aplicar sola.
3. **Avisar a quien pierde accesos**: 31 roles dejan de entrar a auditoría y proveedores
   por API, y Gerencia de Proyectos deja de administrar usuarios. Es lo buscado, pero se
   nota.
4. **Subir el frontend** (push a `DP-28` y luego a `main`, que es de donde despliega
   Vercel).
5. Comprobar en vivo: entrar al comparador de UCAP y abrir la composición de un elemento
   de Puerto Asís, que es el único municipio con hojas de costos cargadas.

Antes del paso 1 conviene tener a mano cómo volver atrás: en Render, el despliegue
anterior; en Vercel, *Instant Rollback*.

## Después de eso, en orden

### Primero: la red de seguridad

1. **Respaldos.** Confirmar en Render si están activos, cuántos días se guardan y a qué
   hora corren, y **probar una restauración**. El procedimiento está escrito en
   [`docs/respaldos-y-restauracion.md`](../docs/respaldos-y-restauracion.md). La base pesa
   20 MB: la prueba toma minutos. Es lo único de toda la lista que protege cuando algo ya
   salió mal.
2. **Pruebas.** Hoy hay 1 archivo de prueba en el backend (el de ejemplo, vacío) y 0 en el
   frontend. No hace falta cobertura completa: empezar por lo que más duele si se rompe
   —el flujo de aprobación de requisiciones, el cálculo de UCAP y la liquidación— ya
   cambia el panorama. El flujo de CI ya está montado y las ejecutaría solas.

### Segundo: lo que queda de seguridad

Está detallado en [`seguridad.md`](seguridad.md). Por orden de rendimiento: el límite de
peticiones (que además arregla un problema de hoy en el login), las dependencias
desactualizadas, y la revisión endpoint por endpoint de los que no declaran permiso.

### Tercero: rendimiento y crecimiento

- **Dividir el código del frontend.** Las 131 páginas se importan de una en `App.tsx`:
  quien entra a ver una requisición descarga también Cronograma, Talento Humano y CREG.
  El paquete resultante pesa 4,5 MB.
- **Colas para lo pesado.** Nómina e informes corren dentro de la petición; con 0,5 CPU,
  uno pesado bloquea a todos mientras dura.
- **Un programador de tareas de verdad.** La alerta diaria de plazos usa un temporizador
  dentro del proceso. Funciona, pero si algún día corren dos instancias, los correos
  salen dos veces.
- **Registro de eventos estructurado.** Hoy la trazabilidad en producción son
  `console.log` y los registros crudos de Render.

### Cuarto: infraestructura, solo con datos

Antes de subir de plan en Render, mirar el uso real de CPU, memoria y conexiones de los
últimos 30 días. Cerrar lo anterior libera capacidad sin gastar. Si al hacerlo los
módulos nuevos siguen siendo pesados, conviene un proceso aparte para ellos antes que un
servidor más grande.

## Temas abiertos del negocio

Sueltos, para no perderlos:

- Falta decidir a quién le llega la notificación de aprobación del Plan Anual.
- Los presupuestos de obras sueltas no se pueden aprobar sin acta, por la regla nueva.
- Las 14 actas de producción tienen el cronograma en pendiente: hasta que se aprueben, no
  se pueden generar requisiciones desde ellas.
- Solo Puerto Asís tiene hojas de costos de UCAP cargadas (48 de 513 en total). Mientras
  siga así, la composición comparada casi nunca tiene con qué comparar.
- Las actas de capacitación del módulo de Obras, una por rol, están generadas y les falta
  fecha, número, horas, moderador y firma.
