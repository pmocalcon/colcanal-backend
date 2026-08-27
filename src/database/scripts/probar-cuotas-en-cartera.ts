/*
 * ESCRIBE Y DEVUELVE: comprueba que mandar la liquidación le anota a la cartera las
 * cuotas que la nómina descontó.
 *
 *     npx ts-node -r tsconfig-paths/register src/database/scripts/probar-cuotas-en-cartera.ts
 *
 * Trabaja sobre un periodo futuro que no existe —así no toca ninguna nómina de verdad— y
 * al final borra todo lo que creó y le devuelve a cada préstamo el saldo que tenía. Si se
 * cae a mitad de camino, lo dice y deja escrito qué hay que revertir a mano.
 */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { NominaService } from "../../modules/talento-humano/nomina.service";
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

const PERIODO = "2029-03";
const ANIO = 2029;
const MES = 3;
const cop = (v: number) => "$" + Math.round(v).toLocaleString("es-CO");

/** La liquidación no acepta nulos en sus cifras. Acá solo interesa `prestamo`; el resto va en cero. */
const EN_CERO = Object.fromEntries(
  [
    "salarioBasico", "devengadoBasico", "horasExtras", "recargoNocturno", "auxilioRodamiento",
    "bonificacion", "incapacidadEmpresa", "incapacidadEmpleado", "incapacidadOtros",
    "vacacionesHabiles", "vacacionesNoHabiles", "auxilioTransporte", "totalDevengado", "ibc",
    "salud", "pension", "fsp", "retencionFuente", "bonificacionDeduccion", "embargos",
    "serviciosGruporecordar", "totalDeduccion", "netoPagar",
  ].map((k) => [k, "0"]),
);
const num = (v: unknown) => Number(v ?? 0);

