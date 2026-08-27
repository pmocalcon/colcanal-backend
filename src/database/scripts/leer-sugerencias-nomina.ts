import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { NominaService } from "../../modules/talento-humano/nomina.service";
import { ThPersona } from "../entities/th-persona.entity";
import { ThPrestamo } from "../entities/th-prestamo.entity";
import { ThPrestamoPago } from "../entities/th-prestamo-pago.entity";
import { ThIncapacidad } from "../entities/th-incapacidad.entity";
import { ThHorasExtra } from "../entities/th-horas-extra.entity";
import { ThHorasExtraDetalle } from "../entities/th-horas-extra-detalle.entity";
import { ThVacacion } from "../entities/th-vacacion.entity";
import { ThNovedadNomina } from "../entities/th-novedad-nomina.entity";
import { ThNominaLiquidacion } from "../entities/th-nomina-liquidacion.entity";
import { User } from "../entities/user.entity";

/**
 * Qué le aportan los formatos aprobados a la nómina de un periodo, sin escribir nada.
 *
 *     npx ts-node src/database/scripts/leer-sugerencias-nomina.ts [periodo] [smmlv]
 *     npx ts-node src/database/scripts/leer-sugerencias-nomina.ts 2026-07
 *
 * Sirve para revisar antes de liquidar: si a alguien no le aparece la incapacidad o las
 * horas extras que debería, el problema está en el formato —sin aprobar, con el periodo
 * escrito de otra forma, o a nombre de otra cédula— y no en la nómina.
 */
async function main() {
  const periodo = process.argv[2] ?? "2026-07";
  const smmlv = Number(process.argv[3] ?? 1750905);

  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();

  const service = new NominaService(
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

  const filas = await service.listNovedades(periodo, smmlv);
  const conAlgo = filas.filter((f) => f.sugerencias.origen.length > 0);

  console.log("===START===");
  console.log(`periodo ${periodo} · smmlv ${smmlv}`);
  console.log(`personas activas: ${filas.length}`);
  console.log(`con algo de un formato: ${conAlgo.length}\n`);
  for (const f of conAlgo) {
    const s = f.sugerencias;
    console.log(`${f.nombre} (${f.identificacion}) — ${f.empresaProyecto ?? "sin proyecto"}`);
    console.log(`   salario          ${f.salario}`);
    console.log(`   origen           ${s.origen.join(", ")}`);
    console.log(`   incap. empresa   ${s.incapacidadEmpresa}`);
    console.log(`   incap. empleado  ${s.incapacidadEmpleado}`);
    console.log(`   horas extras     ${s.horasExtrasValor}`);
    console.log(`   recargo nocturno ${s.recargoNocturnoValor}`);
    console.log(`   vacaciones       ${s.vacacionesHabiles}`);
  }
  console.log("===END===");
  await ds.destroy();
}

main().catch((e) => { console.error(e); process.exit(1); });
