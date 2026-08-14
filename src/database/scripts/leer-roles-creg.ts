/* SOLO LECTURA — este script no escribe nada en la base. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/**
 * Qué roles existen alrededor de la dirección de proyecto y cómo está hoy el
 * módulo CREG: quién entra al módulo y quién tiene cada permiso de sub-módulo.
 */
async function main() {
  const ds = new DataSource({
    ...dataSourceOptions,
    synchronize: false,
    migrationsRun: false,
    cache: false,
  });
  await ds.initialize();

  const roles = await ds.query(
    `SELECT rol_id, nombre_rol, category
       FROM roles
      ORDER BY rol_id`,
  );
  console.log("\n== Roles ==");
  for (const r of roles) {
    console.log(
      `  ${String(r.rol_id).padStart(3)}  ${(r.nombre_rol as string).padEnd(34)} [${r.category ?? "—"}]`,
    );
  }

  console.log("\n== Gestión creg: quién entra al módulo ==");
  const gest = await ds.query(
    `SELECT rg.rol_id, r.nombre_rol
       FROM roles_gestiones rg
       JOIN gestiones g ON g.gestion_id = rg.gestion_id
       JOIN roles r ON r.rol_id = rg.rol_id
      WHERE g.slug = 'creg' ORDER BY rg.rol_id`,
  );
  for (const g of gest) {
    console.log(`  ${String(g.rol_id).padStart(3)}  ${g.nombre_rol}`);
  }

  console.log("\n== Permisos creg:* por rol ==");
  const perms = await ds.query(
    `SELECT p.nombre_permiso, rp.rol_id, r.nombre_rol
       FROM roles_permisos rp
       JOIN permisos p ON p.permiso_id = rp.permiso_id
       JOIN roles r ON r.rol_id = rp.rol_id
      WHERE p.nombre_permiso LIKE 'creg:%'
      ORDER BY p.nombre_permiso, rp.rol_id`,
  );
  const porPermiso = new Map<string, string[]>();
  for (const p of perms) {
    const lista = porPermiso.get(p.nombre_permiso) ?? [];
    lista.push(`${p.rol_id} ${p.nombre_rol}`);
    porPermiso.set(p.nombre_permiso, lista);
  }
  for (const [nombre, lista] of porPermiso) {
    console.log(`  ${nombre.padEnd(18)} → ${lista.join(" · ")}`);
  }

  console.log("\n== Permisos creg definidos ==");
  const todos = await ds.query(
    `SELECT nombre_permiso, descripcion FROM permisos
      WHERE nombre_permiso LIKE 'creg:%' ORDER BY nombre_permiso`,
  );
  for (const t of todos) {
    console.log(`  ${t.nombre_permiso.padEnd(18)} ${t.descripcion ?? ""}`);
  }

  console.log("\n== Usuarios de los roles de dirección de proyecto ==");
  const users = await ds.query(
    `SELECT u.rol_id, r.nombre_rol, u.nombre, u.cargo, u.estado
       FROM users u JOIN roles r ON r.rol_id = u.rol_id
      WHERE lower(r.nombre_rol) LIKE '%proyecto%'
      ORDER BY u.rol_id, u.nombre`,
  );
  for (const u of users) {
    console.log(
      `  rol ${String(u.rol_id).padStart(3)}  ${(u.nombre as string).padEnd(28)}`
      + ` ${u.cargo ?? ""}${u.estado === false ? "  (INACTIVO)" : ""}`,
    );
  }

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
