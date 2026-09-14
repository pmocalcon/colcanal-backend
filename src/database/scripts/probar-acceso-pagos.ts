/* SOLO LECTURA — este script no escribe nada en la base. */
/**
 * Quién entra a Solicitudes de pago, contra los usuarios reales.
 *
 *     npx ts-node src/database/scripts/probar-acceso-pagos.ts
 *
 * Ahí está el archivo del portal bancario con la cuenta de cada empleado. Lo que importa
 * probar no es que entren las que tienen que entrar —eso se nota el primer día— sino que
 * **no entre nadie más**: un acceso de más no lo reporta nadie. Por eso se recorre la
 * base entera y se compara contra la lista exacta.
 */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { puedeEntrarAPagos } from "../../modules/talento-humano/pagos-acceso.guard";
import { elegirDestinatariosLiquidacion } from "../../modules/talento-humano/validacion-nomina.destino";

let malo = false;
const revisar = (que: string, ok: boolean, detalle: string) => {
  console.log(`${ok ? "OK " : "MAL"}  ${que}: ${detalle}`);
  if (!ok) malo = true;
};

async function main() {
  const ds = new DataSource({
    ...dataSourceOptions,
    synchronize: false,
    migrationsRun: false,
    cache: false,
  });
  await ds.initialize();

  try {
    const usuarios: { userId: number; nombre: string; rol: string | null; email: string | null }[] = await ds.query(
      `SELECT u.user_id AS "userId", u.nombre, r.nombre_rol AS rol,
              COALESCE(NULLIF(u.email_notificacion, ''), u.email) AS email
         FROM users u LEFT JOIN roles r ON r.rol_id = u.rol_id
        WHERE COALESCE(u.estado, true) = true
        ORDER BY u.nombre`,
    );

    const entran = usuarios.filter((u) => puedeEntrarAPagos(u.rol, u.nombre));
    const noPmo = entran.filter((u) => u.rol !== "Analista PMO" && u.rol !== "Director PMO");

    console.log(`\n== Entran a Solicitudes de pago: ${entran.length} de ${usuarios.length} activos ==`);
    for (const u of entran) console.log(`        ${u.nombre.padEnd(30)} ${u.rol}`);
    console.log("");

    const nombres = noPmo.map((u) => u.nombre).sort();
    revisar(
      "fuera del PMO entran exactamente Aurora y Yamileth",
      nombres.length === 2 &&
        nombres.some((n) => /aurora rivera/i.test(n)) &&
        nombres.some((n) => /yamileth osorio/i.test(n)),
      nombres.join(" · ") || "nadie",
    );

    // Las que se parecen y no deben entrar: la otra Coordinadora Financiera, y la otra
    // «Yamile», que es de PQRS Circasia.
    for (const patron of [/yohana tob/i, /yamile rodr/i]) {
      const u = usuarios.find((x) => patron.test(x.nombre));
      if (!u) continue;
      revisar(
        `${u.nombre} no entra`,
        !puedeEntrarAPagos(u.rol, u.nombre),
        `${u.rol}: se parece por rol o por nombre, y no es a quien se le dio`,
      );
    }

    // El área de Talento Humano no gana esta pantalla por ser del área: sigue siendo
    // más cerrada que el resto del módulo.
    const coordTh = usuarios.find((u) => u.rol === "Coordinador Talento Humano");
    if (coordTh) {
      revisar(
        "la Coordinación de Talento Humano sigue sin entrar",
        !puedeEntrarAPagos(coordTh.rol, coordTh.nombre),
        `${coordTh.nombre}: ser del área no abre las cuentas bancarias`,
      );
    }
    // ── El correo «Liquidación de nómina · lista para pago» ──
    const destinos = elegirDestinatariosLiquidacion(
      usuarios.map((u) => ({ ...u, role: { nombreRol: u.rol } })),
    );
    console.log(`\n== Reciben el aviso de la liquidación: ${destinos.length} ==`);
    for (const u of destinos) console.log(`        ${u.nombre.padEnd(30)} ${u.email ?? "SIN CORREO"}`);
    console.log("");
    const nombresDestino = destinos.map((u) => u.nombre).sort();
    revisar(
      "el aviso de la liquidación les llega a Yamileth y a Aurora, y a nadie más",
      nombresDestino.length === 2 &&
        nombresDestino.some((n) => /aurora rivera/i.test(n)) &&
        nombresDestino.some((n) => /yamileth osorio/i.test(n)),
      nombresDestino.join(" · ") || "nadie",
    );
    revisar(
      "las dos tienen a dónde mandárselo",
      destinos.every((u) => !!u.email),
      destinos.map((u) => u.email ?? "sin correo").join(" · "),
    );
    revisar(
      "quien recibe el aviso puede abrir la pantalla que el aviso le indica",
      destinos.every((u) => puedeEntrarAPagos(u.rol, u.nombre)),
      "el correo manda a Talento Humano → Solicitudes de pago",
    );
  } finally {
    await ds.destroy();
  }

  console.log(malo ? "\nHay algo mal en el acceso a pagos." : "\nEl acceso a pagos está bien.");
  process.exit(malo ? 1 : 0);
}

main().catch((e) => {
  console.error("MAL ", e.message);
  process.exit(1);
});
