import * as fs from "fs";
import * as path from "path";
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

/**
 * Pone `th_prestamos` y `th_prestamo_pagos` al día con la hoja «Prestamos» de
 * «01. Informe general de préstamos.xlsx», que es la que lleva Contabilidad y la que la
 * empresa da por buena.
 *
 *     npx ts-node src/database/scripts/actualizar-prestamos-desde-hoja.ts <ruta-json>
 *     npx ts-node src/database/scripts/actualizar-prestamos-desde-hoja.ts <ruta-json> --aplicar
 *
 * **Sin `--aplicar` no escribe nada**: imprime el parte de lo que haría y sale. Es a
 * propósito, porque esto corre contra producción y mueve saldos de plata de gente.
 *
 * El JSON lo produce el volcado de la hoja (una fila por préstamo, con la retícula de
 * meses ya enderezada a filas). Se casa por el consecutivo `numero` de la hoja y no por
 * el nombre: en la base los nombres se guardaron en otro formato («Yamile Rodriguez»
 * frente a «RODRIGUEZ MARIN YAMILE») y hay dos préstamos de la misma persona.
 *
 * Qué se sincroniza y qué no:
 *
 * - Se escriben `valor_cancelado` y `saldo` **tal como los trae la hoja**, sin
 *   recalcularlos. Es la regla que ya traía la entidad: hay cruces con vacaciones y
 *   abonos anotados a mano, y recalcular cambiaría saldos que nadie decidió cambiar.
 * - Los meses de la retícula se sincronizan de verdad: se insertan los que faltan, se
 *   corrige el valor de los que cambiaron y se borran los que la hoja ya no tiene. Un
 *   mes que sobra en la base es plata que el sistema cree cobrada y la hoja no.
 * - `nombre_nomina` y `cuota_descontar` NO se tocan: no salen de este libro sino de la
 *   hoja de nómina, y pisarlas con null dejaría de descontar en la nómina del mes.
 */

interface PagoJson {
  anio: number;
  mes: number;
  valor: number;
}

interface FilaJson {
  fila: number;
  numero: number | null;
  nombre: string;
  estado: string | null;
  proyecto: string | null;
  pagare: string | null;
  mesInicio: string | null;
  numeroCuotas: number | null;
  fechaVencimiento: string | null;
  valorPrestamo: number | null;
  valorCuota: number | null;
  valorCancelado: number | null;
  saldo: number | null;
  obs: string | null;
  pagos: PagoJson[];
  sumaPagos: number;
}

/**
 * Meses que en la hoja van en una sola celda pero son dos pagos distintos.
 *
 * La retícula solo tiene una casilla por mes, así que un abono extraordinario queda
 * sumado a la cuota y solo se distingue por la observación escrita al lado. Acá se
 * separan, que es para lo que existen `tipo` y `medio`: así el saldo se puede explicar
 * sin tener que leer un texto.
 *
 * Clave: `numero de la hoja|año-mes`.
 */
const DESGLOSES: Record<string, { valor: number; tipo: string; medio: string; nota: string }[]> = {
  // Ana Milena Sánchez: la hoja pone 2.400.000 en agosto y anota «Abono en el mes de
  // agosto $1.800.000». La cuota pactada es de 600.000.
  "51|2026-8": [
    { valor: 600000, tipo: "CUOTA", medio: "NOMINA", nota: "Cuota pactada de agosto" },
    { valor: 1800000, tipo: "ABONO", medio: "NOMINA", nota: "Abono extraordinario de agosto" },
  ],
};

const plata = (n: number | null | undefined): string =>
  n == null ? "—" : n.toLocaleString("es-CO", { maximumFractionDigits: 0 });

/** Las filas de totales del pie de la hoja no son préstamos. */
const esTotal = (nombre: string): boolean =>
  /^(TOTAL|SALDO PENDIENTE)/i.test(nombre.trim());

const distinto = (a: string | null, b: number | null): boolean => {
  if (a == null && b == null) return false;
  if (a == null || b == null) return true;
  return Math.abs(Number(a) - b) > 1;
};

