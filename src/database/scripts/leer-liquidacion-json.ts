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
 * Vuelca la liquidación de un periodo como JSON, sin escribir nada en la base.
 *
 *     npx ts-node src/database/scripts/leer-liquidacion-json.ts 2026-07 1750905 249095
 *
 * Es la misma vista previa de la pantalla, en un formato que se puede cotejar contra el
 * Excel de nómina fila por fila.
 */
async function main() {
  const periodo = process.argv[2] ?? "2026-07";
  const smmlv = Number(process.argv[3] ?? 1750905);
  const auxTransporte = Number(process.argv[4] ?? 249095);

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

  const { generado, filas } = await service.getNomina(periodo, smmlv, auxTransporte);
  console.log("===JSON-START===");
  console.log(JSON.stringify({ periodo, smmlv, auxTransporte, generado, filas }));
  console.log("===JSON-END===");
  await ds.destroy();
}

main().catch((e) => { console.error(e); process.exit(1); });
