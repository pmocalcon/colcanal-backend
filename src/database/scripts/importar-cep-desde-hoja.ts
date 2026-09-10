import * as fs from "fs";
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import {
  calcularSerieCep,
  capturadoVacio,
  CepCapturado,
  CepMesCalculado,
  GirosDelMes,
} from "../../modules/recurso-economico/cep-calculo";
import { CONCEPTO } from "../../modules/recurso-economico/cep-conceptos";

/**
 * Carga en la base el Control de Excedentes de un municipio, desde el volcado del Excel.
 *
 *     npx ts-node src/database/scripts/importar-cep-desde-hoja.ts <ruta-json>
 *     npx ts-node src/database/scripts/importar-cep-desde-hoja.ts <ruta-json> --aplicar
 *     npx ts-node ... <ruta-json> --municipio "Guacarí" --aplicar
 *
 * **Sin `--aplicar` no escribe nada**: imprime el parte de lo que haría y sale. Es a
 * propósito, porque esto corre contra producción y mueve saldos de plata de un municipio.
 *
 * El JSON lo produce `leer-cep-excel.py`. Antes de proponer nada, este script **rehace
 * las cuentas del CEP con lo capturado del volcado y las coteja contra las que trae el
 * propio Excel**. Si no coinciden, lo dice antes que nada: cargar cifras que el sistema
 * va a calcular distinto es peor que no cargarlas, porque el descuadre aparece meses
 * después y ya nadie se acuerda de dónde salió.
 *
 * Qué se sincroniza y qué no:
 *
 * - El **arranque** (mes de corte y los cinco saldos) se escribe siempre: es lo que hace
 *   que los acumulados del primer mes cargado empiecen donde el Excel los dejó.
 * - Los **meses** se crean o se actualizan. Solo se guarda lo capturado; ningún total,
 *   que el sistema los calcula al leer.
 * - Las **órdenes** del rango se borran y se vuelven a insertar. Es la única forma de que
 *   volver a correrlo no las duplique, y de que una orden borrada en el Excel también
 *   desaparezca acá. Las órdenes de meses anteriores al corte no se tocan.
 */

interface MesJson {
  periodo: string;
  capturado: CepCapturado;
  excel: Record<string, number>;
  estadoExcel: string | null;
}

interface OrdenJson {
  periodo: string;
  fecha: string | null;
  valor: number;
  concepto: string;
  tipo: string | null;
  numeroOrden: string | null;
  detalle: string | null;
  tercero: string | null;
}

interface VolcadoJson {
  archivo: string;
  codigo: string | null;
  municipio: string;
  desde: string;
  arranque: Record<string, number>;
  meses: MesJson[];
  ordenes: OrdenJson[];
  avisos: string[];
}

