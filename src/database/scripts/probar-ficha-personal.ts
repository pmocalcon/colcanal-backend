/* SOLO LECTURA: los campos nuevos de la ficha y los tres que se calculan. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { TalentoHumanoService } from "../../modules/talento-humano/talento-humano.service";
import { ThPersona } from "../entities/th-persona.entity";
import { ThIncapacidad } from "../entities/th-incapacidad.entity";
import { ThAusentismo } from "../entities/th-ausentismo.entity";
import { ThPrestamo } from "../entities/th-prestamo.entity";
import { ThPrestamoPago } from "../entities/th-prestamo-pago.entity";
import { ThHorasExtra } from "../entities/th-horas-extra.entity";
import { ThHorasExtraDetalle } from "../entities/th-horas-extra-detalle.entity";
import { ThVacacion } from "../entities/th-vacacion.entity";
import { ThParametroNomina } from "../entities/th-parametro-nomina.entity";
import { ThRetencionFicha } from "../entities/th-retencion-ficha.entity";
import { ThBanco } from "../entities/th-banco.entity";

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false } as any);
  await ds.initialize();
  const svc = new TalentoHumanoService(
    ds.getRepository(ThPersona), ds.getRepository(ThIncapacidad), ds.getRepository(ThAusentismo),
    ds.getRepository(ThPrestamo), ds.getRepository(ThPrestamoPago), ds.getRepository(ThHorasExtra),
    ds.getRepository(ThHorasExtraDetalle), ds.getRepository(ThVacacion),
    ds.getRepository(ThParametroNomina), ds.getRepository(ThRetencionFicha), ds.getRepository(ThBanco),
  );

  let malo = false;
  const revisar = (que: string, ok: boolean, detalle: string) => {
    console.log(`${ok ? "OK " : "MAL"}  ${que}: ${detalle}`);
    if (!ok) malo = true;
  };

  const anio = new Date().getFullYear();
  const todas = await svc.listPersonal();
  revisar("trae la base completa", todas.length > 0, `${todas.length} fichas`);
  revisar("todas traen los tres calculados",
    todas.every((p) => "edad" in p && "diasIncapacidad" in p && "diasPermiso" in p),
    "edad, diasIncapacidad, diasPermiso");

  // Contra la consulta cruda, que es la fuente.
  const crudoIncap = await ds.query(
    `SELECT identificacion, COALESCE(SUM(total_dias),0)::int AS dias
     FROM th_incapacidades WHERE extract(year from fecha_inicio) = $1
     GROUP BY 1 ORDER BY 2 DESC LIMIT 5`, [anio]);
  let cuadran = true;
  for (const f of crudoIncap) {
    const ficha = todas.find((p) => p.identificacion === f.identificacion);
    if (ficha && ficha.diasIncapacidad !== Number(f.dias)) {
      cuadran = false;
      console.log(`     descuadre: ${ficha.nombre} ficha ${ficha.diasIncapacidad} vs base ${f.dias}`);
    }
  }
  revisar(`días de incapacidad de ${anio}`, cuadran,
    crudoIncap.map((f: any) => `${f.identificacion}:${f.dias}`).join(" · ") || "sin datos");

  const crudoPerm = await ds.query(
    `SELECT identificacion,
            (COALESCE(SUM(dias_permiso),0) + COALESCE(SUM(horas_ausencia),0)/8.0) AS dias
     FROM th_ausentismos WHERE extract(year from fecha_inicio) = $1
     GROUP BY 1 ORDER BY 2 DESC LIMIT 5`, [anio]);
  let cuadranP = true;
  for (const f of crudoPerm) {
    const ficha = todas.find((p) => p.identificacion === f.identificacion);
    const esperado = Math.round(Number(f.dias) * 10) / 10;
    if (ficha && ficha.diasPermiso !== esperado) {
      cuadranP = false;
      console.log(`     descuadre: ${ficha.nombre} ficha ${ficha.diasPermiso} vs base ${esperado}`);
    }
  }
  revisar(`días de permiso de ${anio} (horas contadas como días de 8)`, cuadranP,
    crudoPerm.map((f: any) => `${f.identificacion}:${Math.round(Number(f.dias) * 10) / 10}`).join(" · ") || "sin datos");

  const conFecha = todas.filter((p) => p.fechaNacimiento);
  revisar("la edad sale de la fecha de nacimiento",
    conFecha.every((p) => typeof p.edad === "number" && p.edad! > 0 && p.edad! < 100),
    conFecha.length ? `${conFecha.length} con fecha` : "todavía nadie tiene fecha de nacimiento cargada");
  revisar("sin fecha de nacimiento, la edad va en nulo",
    todas.filter((p) => !p.fechaNacimiento).every((p) => p.edad === null),
    `${todas.filter((p) => !p.fechaNacimiento).length} sin fecha`);

  /*
   * La edad, de verdad: se le pone una fecha de nacimiento a una ficha, se lee y se
   * devuelve a nulo. Sin esto la comprobación de arriba no prueba nada mientras nadie
   * tenga la fecha cargada.
   */
  const cobaya = todas[0];
  const hoy = new Date();
  const yaCumplio = `${hoy.getFullYear() - 30}-01-01`;
  // Mañana, en hora local: `toISOString` habría devuelto el día en UTC, que en Colombia
  // es otro día y haría que la prueba comprobara algo distinto de lo que dice.
  const m = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
  const sinCumplir = `${hoy.getFullYear() - 30}-${String(m.getMonth() + 1).padStart(2, "0")}-${String(m.getDate()).padStart(2, "0")}`;
  try {
    await ds.query("UPDATE th_personal SET fecha_nacimiento = $1 WHERE persona_id = $2",
      [yaCumplio, cobaya.personaId]);
    const a = (await svc.listPersonal()).find((p) => p.personaId === cobaya.personaId);
    revisar("cumplido el año, la edad sube", a?.edad === 30, `${yaCumplio} -> ${a?.edad}`);

    await ds.query("UPDATE th_personal SET fecha_nacimiento = $1 WHERE persona_id = $2",
      [sinCumplir, cobaya.personaId]);
    const b = (await svc.listPersonal()).find((p) => p.personaId === cobaya.personaId);
    revisar("si aún no ha cumplido, le falta uno", b?.edad === 29, `${sinCumplir} -> ${b?.edad}`);

    // El día del cumpleaños ya cuenta: se cumplen años el mismo día, no al siguiente.
    const hoyMismo = `${hoy.getFullYear() - 40}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
    await ds.query("UPDATE th_personal SET fecha_nacimiento = $1 WHERE persona_id = $2",
      [hoyMismo, cobaya.personaId]);
    const c = (await svc.listPersonal()).find((p) => p.personaId === cobaya.personaId);
    revisar("el día del cumpleaños ya cuenta", c?.edad === 40, `${hoyMismo} -> ${c?.edad}`);
  } finally {
    await ds.query("UPDATE th_personal SET fecha_nacimiento = NULL WHERE persona_id = $1",
      [cobaya.personaId]);
    const vuelta = (await svc.listPersonal()).find((p) => p.personaId === cobaya.personaId);
    revisar("la ficha queda como estaba",
      vuelta?.fechaNacimiento == null && vuelta?.edad === null, cobaya.nombre);
  }

  console.log("     muestra:");
  for (const p of todas.filter((p) => (p.diasIncapacidad ?? 0) > 0 || (p.diasPermiso ?? 0) > 0).slice(0, 6)) {
    console.log(`       ${p.nombre}: incapacidad ${p.diasIncapacidad} d · permiso ${p.diasPermiso} d`);
  }

  await ds.destroy();
  console.log(malo ? "HAY ALGO MAL" : "TODO CUADRA");
  if (malo) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
