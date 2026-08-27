/* SOLO LECTURA: comprueba que la nómina ya no liquida prestación de servicios. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { NominaService, esPrestacionDeServicios } from "../../modules/talento-humano/nomina.service";
import { ThPersona } from "../entities/th-persona.entity";
import { ThNovedadNomina } from "../entities/th-novedad-nomina.entity";
import { ThNominaLiquidacion } from "../entities/th-nomina-liquidacion.entity";
import { User } from "../entities/user.entity";
import { ThPrestamo } from "../entities/th-prestamo.entity";
import { ThPrestamoPago } from "../entities/th-prestamo-pago.entity";
import { ThIncapacidad } from "../entities/th-incapacidad.entity";
import { ThHorasExtra } from "../entities/th-horas-extra.entity";
import { ThHorasExtraDetalle } from "../entities/th-horas-extra-detalle.entity";
import { ThVacacion } from "../entities/th-vacacion.entity";
import { ThParametroNomina } from "../entities/th-parametro-nomina.entity";

async function main() {
  const periodo = process.argv[2] ?? "2026-08";
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false } as any);
  await ds.initialize();

  const svc = new NominaService(
    ds.getRepository(ThPersona),
    ds.getRepository(ThPrestamo),
    ds.getRepository(ThPrestamoPago),
    ds.getRepository(ThIncapacidad),
    ds.getRepository(ThHorasExtra),
    ds.getRepository(ThHorasExtraDetalle),
    ds.getRepository(ThVacacion),
    ds.getRepository(ThNovedadNomina),
    ds.getRepository(ThNominaLiquidacion),
    ds.getRepository(User),
  );

  let malo = false;
  const revisar = (que: string, ok: boolean, detalle: string) => {
    console.log(`${ok ? "OK " : "MAL"}  ${que}: ${detalle}`);
    if (!ok) malo = true;
  };

  // Unos casos escritos a mano: la base tiene las dos grafías.
  revisar("reconoce las dos grafías",
    esPrestacionDeServicios("PRESTACIÓN DE SERVICIO")
      && esPrestacionDeServicios("PRESTACION DE SERVICIOS")
      && esPrestacionDeServicios(" prestacion de servicio "),
    "con tilde, sin tilde, en plural y con espacios");
  revisar("no toca a los demás",
    !esPrestacionDeServicios("LABORAL INDEFINIDO")
      && !esPrestacionDeServicios(null)
      && !esPrestacionDeServicios("FIJO"),
    "indefinido, nulo y fijo siguen liquidándose");

  const activos = await ds.getRepository(ThPersona).find({ where: {} });
  const fuera = activos.filter(
    (p) => /^activo/i.test(p.estado ?? "") && esPrestacionDeServicios(p.tipoContrato),
  );
  console.log(`     salen de la nómina (${fuera.length}):`);
  for (const p of fuera) console.log(`       ${p.nombre} · ${p.cargo} · ${p.tipoContrato}`);

  const anio = Number(periodo.slice(0, 4));
  const par = await ds.getRepository(ThParametroNomina).findOne({ where: { anio } });
  const novedades = await svc.listNovedades(periodo, Number(par?.smmlv ?? 0));
  revisar("ninguno queda en Novedades",
    novedades.every((p) => !esPrestacionDeServicios(p.tipoContrato)),
    `${novedades.length} personas`);

  const { generado, filas } = await svc.getNomina(
    periodo, Number(par?.smmlv ?? 0), Number(par?.auxilioTransporte ?? 0),
  );
  const cedulasFuera = new Set(fuera.map((p) => p.identificacion));
  const colados = filas.filter((f) => cedulasFuera.has(f.identificacion));
  revisar(generado ? "el periodo YA está generado (se lee tal cual se pagó)" : "ninguno queda en la liquidación",
    generado || colados.length === 0,
    `${filas.length} filas · neto ${Math.round(filas.reduce((s, f) => s + f.netoPagar, 0)).toLocaleString("es-CO")}` +
      (generado ? " · guardadas, no recalculadas" : ""));

  await ds.destroy();
  console.log(malo ? "HAY ALGO MAL" : "TODO CUADRA");
  if (malo) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
