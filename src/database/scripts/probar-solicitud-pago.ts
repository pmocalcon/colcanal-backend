import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { PagosService } from "../../modules/talento-humano/pagos.service";
import { NominaService } from "../../modules/talento-humano/nomina.service";
import { ThPersona } from "../entities/th-persona.entity";
import { ThParametroNomina } from "../entities/th-parametro-nomina.entity";
import { ThRetencionFicha } from "../entities/th-retencion-ficha.entity";
import { ThIncapacidad } from "../entities/th-incapacidad.entity";
import { ThPrestamo } from "../entities/th-prestamo.entity";
import { ThPrestamoPago } from "../entities/th-prestamo-pago.entity";
import { ThHorasExtra } from "../entities/th-horas-extra.entity";
import { ThHorasExtraDetalle } from "../entities/th-horas-extra-detalle.entity";
import { ThVacacion } from "../entities/th-vacacion.entity";
import { ThAusentismo } from "../entities/th-ausentismo.entity";
import { ThNovedadNomina } from "../entities/th-novedad-nomina.entity";
import { ThNominaLiquidacion } from "../entities/th-nomina-liquidacion.entity";
import { ThValidacionNomina } from "../entities/th-validacion-nomina.entity";
import { ThBanco } from "../entities/th-banco.entity";
import { ThSolicitudPago } from "../entities/th-solicitud-pago.entity";
import { ThSolicitudPagoLinea } from "../entities/th-solicitud-pago-linea.entity";
import { User } from "../entities/user.entity";

/**
 * Prueba de ida y vuelta de una solicitud de pago, sin dejar rastro.
 *
 *     npx ts-node src/database/scripts/probar-solicitud-pago.ts [periodo]
 *
 * Arma la solicitud desde la nómina del periodo, comprueba que el total cuadre con el
 * neto de la liquidación, mira cuántas líneas pueden salir en el archivo del banco y por
 * qué las demás no, y al final la borra. Si algo no cuadra lo dice y sale con error.
 */
async function main() {
  const periodo = process.argv[2] ?? "2026-07";

  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();

  const nomina = new NominaService(
    ds.getRepository(ThPersona), ds.getRepository(ThPrestamo), ds.getRepository(ThPrestamoPago),
    ds.getRepository(ThIncapacidad), ds.getRepository(ThHorasExtra), ds.getRepository(ThHorasExtraDetalle),
    ds.getRepository(ThVacacion), ds.getRepository(ThAusentismo), ds.getRepository(ThNovedadNomina), ds.getRepository(ThNominaLiquidacion),
    ds.getRepository(ThParametroNomina),
    ds.getRepository(ThRetencionFicha),
    ds.getRepository(User),
  );
  const pagos = new PagosService(
    ds.getRepository(ThSolicitudPago), ds.getRepository(ThSolicitudPagoLinea),
    ds.getRepository(ThBanco), ds.getRepository(ThPersona), ds.getRepository(ThParametroNomina),
    ds.getRepository(ThValidacionNomina), ds.getRepository(User), nomina,
  );

  const parametros = await ds.getRepository(ThParametroNomina).findOne({
    where: { anio: Number(periodo.slice(0, 4)) },
  });
  if (!parametros) throw new Error(`No hay parámetros para ${periodo.slice(0, 4)}`);

  const { filas } = await nomina.getNomina(
    periodo, Number(parametros.smmlv), Number(parametros.auxilioTransporte),
  );
  const conPago = filas.filter((f) => f.netoPagar > 0);
  const netoEsperado = Math.round(conPago.reduce((s, f) => s + Math.round(f.netoPagar), 0));

  const creada = await pagos.crear({ concepto: "Prueba", periodo });
  const id = creada.solicitud.solicitudId;
  let malo = false;
  const revisar = (que: string, ok: boolean, detalle: string) => {
    console.log(`${ok ? "OK " : "MAL"}  ${que}: ${detalle}`);
    if (!ok) malo = true;
  };

  try {
    revisar("líneas creadas", creada.lineas.length === conPago.length,
      `${creada.lineas.length} líneas vs ${conPago.length} con neto positivo (de ${filas.length} en nómina)`);
    revisar("total", Math.round(creada.total) === netoEsperado,
      `${Math.round(creada.total)} vs ${netoEsperado} de la liquidación`);

    const archivo = await pagos.archivoBanco(id);
    console.log(`     archivo del banco: ${archivo.filas.length} filas, ${archivo.excluidas.length} por fuera`);

    // Por qué quedan por fuera, agrupado: es lo que hay que ir a llenar en Personal.
    const motivos = new Map<string, number>();
    for (const e of archivo.excluidas) {
      for (const m of e.faltantes) motivos.set(m, (motivos.get(m) ?? 0) + 1);
    }
    console.log("     motivos:", JSON.stringify([...motivos.entries()].sort((a, b) => b[1] - a[1])));

    revisar("archivo + excluidas = líneas",
      archivo.filas.length + archivo.excluidas.length === creada.lineas.length,
      `${archivo.filas.length} + ${archivo.excluidas.length} = ${creada.lineas.length}`);

    // El corte del nombre, que es la parte que puede quedar mal en silencio.
    console.log("     muestra del nombre partido:");
    for (const l of creada.lineas.slice(0, 5)) {
      console.log(`       «${l.nombre}» -> apellidos «${l.apellidos}» / nombres «${l.nombres}»`);
    }

    // Con un banco y una cuenta puestos a mano, una línea que estaba incompleta tiene
    // que poder salir. Se escoge una a la que le falte algo: refrescar no toca las que ya
    // están completas, así que probarlo sobre una completa no probaría nada.
    const primera = creada.lineas.find((l) => l.faltantes.length > 0) ?? creada.lineas[0];
    const personaRepo = ds.getRepository(ThPersona);
    const persona = await personaRepo.findOne({ where: { personaId: primera.personaId! } });
    const respaldo = persona
      ? { banco: persona.banco, cuenta: persona.cuenta, tipoCuenta: persona.tipoCuenta }
      : null;
    if (persona) {
      await personaRepo.update(persona.personaId, {
        banco: "BANCOLOMBIA", cuenta: "01234567890", tipoCuenta: "AHORROS",
      });
      const refrescada = await pagos.refrescarDatosBancarios(id);
      const linea = refrescada.lineas.find((l) => l.lineaId === primera.lineaId)!;
      revisar("refrescar datos bancarios",
        linea.bancoCodigo === 7 && linea.cuenta === "01234567890" && linea.faltantes.length === 0,
        `código ${linea.bancoCodigo}, cuenta ${linea.cuenta}, faltantes ${JSON.stringify(linea.faltantes)}`);

      const archivo2 = await pagos.archivoBanco(id);
      const fila = archivo2.filas.find((f) => f.identificacion === primera.identificacion);
      revisar("la línea completa sale en el archivo",
        !!fila && fila.tipoProducto === "CA" && fila.tipoId === 1,
        fila ? JSON.stringify(fila) : "no salió");

      await personaRepo.update(persona.personaId, respaldo!);
    }
  } finally {
    await pagos.borrar(id);
    const quedan = await ds.getRepository(ThSolicitudPagoLinea).count({ where: { solicitudId: id } });
    revisar("borrado limpio", quedan === 0, `${quedan} líneas huérfanas`);
  }

  await ds.destroy();
  if (malo) process.exit(1);
  console.log("TODO CUADRA");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
