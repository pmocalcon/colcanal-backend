/* SOLO LECTURA — este script no escribe nada en la base. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/** Quién tiene hoy la gestión `auditorias`, que es quien entra a la pantalla. */
async function main() {
  const ds = new DataSource({
    ...dataSourceOptions,
    synchronize: false,
    migrationsRun: false,
    cache: false,
  });
  await ds.initialize();

  const roles = await ds.query(
    `SELECT rg.rol_id, r.nombre_rol, r.category
       FROM roles_gestiones rg
       JOIN gestiones g ON g.gestion_id = rg.gestion_id
       JOIN roles r ON r.rol_id = rg.rol_id
      WHERE g.slug = 'auditorias'
      ORDER BY rg.rol_id`,
  );
  console.log(`\n== Roles con la gestión «auditorias»: ${roles.length} ==`);
  for (const r of roles) {
    console.log(
      `  ${String(r.rol_id).padStart(3)}  ${(r.nombre_rol as string).padEnd(34)} [${r.category ?? "—"}]`,
    );
  }

  const usuarios = await ds.query(
    `SELECT u.nombre, u.cargo, r.nombre_rol
       FROM users u
       JOIN roles r ON r.rol_id = u.rol_id
       JOIN roles_gestiones rg ON rg.rol_id = r.rol_id
       JOIN gestiones g ON g.gestion_id = rg.gestion_id
      WHERE g.slug = 'auditorias' AND COALESCE(u.estado, true) = true
      ORDER BY r.nombre_rol, u.nombre`,
  );
  console.log(`\n== Personas activas que entran a Auditorías: ${usuarios.length} ==`);
  for (const u of usuarios) {
    console.log(`  ${(u.nombre as string).padEnd(26)} ${u.nombre_rol}`);
  }

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
