import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { ThPrestamo } from "../entities/th-prestamo.entity";
import { ThHorasExtra } from "../entities/th-horas-extra.entity";

/**
 * Vuelca `th_prestamos` y el conteo de planillas de horas extras, sin escribir nada.
 * Sirve para escoger con qué llave casar las filas contra el Excel antes de importar.
 *
 *     npx ts-node src/database/scripts/leer-prestamos-crudo.ts
 */
async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();

  const prestamos = await ds.getRepository(ThPrestamo).find({ order: { prestamoId: "ASC" } });
  console.log("===PRESTAMOS===");
  console.log(JSON.stringify(prestamos.map((p) => ({
    id: p.prestamoId, numero: p.numero, nombre: p.nombre, identificacion: p.identificacion,
    proyecto: p.proyecto, mesInicio: p.mesInicio, numeroCuotas: p.numeroCuotas,
    valorPrestamo: p.valorPrestamo, valorCuota: p.valorCuota, saldo: p.saldo,
    nombreNomina: p.nombreNomina, cuotaDescontar: p.cuotaDescontar,
  }))));

  const planillas = await ds.getRepository(ThHorasExtra).count();
  console.log("===HORAS-EXTRAS-COUNT===");
  console.log(planillas);
  await ds.destroy();
}

main().catch((e) => { console.error(e); process.exit(1); });
