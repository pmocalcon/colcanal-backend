/* SOLO LECTURA: el prellenado de los formatos a partir de la cédula. */
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

  const [uno] = await ds.getRepository(ThPersona).find({ where: {}, take: 1 });
  const f = await svc.fichaParaFormato(uno.identificacion);
  revisar("encuentra por cédula", f?.identificacion === uno.identificacion, `${uno.nombre}`);
  revisar("parte el nombre en cuatro casillas",
    !!f && [f.primerApellido, f.primerNombre].every(Boolean),
    `«${f?.primerApellido}» «${f?.segundoApellido}» · «${f?.primerNombre}» «${f?.segundoNombre}»`);
  revisar("trae cargo y área", !!f && (!!f.cargo || !!f.area), `${f?.cargo} · ${f?.area}`);

  revisar("sin permiso, el salario no viaja", f?.salario === null, "salario en nulo");
  const conSalario = await svc.fichaParaFormato(uno.identificacion, true);
  revisar("con permiso, sí", conSalario?.salario != null, `${conSalario?.salario}`);

  revisar("una cédula que no existe no revienta",
    (await svc.fichaParaFormato("00000000000")) === null, "devuelve nulo");
  revisar("una cédula vacía tampoco",
    (await svc.fichaParaFormato("   ")) === null, "devuelve nulo");

  // Multi-contrato: una cédula con varias fichas devuelve una sola.
  const repetidas = await ds.query(
    `SELECT identificacion, count(*)::int AS fichas FROM th_personal
     GROUP BY 1 HAVING count(*) > 1 ORDER BY 2 DESC LIMIT 3`);
  for (const r of repetidas) {
    const varias = await ds.getRepository(ThPersona).find({ where: { identificacion: r.identificacion } });
    const elegida = await svc.fichaParaFormato(r.identificacion, true);
    const activas = varias.filter((p) => /^activo/i.test(p.estado ?? ""));
    const esperada = (activas.length ? activas : varias)
      .sort((a, b) => Number(b.salario ?? 0) - Number(a.salario ?? 0))[0];
    revisar(`${r.identificacion}: ${r.fichas} contratos -> uno solo`,
      elegida?.personaId === esperada.personaId,
      `${elegida?.nombre} · ${elegida?.cargo} · ${elegida?.salario}`);
  }

  /*
   * Un corte guardado al que le falta una palabra no es una corrección: es un dato roto.
   * En la base hay una docena así, de la importación bancaria.
   */
  const cortas = await ds.query(`
    SELECT identificacion, nombre, apellidos, nombres FROM th_personal
    WHERE apellidos IS NOT NULL AND apellidos <> ''
      AND array_length(regexp_split_to_array(btrim(nombre), '\\s+'), 1) >= 4
      AND array_length(regexp_split_to_array(btrim(apellidos), '\\s+'), 1) = 1
    ORDER BY nombre`);
  console.log(`     ${cortas.length} fichas con el corte incompleto en la base`);
  let rescatadas = 0;
  for (const c of cortas) {
    const g = await svc.fichaParaFormato(c.identificacion);
    const completo = [g?.primerApellido, g?.segundoApellido, g?.primerNombre, g?.segundoNombre]
      .filter(Boolean).join(" ");
    const palabras = (n: string) => n.trim().split(/\s+/).filter(Boolean).length;
    if (palabras(completo) === palabras(c.nombre)) rescatadas += 1;
    else console.log(`     se perdió algo: «${c.nombre}» -> «${completo}»`);
  }
  revisar("no se pierde ningún apellido por un corte roto",
    rescatadas === cortas.length,
    `${rescatadas} de ${cortas.length} se reparten completas`);
  if (cortas.length) {
    const ej = await svc.fichaParaFormato(cortas[0].identificacion);
    console.log(`     ej.: «${cortas[0].nombre}» guardado como «${cortas[0].apellidos}» -> ` +
      `«${ej?.primerApellido}» «${ej?.segundoApellido}» · «${ej?.primerNombre}» «${ej?.segundoNombre}»`);
  }

  // Los apellidos corregidos a mano mandan sobre el corte automático.
  const corregida = await ds.getRepository(ThPersona).findOne({ where: {}, order: { personaId: "ASC" } });
  const antes = {
    nombre: corregida!.nombre,
    nombres: corregida!.nombres,
    apellidos: corregida!.apellidos,
  };
  try {
    await ds.query(
      "UPDATE th_personal SET nombre = $1, apellidos = $2, nombres = $3 WHERE persona_id = $4",
      ["DE LA CRUZ MARIA JOSE", "DE LA CRUZ", "MARIA JOSE", corregida!.personaId]);
    const g = await svc.fichaParaFormato(corregida!.identificacion);
    revisar("respeta la corrección a mano y no parte «DE LA CRUZ»",
      g?.primerApellido === "DE" && g?.segundoApellido === "LA CRUZ"
        && g?.primerNombre === "MARIA" && g?.segundoNombre === "JOSE",
      `«${g?.primerApellido}» «${g?.segundoApellido}» · «${g?.primerNombre}» «${g?.segundoNombre}»`);
  } finally {
    await ds.query(
      "UPDATE th_personal SET nombre = $1, apellidos = $2, nombres = $3 WHERE persona_id = $4",
      [antes.nombre, antes.apellidos, antes.nombres, corregida!.personaId]);
    const v = await ds.getRepository(ThPersona).findOne({ where: { personaId: corregida!.personaId } });
    revisar("la ficha queda como estaba",
      v?.nombre === antes.nombre && v?.apellidos === antes.apellidos && v?.nombres === antes.nombres,
      corregida!.nombre);
  }

  // Y el guardián: un corte que no le corresponde a esa persona no se usa.
  const otra = await ds.getRepository(ThPersona).findOne({ where: {}, order: { personaId: "ASC" } });
  const g2 = { nombre: otra!.nombre, apellidos: otra!.apellidos, nombres: otra!.nombres };
  try {
    await ds.query("UPDATE th_personal SET apellidos = $1, nombres = $2 WHERE persona_id = $3",
      ["PEREZ", "JUAN", otra!.personaId]);
    const g = await svc.fichaParaFormato(otra!.identificacion);
    const armado = [g?.primerApellido, g?.segundoApellido, g?.primerNombre, g?.segundoNombre]
      .filter(Boolean).join(" ");
    revisar("un corte que no es de esa persona se descarta",
      !armado.includes("PEREZ") && !armado.includes("JUAN"),
      `guardado «PEREZ / JUAN» sobre «${otra!.nombre}» -> «${armado}»`);
  } finally {
    await ds.query("UPDATE th_personal SET apellidos = $1, nombres = $2 WHERE persona_id = $3",
      [g2.apellidos, g2.nombres, otra!.personaId]);
  }

  await ds.destroy();
  console.log(malo ? "HAY ALGO MAL" : "TODO CUADRA");
  if (malo) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
