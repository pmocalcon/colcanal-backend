import * as fs from "fs";
import * as path from "path";
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { ThPrestamo } from "../entities/th-prestamo.entity";

/**
 * Llena `nombre_nomina` y `cuota_descontar` de `th_prestamos` desde las columnas BL y BM
 * de la hoja PRESTAMOS de «Prueba Nómina.xlsx».
 *
 *     npx ts-node src/database/scripts/import-prestamos-nomina.ts <ruta-json> [--dry-run]
 *
 * Por qué hacen falta esas dos columnas: la nómina **no descuenta `valor_cuota`**. El
 * Excel suma `CUOTA A DESCONTAR` (BM) buscando por `NOMBRE EN NÓMINA` (BL), y un
 * préstamo con BL vacío no se descuenta aunque tenga saldo y cuota. Es el mecanismo con
 * el que Contabilidad deja un préstamo quieto un mes. Sin estas columnas el servicio cae
 * al respaldo de sumar toda cuota con saldo > 0, que descuenta de más.
 *
 * La carga es un **reemplazo completo**: a cada préstamo que casa se le escriben las dos
 * columnas tal como vengan en el JSON, `null` incluido. Así, quitar un nombre en el
 * Excel efectivamente deja de descontar en el sistema.
 *
 * Las filas se casan por (nombre + valor del préstamo + mes de inicio + n° de cuotas),
 * no por posición: la hoja de origen de `th_prestamos` fue otra y el orden no es una
 * garantía. Lo que no case de forma única sale por consola y no se toca.
 */

interface FilaJson {
  filaExcel: number;
  estado: string;
  nombre: string;
  proyecto: string | null;
  mesInicio: string | null;
  numeroCuotas: number | null;
  valorPrestamo: number | null;
  valorCuota: number | null;
  nombreNomina: string | null;
  cuotaDescontar: number | null;
}

const clave = (nombre: string | null): string =>
  (nombre ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

/** Compara importes con tolerancia de un peso: la hoja guarda decimales y la columna redondea. */
const mismoImporte = (a: number | null, b: string | null): boolean => {
  if (a == null && (b == null || b === "")) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - Number(b)) < 1;
};

async function importar() {
  const jsonPath = path.resolve(process.argv[2] ?? "");
  const dryRun = process.argv.includes("--dry-run");

  if (!jsonPath || !fs.existsSync(jsonPath)) {
    console.error(`❌ No existe ${jsonPath || "(ruta vacía)"}`);
    console.error("\nUso: npx ts-node src/database/scripts/import-prestamos-nomina.ts <ruta-json> [--dry-run]");
    process.exit(1);
  }

  const { filas } = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as { filas: FilaJson[] };
  console.log(`📂 ${jsonPath}`);
  console.log(`   ${filas.length} filas en la hoja PRESTAMOS`);

  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();
  const repo = ds.getRepository(ThPrestamo);
  const prestamos = await repo.find();
  console.log(`   ${prestamos.length} préstamos en th_prestamos\n`);

  const usados = new Set<number>();
  const sinCasar: FilaJson[] = [];
  const ambiguas: FilaJson[] = [];
  const cambios: { prestamo: ThPrestamo; nombreNomina: string | null; cuotaDescontar: string | null }[] = [];

  for (const fila of filas) {
    const candidatos = prestamos.filter(
      (p) =>
        !usados.has(p.prestamoId) &&
        clave(p.nombre) === clave(fila.nombre) &&
        mismoImporte(fila.valorPrestamo, p.valorPrestamo) &&
        (fila.mesInicio ?? null) === (p.mesInicio ?? null) &&
        (fila.numeroCuotas ?? null) === (p.numeroCuotas ?? null),
    );
    if (candidatos.length === 0) { sinCasar.push(fila); continue; }
    if (candidatos.length > 1) { ambiguas.push(fila); continue; }

    const prestamo = candidatos[0];
    usados.add(prestamo.prestamoId);
    cambios.push({
      prestamo,
      nombreNomina: fila.nombreNomina,
      cuotaDescontar: fila.cuotaDescontar == null ? null : String(fila.cuotaDescontar),
    });
  }

  const conDescuento = cambios.filter((c) => c.nombreNomina && c.cuotaDescontar);
  const total = conDescuento.reduce((s, c) => s + Number(c.cuotaDescontar), 0);

  console.log(`✔ casan ${cambios.length} de ${filas.length}`);
  console.log(`   con descuento este periodo: ${conDescuento.length}`);
  console.log(`   total a descontar: ${total.toLocaleString("es-CO")}\n`);

  for (const c of conDescuento) {
    console.log(`   ${c.nombreNomina!.padEnd(34)} ${Number(c.cuotaDescontar).toLocaleString("es-CO").padStart(12)}   (${c.prestamo.nombre})`);
  }

  // Un préstamo con cuota pero sin nombre en nómina es la forma que tiene la hoja de
  // decir "este mes no se descuenta". Se avisa porque de otro modo parece un olvido.
  const quietos = filas.filter((f) => f.cuotaDescontar && !f.nombreNomina);
  if (quietos.length) {
    console.log("\n⚠ con cuota pero sin NOMBRE EN NÓMINA — la hoja no los descuenta:");
    for (const f of quietos) {
      console.log(`   fila ${f.filaExcel}  ${f.nombre}  ${f.cuotaDescontar!.toLocaleString("es-CO")}`);
    }
  }
  if (sinCasar.length) {
    console.log("\n⚠ no encontraron préstamo en la base (no se tocan):");
    for (const f of sinCasar) console.log(`   fila ${f.filaExcel}  ${f.nombre}  ${f.valorPrestamo}  ${f.mesInicio}`);
  }
  if (ambiguas.length) {
    console.log("\n⚠ casan con más de un préstamo (no se tocan):");
    for (const f of ambiguas) console.log(`   fila ${f.filaExcel}  ${f.nombre}  ${f.valorPrestamo}  ${f.mesInicio}`);
  }

  if (dryRun) {
    console.log("\n🔍 --dry-run: no se escribió nada.");
    await ds.destroy();
    return;
  }

  await ds.transaction(async (manager) => {
    for (const c of cambios) {
      await manager.update(ThPrestamo, c.prestamo.prestamoId, {
        nombreNomina: c.nombreNomina,
        cuotaDescontar: c.cuotaDescontar,
      });
    }
  });

  console.log(`\n✅ ${cambios.length} préstamos actualizados.`);
  await ds.destroy();
}

importar().catch((e) => { console.error(e); process.exit(1); });
