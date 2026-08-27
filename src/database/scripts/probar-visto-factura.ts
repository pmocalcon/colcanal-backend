/**
 * El visto bueno del director toca una sola factura y nada más.
 *
 * Escribe y deshace: al final deja el jsonb como estaba, así que se puede correr contra
 * la base de verdad.
 */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { RecursoEconomicoService } from "../../modules/recurso-economico/recurso-economico.service";
import { RecursoEconomico } from "../entities/recurso-economico.entity";
import { Company } from "../entities/company.entity";

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false } as any);
  await ds.initialize();
  const repo = ds.getRepository(RecursoEconomico);
  const svc = new RecursoEconomicoService(repo, ds.getRepository(Company));

  let malo = false;
  const revisar = (que: string, ok: boolean, detalle: string) => {
    console.log(`${ok ? "OK " : "MAL"}  ${que}: ${detalle}`);
    if (!ok) malo = true;
  };

  const original = JSON.parse(JSON.stringify((await repo.find())[0]?.data ?? {}));

  try {
    // Un municipio y un mes que ya existan, para no inventar datos.
    let facturas = (original.facturas ?? {}) as Record<string, Record<string, any>>;
    let periodo = Object.keys(facturas)[0];
    /*
     * Si todavía no hay ninguna factura diligenciada, se siembra una de mentira para
     * poder probar. El `finally` devuelve el jsonb como estaba, así que no queda nada.
     */
    if (!periodo) {
      const { empresas } = await svc.get();
      const primera = empresas[0];
      if (!primera) throw new Error("No hay empresas del cuadro contra las que probar");
      periodo = "2099-07";
      const fila = (await repo.find())[0];
      fila.data = {
        ...original,
        facturas: { [periodo]: { [String(primera.companyId)]: { aom: 1000, inversion: 500 } } },
      };
      await repo.save(fila);
      facturas = fila.data.facturas;
      console.log("     (no había facturas: se sembró una de prueba y se borra al final)");
    }
    const companyId = Number(Object.keys(facturas[periodo])[0]);
    console.log(`     probando con ${periodo} · empresa ${companyId}`);

    await svc.validarFactura(periodo, companyId, 12345, {
      nombre: "PRUEBA Director", rol: "Director de Proyecto Valle",
    });
    const conVisto = (await repo.find())[0].data;
    const v = conVisto.facturas[periodo][String(companyId)].visto;
    revisar("estampa el visto", v?.nombre === "PRUEBA Director" && v?.valor === 12345,
      JSON.stringify(v));
    revisar("el nombre lo pone el servidor", v?.rol === "Director de Proyecto Valle", v?.rol);

    // Lo demás del bloque tiene que haber quedado intacto.
    const base = (await repo.find())[0].data;
    const sinVistos = (d: any) => {
      const c = JSON.parse(JSON.stringify(d));
      for (const p of Object.keys(c.facturas ?? {})) {
        for (const e of Object.keys(c.facturas[p])) delete c.facturas[p][e].visto;
      }
      return JSON.stringify(c);
    };
    revisar("no toca nada más",
      sinVistos(conVisto) === sinVistos(base),
      "interventoría, retenciones y las demás facturas iguales");

    const otrosVistos = (d: any) => {
      const salida: string[] = [];
      for (const p of Object.keys(d.facturas ?? {})) {
        for (const e of Object.keys(d.facturas[p])) {
          if (p === periodo && Number(e) === companyId) continue;
          salida.push(`${p}/${e}:${JSON.stringify(d.facturas[p][e].visto ?? null)}`);
        }
      }
      return salida.join("|");
    };
    revisar("no pisa el visto de otras facturas",
      otrosVistos(conVisto) === otrosVistos(base), "los demás vistos, iguales");

    await svc.quitarVistoFactura(periodo, companyId);
    const sin = (await repo.find())[0].data;
    revisar("quitar el visto lo deja en nulo",
      sin.facturas[periodo][String(companyId)].visto === null, "visto = null");

    try {
      await svc.validarFactura("2099-01", companyId, 1, { nombre: "X" });
      revisar("un mes sin factura no pasa", false, "no falló, y tenía que fallar");
    } catch (e) {
      revisar("un mes sin factura no pasa", true, (e as Error).message.slice(0, 90));
    }
  } finally {
    // Devolver el jsonb tal como estaba.
    const fila = (await repo.find())[0];
    fila.data = original;
    await repo.save(fila);
    const vuelto = (await repo.find())[0].data;
    revisar("la base queda como estaba",
      JSON.stringify(vuelto) === JSON.stringify(original), "restaurado");
    await ds.destroy();
  }

  console.log(malo ? "HAY ALGO MAL" : "TODO CUADRA");
  if (malo) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
