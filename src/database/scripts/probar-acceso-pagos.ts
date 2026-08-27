/**
 * Quién entra a Solicitudes de pago: solo quien hace el giro y el PMO.
 *
 *     npx ts-node src/database/scripts/probar-acceso-pagos.ts
 *
 * SOLO LECTURA. Pasa a los usuarios reales por el guard, uno por uno.
 */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { PagosAccesoGuard } from "../../modules/talento-humano/pagos-acceso.guard";
import { DESTINO_LIQUIDACION } from "../../modules/talento-humano/validacion-nomina.destino";
import { User } from "../entities/user.entity";

/** Un contexto de Nest de mentira: el guard solo mira `request.user.userId`. */
const contextoDe = (userId?: number) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ user: userId ? { userId } : undefined }) }) }) as any;

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false } as any);
  await ds.initialize();
  const guard = new PagosAccesoGuard(ds.getRepository(User));

  let malo = false;
  const revisar = (que: string, ok: boolean, detalle: string) => {
    console.log(`${ok ? "OK " : "MAL"}  ${que}: ${detalle}`);
    if (!ok) malo = true;
  };

  const usuarios = await ds.getRepository(User).find({ relations: ["role"], where: { estado: true } });
  const entran: string[] = [];
  const noEntran: string[] = [];

  for (const u of usuarios) {
    const rol = (u.role?.nombreRol ?? "").trim();
    let paso = false;
    try {
      paso = await guard.canActivate(contextoDe(u.userId));
    } catch {
      paso = false;
    }

    const esPmo = rol === "Analista PMO" || rol === "Director PMO";
    const esQuienPaga =
      rol === DESTINO_LIQUIDACION.rol &&
      (u.nombre ?? "").toLowerCase().includes(DESTINO_LIQUIDACION.nombreContiene);
    const deberia = esPmo || esQuienPaga;

    if (paso !== deberia) {
      malo = true;
      console.log(`  MAL  ${u.nombre} (${rol}): ${paso ? "entra" : "no entra"} y debería ${deberia ? "entrar" : "no entrar"}`);
    }
    (paso ? entran : noEntran).push(`${u.nombre} (${rol})`);
  }

  revisar("solo entran los que deben", !malo, `${entran.length} de ${usuarios.length} usuarios`);
  console.log("     entran:");
  for (const e of entran) console.log(`       ${e}`);

  // La otra usuaria del mismo rol no entra: es el punto de filtrar por nombre.
  const delRol = usuarios.filter((u) => (u.role?.nombreRol ?? "").trim() === DESTINO_LIQUIDACION.rol);
  const fuera = delRol.filter(
    (u) => !(u.nombre ?? "").toLowerCase().includes(DESTINO_LIQUIDACION.nombreContiene),
  );
  revisar(
    "el rol solo no basta",
    fuera.every((u) => !entran.some((e) => e.startsWith(u.nombre ?? ""))),
    fuera.map((u) => `${u.nombre} queda fuera`).join(" · ") || "no hay más usuarios en ese rol",
  );

  // Talento Humano entra al módulo pero no a esto.
  const th = usuarios.find((u) => (u.role?.nombreRol ?? "").trim() === "Coordinador Talento Humano");
  if (th) {
    revisar(
      "quien revisa la nómina no ve el archivo del banco",
      !entran.some((e) => e.startsWith(th.nombre ?? "")),
      `${th.nombre} (Coordinador Talento Humano) queda fuera`,
    );
  }

  let sinSesion = true;
  try {
    await guard.canActivate(contextoDe(undefined));
    sinSesion = false;
  } catch {
    sinSesion = true;
  }
  revisar("sin sesión no entra nadie", sinSesion, "pide iniciar sesión");

  await ds.destroy();
  console.log(malo ? "HAY ALGO MAL" : "TODO CUADRA");
  if (malo) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
