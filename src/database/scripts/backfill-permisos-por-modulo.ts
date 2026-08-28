/**
 * Backfill de la matriz de permisos por módulo (roles_gestiones_permisos) a partir
 * del modelo global vigente, reproduciendo EXACTAMENTE lo que genera buildPermissions
 * —así ningún rol cambia de acceso—, pero emparejando cada permiso con el módulo que
 * le corresponde:
 *
 *  - Permisos genéricos (Ver, Crear, …, permiso_id 1-8): se emparejan con CADA módulo
 *    que el rol tiene, y producen `modulo:accion`.
 *  - Permisos granulares con nombre propio (`levantamientos:*`, `creg:*`): se emparejan
 *    SOLO con su módulo (por el prefijo del nombre). No se mezclan en otros módulos.
 *
 * Idempotente: TRUNCA la tabla y la reconstruye. Mientras un rol quede sin filas,
 * buildPermissions cae al modelo viejo, así que no hay ventana de corte.
 *
 * Ejecutar:
 *   npx ts-node -r tsconfig-paths/register src/database/scripts/backfill-permisos-por-modulo.ts
 */

import dataSource from "../data-source";
import { Gestion } from "../entities/gestion.entity";
import { Permission } from "../entities/permission.entity";
import { RoleGestion } from "../entities/role-gestion.entity";
import { RolePermission } from "../entities/role-permission.entity";
import { RoleGestionPermission } from "../entities/role-gestion-permission.entity";

// Prefijo de permiso por slug de módulo (espejo de GESTION_PERMISSION_PREFIX).
const PREFIJO_POR_SLUG: Record<string, string> = {
  "levantamiento-obras": "levantamientos",
};
const prefijoDe = (slug: string) => PREFIJO_POR_SLUG[slug] ?? slug;

async function main() {
  await dataSource.initialize();
  console.log("✅ Conexión establecida\n");

  const gestionRepo = dataSource.getRepository(Gestion);
  const permisoRepo = dataSource.getRepository(Permission);
  const rgRepo = dataSource.getRepository(RoleGestion);
  const rpRepo = dataSource.getRepository(RolePermission);
  const rgpRepo = dataSource.getRepository(RoleGestionPermission);

  const [gestiones, permisos, roleGestiones, rolePermisos] = await Promise.all([
    gestionRepo.find(),
    permisoRepo.find(),
    rgRepo.find(),
    rpRepo.find(),
  ]);

  // Gestión por prefijo de permiso (para colocar los granulares en su módulo).
  const gestionPorPrefijo = new Map<string, Gestion>();
  for (const g of gestiones) gestionPorPrefijo.set(prefijoDe(g.slug), g);

  // Genéricos (sin ':') vs granulares (con ':'), por id.
  const esGenerico = new Map<number, boolean>();
  const prefijoDePermiso = new Map<number, string>();
  for (const p of permisos) {
    const granular = p.nombrePermiso.includes(":");
    esGenerico.set(p.permisoId, !granular);
    if (granular) prefijoDePermiso.set(p.permisoId, p.nombrePermiso.split(":")[0]);
  }

  // Índices por rol.
  const gestionesPorRol = new Map<number, number[]>();
  for (const rg of roleGestiones) {
    const arr = gestionesPorRol.get(rg.rolId) ?? [];
    arr.push(rg.gestionId);
    gestionesPorRol.set(rg.rolId, arr);
  }
  const permisosPorRol = new Map<number, number[]>();
  for (const rp of rolePermisos) {
    const arr = permisosPorRol.get(rp.rolId) ?? [];
    arr.push(rp.permisoId);
    permisosPorRol.set(rp.rolId, arr);
  }

  // Reconstrucción limpia.
  await rgpRepo.clear(); // TRUNCATE
  console.log("🧹 Matriz vaciada; reconstruyendo…\n");

  const nuevas: RoleGestionPermission[] = [];
  const vistas = new Set<string>();
  const agregar = (rolId: number, gestionId: number, permisoId: number) => {
    const k = `${rolId}:${gestionId}:${permisoId}`;
    if (!vistas.has(k)) {
      vistas.add(k);
      nuevas.push(rgpRepo.create({ rolId, gestionId, permisoId }));
    }
  };

  const roles = new Set<number>([
    ...gestionesPorRol.keys(),
    ...permisosPorRol.keys(),
  ]);

  for (const rolId of roles) {
    const gestiones = gestionesPorRol.get(rolId) ?? [];
    const permisos = permisosPorRol.get(rolId) ?? [];
    for (const permisoId of permisos) {
      if (esGenerico.get(permisoId)) {
        // Genérico → cada módulo del rol.
        for (const gestionId of gestiones) agregar(rolId, gestionId, permisoId);
      } else {
        // Granular → solo su módulo (por prefijo del nombre).
        const gestion = gestionPorPrefijo.get(prefijoDePermiso.get(permisoId)!);
        if (gestion) agregar(rolId, gestion.gestionId, permisoId);
      }
    }
  }

  for (let i = 0; i < nuevas.length; i += 500) {
    await rgpRepo.save(nuevas.slice(i, i + 500));
  }

  console.log(`Roles procesados:      ${roles.size}`);
  console.log(`Filas creadas:         ${nuevas.length}\n`);

  await dataSource.destroy();
  console.log("🎉 Matriz reconstruida y limpia. Cada permiso quedó en su módulo,");
  console.log("   sin cambiar el acceso de ningún rol.\n");
}

main().catch(async (e) => {
  console.error("❌ Error:", e);
  try {
    await dataSource.destroy();
  } catch {
    /* noop */
  }
  process.exit(1);
});