async function main() {
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

  const prestamoRepo = ds.getRepository(ThPrestamo);
  const pagoRepo = ds.getRepository(ThPrestamoPago);
  const liqRepo = ds.getRepository(ThNominaLiquidacion);

  let malo = false;
  const revisar = (que: string, ok: boolean, detalle: string) => {
    console.log(`${ok ? "OK " : "MAL"}  ${que}: ${detalle}`);
    if (!ok) malo = true;
  };

  // El periodo de prueba tiene que estar limpio: si no, lo que se mida no es lo que se hizo.
  const yaHabia = await liqRepo.count({ where: { periodo: PERIODO } });
  const pagosPrevios = await pagoRepo.count({ where: { anio: ANIO, mes: MES } });
  if (yaHabia > 0 || pagosPrevios > 0) {
    console.log(`El periodo ${PERIODO} no está limpio: ${yaHabia} filas y ${pagosPrevios} pagos. No se toca nada.`);
    await ds.destroy();
    process.exit(1);
  }

  // Cuatro préstamos de verdad con nombre en nómina y cuota a descontar.
  const candidatos = (await prestamoRepo.find())
    .filter((p) => p.nombreNomina && num(p.cuotaDescontar) > 0)
    .slice(0, 4);
  if (candidatos.length < 4) {
    console.log("No hay cuatro préstamos con cuota a descontar para la prueba.");
    await ds.destroy();
    process.exit(1);
  }
  const [a, b, c, d] = candidatos;
  const ids = candidatos.map((p) => p.prestamoId);
  const antes = new Map(
    candidatos.map((p) => [p.prestamoId, { saldo: num(p.saldo), cancelado: num(p.valorCancelado) }]),
  );

  /*
   * Las filas de la liquidación, como las dejaría generar la nómina.
   *
   * `c` sale dos veces con dos personaId distintos: es quien tiene contrato en dos
   * empresas del grupo, y así se guarda —la cuota completa repetida en sus dos filas—.
   * `d` sale con un descuento que no es el de su ficha: es el caso de la ficha cambiada
   * entre generar la nómina y mandarla.
   */
  const filas = [
    { personaId: 990001, prestamo: num(a.cuotaDescontar), nombre: a.nombreNomina as string },
    { personaId: 990002, prestamo: num(b.cuotaDescontar), nombre: b.nombreNomina as string },
    { personaId: 990003, prestamo: num(c.cuotaDescontar), nombre: c.nombreNomina as string },
    { personaId: 990004, prestamo: num(c.cuotaDescontar), nombre: c.nombreNomina as string },
    { personaId: 990005, prestamo: num(d.cuotaDescontar) + 12345, nombre: d.nombreNomina as string },
  ];

  const saldosDe = async () =>
    new Map(
      (await prestamoRepo.find()).filter((p) => ids.includes(p.prestamoId))
        .map((p) => [p.prestamoId, { saldo: num(p.saldo), cancelado: num(p.valorCancelado) }]),
    );

  const revertir = async () => {
    await pagoRepo.delete({ anio: ANIO, mes: MES, tipo: "CUOTA", medio: "NOMINA" });
    for (const [prestamoId, v] of antes) {
      await prestamoRepo.update(prestamoId, {
        saldo: String(v.saldo),
        valorCancelado: String(v.cancelado),
      });
    }
    await liqRepo.delete({ periodo: PERIODO });
  };

  try {
    await liqRepo.save(
      filas.map((f) =>
        liqRepo.create({
          periodo: PERIODO,
          personaId: f.personaId,
          identificacion: "T" + f.personaId,
          nombre: f.nombre,
          cargo: "PRUEBA",
          proyecto: "PRUEBA",
          multiEmpresa: false,
          diasTrabajados: 30,
          ...EN_CERO,
          prestamo: String(f.prestamo),
        }),
      ),
    );

    // ── Primera pasada ──
    const primera = await svc.registrarCuotasEnCartera(PERIODO);
    const esperado = num(a.cuotaDescontar) + num(b.cuotaDescontar) + num(c.cuotaDescontar);

    revisar("anota una cuota por préstamo", primera.creadas === 3, primera.creadas + " cuotas");
    revisar(
      "suma lo que la nómina descontó",
      Math.round(primera.total) === Math.round(esperado),
      cop(primera.total) + " contra " + cop(esperado),
    );
    revisar(
      "dos contratos de la misma cédula anotan la cuota una sola vez",
      (await pagoRepo.count({ where: { prestamoId: c.prestamoId, anio: ANIO, mes: MES } })) === 1,
      c.nombre,
    );
    revisar(
      "la ficha que cambió no se anota, se avisa",
      primera.avisos.length === 1
        && (await pagoRepo.count({ where: { prestamoId: d.prestamoId, anio: ANIO, mes: MES } })) === 0,
      primera.avisos[0] ?? "sin aviso",
    );

    const ahora = await saldosDe();
    const bajo = (p: ThPrestamo, cuota: number) => {
      const v = antes.get(p.prestamoId) as { saldo: number; cancelado: number };
      const h = ahora.get(p.prestamoId) as { saldo: number; cancelado: number };
      return Math.round(h.saldo) === Math.round(v.saldo - cuota)
        && Math.round(h.cancelado) === Math.round(v.cancelado + cuota);
    };
    revisar(
      "el saldo baja y lo cancelado sube, por cada préstamo anotado",
      bajo(a, num(a.cuotaDescontar)) && bajo(b, num(b.cuotaDescontar)) && bajo(c, num(c.cuotaDescontar)),
      [a.nombre, b.nombre, c.nombre].join(", "),
    );
    revisar(
      "el préstamo que no se anotó queda intacto",
      bajo(d, 0),
      d.nombre,
    );
    revisar(
      "la cuota anotada dice de dónde salió",
      (await pagoRepo.findOne({ where: { prestamoId: a.prestamoId, anio: ANIO, mes: MES } }))
        ?.observaciones === "Descontado en la nómina de " + PERIODO + ".",
      "observación de la fila",
    );

    // ── Segunda pasada: mandar dos veces no descuenta dos veces ──
    const segunda = await svc.registrarCuotasEnCartera(PERIODO);
    const despues = await saldosDe();
    revisar("volver a mandar no anota nada nuevo", segunda.creadas === 0, segunda.creadas + " cuotas");
    revisar("y reconoce las que ya estaban", segunda.yaEstaban === 3, segunda.yaEstaban + " préstamos");
    revisar(
      "los saldos quedan donde estaban",
      ids.every((id) => {
        const x = ahora.get(id) as { saldo: number };
        const y = despues.get(id) as { saldo: number };
        return Math.round(x.saldo) === Math.round(y.saldo);
      }),
      "ningún saldo se movió en la segunda pasada",
    );
    revisar(
      "no se duplicó ninguna fila",
      (await pagoRepo.count({ where: { anio: ANIO, mes: MES, tipo: "CUOTA", medio: "NOMINA" } })) === 3,
      "3 filas en total",
    );

    // ── Un periodo sin liquidación no inventa nada ──
    const sinNomina = await svc.registrarCuotasEnCartera("2029-04");
    revisar(
      "un periodo sin liquidación no anota nada y lo dice",
      sinNomina.creadas === 0 && sinNomina.avisos.length === 1,
      sinNomina.avisos[0] ?? "sin aviso",
    );
  } finally {
    await revertir();
  }

  // ── Que de verdad haya quedado como estaba ──
  const quedaron = await pagoRepo.count({ where: { anio: ANIO, mes: MES } });
  const finales = await saldosDe();
  const saldosIguales = ids.every((id) => {
    const v = antes.get(id) as { saldo: number; cancelado: number };
    const h = finales.get(id) as { saldo: number; cancelado: number };
    return Math.round(v.saldo) === Math.round(h.saldo)
      && Math.round(v.cancelado) === Math.round(h.cancelado);
  });
  revisar(
    "se devolvió todo",
    quedaron === 0 && saldosIguales && (await liqRepo.count({ where: { periodo: PERIODO } })) === 0,
    quedaron + " pagos de prueba, saldos " + (saldosIguales ? "iguales" : "DISTINTOS"),
  );

  await ds.destroy();
  console.log(malo ? "HAY ALGO MAL" : "TODO CUADRA");
  process.exit(malo ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  console.error("Si se cayó a mitad: borra los pagos CUOTA/NOMINA de " + ANIO + "-" + MES + " y las filas de " + PERIODO + ".");
  process.exit(1);
});