async function main() {
  const jsonPath = path.resolve(process.argv[2] ?? "");
  const aplicar = process.argv.includes("--aplicar");

  if (!jsonPath || !fs.existsSync(jsonPath)) {
    console.error(`❌ No existe ${jsonPath || "(ruta vacía)"}`);
    process.exit(1);
  }

  const filas = (JSON.parse(fs.readFileSync(jsonPath, "utf8")).filas as FilaJson[]).filter(
    (f) => !esTotal(f.nombre),
  );
  console.log(`📂 ${path.basename(jsonPath)} · ${filas.length} préstamos en la hoja`);
  console.log(aplicar ? "⚠️  MODO ESCRITURA\n" : "🔎 Simulación (sin --aplicar no escribe)\n");

  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();

  try {
    await ds.transaction(async (em) => {
      const prestamos: any[] = await em.query(
        `SELECT prestamo_id, numero, nombre, valor_cancelado, saldo FROM th_prestamos`,
      );
      const porNumero = new Map<number | null, any[]>();
      for (const p of prestamos) {
        const k = p.numero == null ? null : Number(p.numero);
        porNumero.set(k, [...(porNumero.get(k) ?? []), p]);
      }

      let cabeceras = 0;
      let insertados = 0;
      let corregidos = 0;
      let borrados = 0;
      const sinPareja: FilaJson[] = [];

      for (const f of filas) {
        const cand = porNumero.get(f.numero) ?? [];
        if (cand.length !== 1) {
          sinPareja.push(f);
          continue;
        }
        const p = cand[0];
        const id = Number(p.prestamo_id);

        // ── La cabecera: solo lo abonado y el saldo ──────────────────────────
        if (distinto(p.valor_cancelado, f.valorCancelado) || distinto(p.saldo, f.saldo)) {
          cabeceras++;
          console.log(
            `n°${String(f.numero ?? "-").padStart(3)} ${p.nombre.slice(0, 28).padEnd(28)} ` +
              `cancelado ${plata(Number(p.valor_cancelado))} → ${plata(f.valorCancelado)}  ·  ` +
              `saldo ${plata(Number(p.saldo))} → ${plata(f.saldo)}`,
          );
          if (aplicar) {
            await em.query(
              `UPDATE th_prestamos SET valor_cancelado = $1, saldo = $2, updated_at = now()
                WHERE prestamo_id = $3`,
              [f.valorCancelado, f.saldo, id],
            );
          }
        }

        // ── La retícula de meses ─────────────────────────────────────────────
        const enBase: any[] = await em.query(
          `SELECT pago_id, anio, mes, valor, tipo FROM th_prestamo_pagos WHERE prestamo_id = $1`,
          [id],
        );
        const clave = (a: number, m: number) => `${a}-${m}`;
        /*
         * Un mes puede venir repetido en la base: Carmen Cavadia tiene dos filas de
         * julio de 2026 con el mismo valor, que es el descuento de agosto guardado en
         * el mes de al lado. Por eso se agrupa en listas y no en un mapa de una sola
         * fila por mes: con un mapa, la fila sobrante desaparecía del cotejo y se
         * quedaba en la base sumando de más.
         */
        const mapaBase = new Map<string, any[]>();
        for (const x of enBase) {
          const k = clave(x.anio, x.mes);
          mapaBase.set(k, [...(mapaBase.get(k) ?? []), x]);
        }
        const mapaHoja = new Map(f.pagos.map((x) => [clave(x.anio, x.mes), x]));

        for (const [k, h] of mapaHoja) {
          // Un mes con desglose se reescribe entero: se quita lo que hubiera y se
          // ponen sus partes. Corregir «la fila del mes» no sirve cuando son dos.
          const desglose = DESGLOSES[`${f.numero}|${k}`];
          if (desglose) {
            const suma = desglose.reduce((t, d) => t + d.valor, 0);
            if (Math.abs(suma - h.valor) > 1) {
              throw new Error(
                `El desglose de ${f.numero}|${k} suma ${suma} y la hoja dice ${h.valor}`,
              );
            }
            // Si ya está desglosado, no se toca: el script tiene que poder correrse dos
            // veces sin borrar e insertar las mismas filas otra vez.
            const yaEsta = mapaBase.get(k) ?? [];
            const iguales =
              yaEsta.length === desglose.length &&
              desglose.every((d) =>
                yaEsta.some((b) => Math.abs(Number(b.valor) - d.valor) <= 1 && b.tipo === d.tipo),
              );
            if (iguales) continue;

            for (const b of yaEsta) {
              borrados++;
              console.log(
                `      − ${k} ${plata(Number(b.valor))}  (${p.nombre.slice(0, 24)}) · se reemplaza por el desglose`,
              );
              if (aplicar) {
                await em.query(`DELETE FROM th_prestamo_pagos WHERE pago_id = $1`, [b.pago_id]);
              }
            }
            for (const d of desglose) {
              insertados++;
              console.log(
                `      + ${k} ${plata(d.valor)} ${d.tipo}/${d.medio}  (${p.nombre.slice(0, 24)}) · ${d.nota}`,
              );
              if (aplicar) {
                await em.query(
                  `INSERT INTO th_prestamo_pagos (prestamo_id, anio, mes, valor, tipo, medio, observaciones)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                  [id, h.anio, h.mes, d.valor, d.tipo, d.medio, d.nota],
                );
              }
            }
            continue;
          }

          const [b, ...repetidas] = mapaBase.get(k) ?? [];
          for (const r of repetidas) {
            borrados++;
            console.log(
              `      − ${k} ${plata(Number(r.valor))}  (${p.nombre.slice(0, 24)}) · fila repetida del mismo mes`,
            );
            if (aplicar) {
              await em.query(`DELETE FROM th_prestamo_pagos WHERE pago_id = $1`, [r.pago_id]);
            }
          }
          if (!b) {
            insertados++;
            console.log(`      + ${k} ${plata(h.valor)}  (${p.nombre.slice(0, 24)})`);
            if (aplicar) {
              await em.query(
                `INSERT INTO th_prestamo_pagos (prestamo_id, anio, mes, valor, tipo, medio)
                 VALUES ($1, $2, $3, $4, 'CUOTA', 'NOMINA')`,
                [id, h.anio, h.mes, h.valor],
              );
            }
          } else if (Math.abs(Number(b.valor) - h.valor) > 1) {
            corregidos++;
            console.log(
              `      ~ ${k} ${plata(Number(b.valor))} → ${plata(h.valor)}  (${p.nombre.slice(0, 24)})`,
            );
            if (aplicar) {
              await em.query(`UPDATE th_prestamo_pagos SET valor = $1 WHERE pago_id = $2`, [
                h.valor,
                b.pago_id,
              ]);
            }
          }
        }

        for (const [k, filasMes] of mapaBase) {
          if (mapaHoja.has(k)) continue;
          for (const b of filasMes) {
            borrados++;
            console.log(
              `      − ${k} ${plata(Number(b.valor))}  (${p.nombre.slice(0, 24)}) · la hoja ya no lo tiene`,
            );
            if (aplicar) {
              await em.query(`DELETE FROM th_prestamo_pagos WHERE pago_id = $1`, [b.pago_id]);
            }
          }
        }
      }

      console.log("\n── Resumen ─────────────────────────────────");
      console.log(`   cabeceras (cancelado/saldo) : ${cabeceras}`);
      console.log(`   meses insertados            : ${insertados}`);
      console.log(`   meses corregidos            : ${corregidos}`);
      console.log(`   meses borrados              : ${borrados}`);
      if (sinPareja.length) {
        console.log(`   ⚠️ sin pareja en la base    : ${sinPareja.length}`);
        for (const f of sinPareja) {
          console.log(`      fila ${f.fila} n°${f.numero} ${f.nombre}`);
        }
      }

      if (!aplicar) {
        // La simulación corre dentro de la transacción y la deshace: así el parte sale
        // de las mismas consultas que escribirían de verdad, no de una copia paralela.
        throw new Error("__simulacion__");
      }
    });
    console.log("\n✅ Aplicado.");
  } catch (e: any) {
    if (e?.message === "__simulacion__") {
      console.log("\n🔎 Nada escrito. Para aplicarlo, repetir con --aplicar");
    } else {
      throw e;
    }
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
