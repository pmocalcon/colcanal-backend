/**
 * Agrega como gestiones los cuatro módulos que hoy viven fijos en el frontend
 * (Aprobaciones, Gestión del conocimiento, Talento Humano, Recurso Económico) y
 * los asigna a los roles que HOY los ven, para que nadie pierda acceso.
 *
 * Es idempotente: se puede correr varias veces sin duplicar filas.
 *
 * Deja intactos los guards por rol del backend (RolesGuard sigue cerrando TH y RE):
 * esto controla la VISIBILIDAD del módulo desde el checklist de administración.
 *
 * Ejecutar:
 *   npx ts-node -r tsconfig-paths/register src/database/scripts/agregar-gestiones-fijas.ts
 */

import dataSource from "../data-source";
import { Gestion } from "../entities/gestion.entity";
import { Role } from "../entities/role.entity";
import { RoleGestion } from "../entities/role-gestion.entity";

// Cada módulo con su presentación y los roles que hoy lo ven. `"*"` = todos.
const MODULOS: Array<{
  slug: string;
  nombre: string;
  icono: string;
  roles: string[] | "*";
}> = [
  {
    slug: "aprobaciones",
    nombre: "Aprobaciones",
    icono: "Stamp",
    roles: ["Gerencia", "Analista PMO", "Director PMO"],
  },
  {
    slug: "gestion-conocimiento",
    nombre: "Gestión del conocimiento",
    icono: "BookOpen",
    roles: "*",
  },
  {
    slug: "talento-humano",
    nombre: "Talento Humano",
    icono: "Users",
    roles: [
      "Coordinador Talento Humano",
      "Director Financiero y Administrativo",
      "Analista Administrativo",
      "Gerencia",
      "Director PMO",
      "Analista PMO",
    ],
  },
  {
    slug: "recurso-economico",
    nombre: "Recurso Económico",
    icono: "Wallet",
    roles: ["Analista PMO", "Director PMO"],
  },
];

async function main() {
  await dataSource.initialize();
  console.log("✅ Conexión establecida\n");

  const gestionRepo = dataSource.getRepository(Gestion);
  const roleRepo = dataSource.getRepository(Role);
  const roleGestionRepo = dataSource.getRepository(RoleGestion);

  const todosLosRoles = await roleRepo.find();
  const rolePorNombre = new Map(todosLosRoles.map((r) => [r.nombreRol, r]));

  for (const mod of MODULOS) {
    // 1) Gestión (upsert por slug, respetando la secuencia con el repositorio).
    let gestion = await gestionRepo.findOne({ where: { slug: mod.slug } });
    if (!gestion) {
      gestion = await gestionRepo.save(
        gestionRepo.create({
          nombre: mod.nombre,
          slug: mod.slug,
          icono: mod.icono,
        }),
      );
      console.log(`➕ gestión creada: ${mod.slug} (id ${gestion.gestionId})`);
    } else {
      console.log(`= gestión ya existía: ${mod.slug} (id ${gestion.gestionId})`);
    }

    // 2) Roles destino.
    const rolesDestino =
      mod.roles === "*"
        ? todosLosRoles
        : mod.roles
            .map((n) => {
              const r = rolePorNombre.get(n);
              if (!r) console.log(`   ⚠️  rol no encontrado: "${n}" (se omite)`);
              return r;
            })
            .filter((r): r is Role => !!r);

    // 3) Asignaciones (insertar si no existe la pareja rol+gestión).
    let nuevas = 0;
    for (const rol of rolesDestino) {
      const ya = await roleGestionRepo.findOne({
        where: { rolId: rol.rolId, gestionId: gestion.gestionId },
      });
      if (!ya) {
        await roleGestionRepo.save(
          roleGestionRepo.create({
            rolId: rol.rolId,
            gestionId: gestion.gestionId,
          }),
        );
        nuevas++;
      }
    }
    console.log(
      `   → ${rolesDestino.length} rol(es) objetivo, ${nuevas} asignación(es) nueva(s)\n`,
    );
  }

  await dataSource.destroy();
  console.log("🎉 Listo. Las gestiones ya aparecen en el checklist y su");
  console.log("   visibilidad quedó asignada a los roles que ya las veían.\n");
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