const normalizar = (s: string): string =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const pesos = (v: number): string =>
  v.toLocaleString("es-CO", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

const mesSiguiente = (periodo: string): string => {
  const [a, m] = periodo.split("-").map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
};

/** Los giros del mes, sumados de las órdenes igual que lo hace el servicio. */
function girosDe(ordenes: OrdenJson[], periodo: string): GirosDelMes {
  const suma = (p: string, concepto: string) =>
    ordenes.filter((o) => o.periodo === p && o.concepto === concepto)
           .reduce((s, o) => s + Number(o.valor ?? 0), 0);
  return {
    energiaMedicion: suma(periodo, CONCEPTO.ENERGIA_MEDICION),
    interventoria: suma(mesSiguiente(periodo), CONCEPTO.INTERVENTORIA),
    obras: suma(periodo, CONCEPTO.OBRA),
    navideno: suma(periodo, CONCEPTO.NAVIDENO),
    caomCinv: suma(periodo, CONCEPTO.CAOM_CINV),
  };
}

/**
 * Rehace el CEP con lo capturado y lo compara contra lo que calculó Excel.
 *
 * Una diferencia no siempre es un error del volcado: en el libro de Guacarí hay celdas
 * escritas a mano por encima de su propia fórmula, y ahí el que está mal es el Excel. Por
 * eso esto no aborta la carga —informa—, pero informa celda por celda para que quien la
 * corre decida con el libro delante.
 */
function cotejar(volcado: VolcadoJson): { iguales: number; distintas: string[] } {
  const serie = calcularSerieCep(
    volcado.meses.map((m) => ({
      periodo: m.periodo,
      capturado: { ...capturadoVacio(), ...m.capturado },
      giros: girosDe(volcado.ordenes, m.periodo),
    })),
    volcado.arranque as never,
  );

  let iguales = 0;
  const distintas: string[] = [];
  for (const calc of serie) {
    const esperado = volcado.meses.find((m) => m.periodo === calc.periodo)!.excel;
    for (const [campo, valorExcel] of Object.entries(esperado)) {
      const dado = Number((calc as unknown as Record<string, number>)[campo]);
      if (!Number.isFinite(dado)) continue;
      if (Math.abs(dado - valorExcel) <= 0.5) { iguales++; continue; }
      distintas.push(
        `    ${calc.periodo}  ${campo}: Excel ${pesos(valorExcel)} | sistema ${pesos(dado)} `
        + `| dif ${pesos(dado - valorExcel)}`,
      );
    }
  }
  return { iguales, distintas };
}

/** Si una tabla ya existe. La primera vez que se corre esto, todavía no. */
async function existeTabla(ds: DataSource, nombre: string): Promise<boolean> {
  const filas: { existe: boolean }[] = await ds.query(
    "SELECT to_regclass($1) IS NOT NULL AS existe",
    [`public.${nombre}`],
  );
  return !!filas[0]?.existe;
}

async function main() {
  const args = process.argv.slice(2);
  const ruta = args.find((a) => !a.startsWith("--"));
  const aplicar = args.includes("--aplicar");
  const iMunicipio = args.indexOf("--municipio");
  const municipioForzado = iMunicipio >= 0 ? args[iMunicipio + 1] : null;

  if (!ruta) {
    console.error("Falta la ruta del JSON que produce leer-cep-excel.py");
    process.exit(1);
  }

  const volcado: VolcadoJson = JSON.parse(fs.readFileSync(ruta, "utf8"));

  console.log(`Libro:     ${volcado.archivo}`);
  console.log(`Municipio: ${volcado.municipio} (${volcado.codigo ?? "sin código"})`);
  console.log(`Desde:     ${volcado.desde}`);
  console.log(`Meses:     ${volcado.meses.length}`);
  console.log(`Órdenes:   ${volcado.ordenes.length}`);

  if (volcado.avisos?.length) {
    console.log("\nAvisos del volcado:");
    for (const a of volcado.avisos) console.log(`  - ${a}`);
  }

  // ── Lo primero: ¿el sistema da lo mismo que el Excel? ──
  const { iguales, distintas } = cotejar(volcado);
  console.log(`\nCotejo con las cuentas del Excel: ${iguales} celdas iguales, ${distintas.length} distintas.`);
  if (distintas.length) {
    console.log("  Diferencias (las primeras 40):");
    for (const d of distintas.slice(0, 40)) console.log(d);
    console.log(
      "\n  Una diferencia no siempre es del volcado: en estos libros hay celdas escritas\n"
      + "  a mano por encima de su fórmula. Revísalas con el libro delante antes de aplicar.",
    );
  }

  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();
  try {
    // ── El municipio ──
    const buscado = normalizar(municipioForzado ?? volcado.municipio);
    const empresas: { company_id: number; name: string }[] = await ds.query(
      "SELECT company_id, name FROM companies",
    );
    const candidatas = empresas.filter(
      (e) => normalizar(e.name).includes(buscado) || buscado.includes(normalizar(e.name)),
    );
    if (candidatas.length !== 1) {
      console.error(
        `\nNo se pudo resolver «${municipioForzado ?? volcado.municipio}» a una sola empresa `
        + `(coincidieron ${candidatas.length}: ${candidatas.map((c) => c.name).join(", ") || "ninguna"}).`
        + "\nUsa --municipio \"<nombre exacto>\".",
      );
      process.exit(1);
    }
    const companyId = candidatas[0].company_id;
    console.log(`\nEmpresa:   ${candidatas[0].name} (companyId ${companyId})`);

    /*
     * Las dos tablas del CEP las crea TypeORM al arrancar el backend con este código.
     * La primera vez que se corre el ensayo todavía no existen, y eso no es un error:
     * es que nadie ha desplegado. Se informa y se sigue, para poder revisar el parte
     * antes del despliegue.
     */
    const tablasListas =
      (await existeTabla(ds, "cep_meses")) && (await existeTabla(ds, "cep_ordenes_pago"));
    if (!tablasListas) {
      console.log(
        "\nLas tablas cep_meses y cep_ordenes_pago todavía no existen: se crean solas\n"
        + "cuando el backend arranque con este código. El ensayo sigue como si estuvieran vacías.",
      );
    }

    // ── Qué hay hoy ──
    const yaHay: { periodo: string }[] = tablasListas
      ? await ds.query(
          "SELECT periodo FROM cep_meses WHERE company_id = $1 ORDER BY periodo",
          [companyId],
        )
      : [];
    const existentes = new Set(yaHay.map((m) => m.periodo));
    const nuevos = volcado.meses.filter((m) => !existentes.has(m.periodo));
    const pisados = volcado.meses.filter((m) => existentes.has(m.periodo));

    const ordenesHoy: { n: string }[] = tablasListas
      ? await ds.query(
          "SELECT COUNT(*)::text AS n FROM cep_ordenes_pago WHERE company_id = $1 AND periodo >= $2",
          [companyId, volcado.desde],
        )
      : [{ n: "0" }];

    console.log("\nLo que haría:");
    console.log(`  - Fijar el arranque en ${volcado.desde} con:`);
    for (const [k, v] of Object.entries(volcado.arranque)) {
      console.log(`      ${k.padEnd(28)} ${pesos(Number(v))}`);
    }
    console.log(`  - Crear ${nuevos.length} mes(es): ${nuevos.map((m) => m.periodo).join(", ") || "—"}`);
    console.log(`  - Pisar ${pisados.length} mes(es) que ya existen: ${pisados.map((m) => m.periodo).join(", ") || "—"}`);
    console.log(
      `  - Borrar las ${ordenesHoy[0].n} orden(es) desde ${volcado.desde} e insertar `
      + `${volcado.ordenes.length}`,
    );

    if (!aplicar) {
      console.log("\nEsto fue un ensayo. Para escribirlo de verdad, vuelve a correrlo con --aplicar.");
      return;
    }
    if (!tablasListas) {
      console.error(
        "\nNo se puede aplicar todavía: falta que el backend arranque una vez con este\n"
        + "código para que se creen cep_meses y cep_ordenes_pago.",
      );
      process.exit(1);
    }

    // ── Escribir, todo o nada ──
    await ds.transaction(async (trx) => {
      // El arranque vive en el jsonb del módulo, junto a la interventoría y las
      // retenciones: se configura una vez y no se vuelve a tocar.
      const filas: { recurso_id: number; data: Record<string, unknown> }[] = await trx.query(
        "SELECT recurso_id, data FROM recurso_economico ORDER BY recurso_id LIMIT 1",
      );
      const data = filas[0]?.data ?? {};
      const cepArranque = (data.cepArranque ?? {}) as Record<string, unknown>;
      cepArranque[String(companyId)] = { desde: volcado.desde, saldos: volcado.arranque };
      if (filas[0]) {
        await trx.query("UPDATE recurso_economico SET data = $1 WHERE recurso_id = $2", [
          JSON.stringify({ ...data, cepArranque }), filas[0].recurso_id,
        ]);
      } else {
        await trx.query("INSERT INTO recurso_economico (data) VALUES ($1)", [
          JSON.stringify({ cepArranque }),
        ]);
      }

      for (const mes of volcado.meses) {
        const capturado = { ...capturadoVacio(), ...mes.capturado };
        await trx.query(
          `INSERT INTO cep_meses (company_id, periodo, capturado)
           VALUES ($1, $2, $3)
           ON CONFLICT ON CONSTRAINT uq_cep_mes
           DO UPDATE SET capturado = EXCLUDED.capturado, updated_at = now()`,
          [companyId, mes.periodo, JSON.stringify(capturado)],
        );
      }

      await trx.query(
        "DELETE FROM cep_ordenes_pago WHERE company_id = $1 AND periodo >= $2",
        [companyId, volcado.desde],
      );
      for (const o of volcado.ordenes) {
        await trx.query(
          `INSERT INTO cep_ordenes_pago
             (company_id, periodo, fecha, valor, concepto, tipo, numero_orden, detalle, tercero)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            companyId, o.periodo, o.fecha ?? `${o.periodo}-01`, o.valor, o.concepto,
            o.tipo, o.numeroOrden, o.detalle, o.tercero,
          ],
        );
      }
    });

    console.log("\nCargado.");

    // ── Releer lo que quedó, que es lo único que prueba que quedó bien ──
    const guardados: { periodo: string; capturado: CepCapturado }[] = await ds.query(
      "SELECT periodo, capturado FROM cep_meses WHERE company_id = $1 AND periodo >= $2 ORDER BY periodo",
      [companyId, volcado.desde],
    );
    const ordenesLeidas: OrdenJson[] = await ds.query(
      `SELECT periodo, concepto, valor::float8 AS valor FROM cep_ordenes_pago
       WHERE company_id = $1 AND periodo >= $2`,
      [companyId, volcado.desde],
    );
    const serie: CepMesCalculado[] = calcularSerieCep(
      guardados.map((g) => ({
        periodo: g.periodo,
        capturado: { ...capturadoVacio(), ...g.capturado },
        giros: girosDe(ordenesLeidas, g.periodo),
      })),
      volcado.arranque as never,
    );
    const ultimo = serie[serie.length - 1];
    console.log(
      `\nEn la base quedaron ${guardados.length} mes(es) y ${ordenesLeidas.length} orden(es).`,
    );
    if (ultimo) {
      console.log(
        `Último mes (${ultimo.periodo}): recursos del impuesto ${pesos(ultimo.recursosDelImpuesto)}, `
        + `${ultimo.estado}, ${ultimo.validacion}.`,
      );
    }
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
