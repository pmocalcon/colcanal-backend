import { DataSource } from "typeorm";
import * as fs from "fs";
import { dataSourceOptions } from "../data-source";
import { ThPersona } from "../entities/th-persona.entity";
import { ThBanco } from "../entities/th-banco.entity";

/**
 * Carga banco, cuenta y nombre partido en la base de personal, desde la hoja «Banco» del
 * libro «Nómina Banco Formato.xlsm».
 *
 *     npx ts-node src/database/scripts/import-datos-bancarios.ts <archivo.json>
 *
 * El JSON lo produce `extraer_banco.py`, que ya tradujo los códigos del archivo plano a
 * nombres —CA a AHORROS, 51 a BANCO DAVIVIENDA— usando la hoja «COD Bancos».
 *
 * Se casa por **identificación**, no por nombre: el Excel escribe «ALEXANDER BECERRA» y
 * la base «BECERRA JOHN ALEXANDER», y casar por texto ahí es adivinar. Quien tenga varios
 * contratos —una cédula con varios `persona_id`— recibe el dato en todos: la cuenta es de
 * la persona, no del contrato.
 *
 * **El nombre partido se importa tal como está en el Excel** aunque no coincida con lo
 * que propondría el sistema. Esas son las columnas con las que el banco ya aceptó pagos;
 * cambiarlas por una regla más bonita sería arriesgar un rechazo por mejorar nada.
 *
 * No borra: lo que ya esté escrito en la ficha se respeta y se reporta como diferencia,
 * para que se decida a mano cuál vale.
 */

interface FilaBancaria {
  tipoId: string;
  identificacion: string;
  nombres: string;
  apellidos: string;
  banco: string | null;
  bancoCodigo: number | null;
  tipoCuenta: string | null;
  cuenta: string | null;
}

async function main() {
  const ruta = process.argv[2];
  if (!ruta) throw new Error("Falta la ruta del JSON");
  const filas: FilaBancaria[] = JSON.parse(fs.readFileSync(ruta, "utf-8"));

  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();
  const personaRepo = ds.getRepository(ThPersona);

  // El catálogo tiene que reconocer todos los bancos del archivo, o esas cuentas quedarían
  // cargadas pero sin poder salir en el archivo plano.
  const bancos = await ds.getRepository(ThBanco).find();
  const nombresCatalogo = new Set(bancos.map((b) => b.nombre.toUpperCase()));
  const sinCatalogo = [...new Set(
    filas.map((f) => f.banco).filter((b): b is string => !!b && !nombresCatalogo.has(b.toUpperCase())),
  )];
  if (sinCatalogo.length) {
    console.log("BANCOS QUE NO ESTÁN EN EL CATÁLOGO:", JSON.stringify(sinCatalogo));
  }

  const personas = await personaRepo.find();
  const porIdentificacion = new Map<string, ThPersona[]>();
  for (const p of personas) {
    const clave = (p.identificacion ?? "").trim();
    porIdentificacion.set(clave, [...(porIdentificacion.get(clave) ?? []), p]);
  }

  let actualizadas = 0;
  let contratos = 0;
  const sinPersona: string[] = [];
  const diferencias: string[] = [];
  const noCC: string[] = [];

  for (const f of filas) {
    const encontradas = porIdentificacion.get(f.identificacion.trim());
    if (!encontradas?.length) {
      sinPersona.push(`${f.identificacion} (${f.nombres} ${f.apellidos})`);
      continue;
    }
    if (f.tipoId !== "CC") noCC.push(`${f.nombres} ${f.apellidos}: ${f.tipoId}`);

    for (const p of encontradas) {
      // Se avisa antes de pisar: si la ficha ya dice otra cosa, alguien la escribió.
      if (p.cuenta && f.cuenta && p.cuenta.trim() !== f.cuenta.trim()) {
        diferencias.push(`${p.nombre}: ficha «${p.cuenta}» vs archivo «${f.cuenta}»`);
      }
      p.banco = f.banco ?? p.banco;
      p.cuenta = f.cuenta ?? p.cuenta;
      p.tipoCuenta = f.tipoCuenta ?? p.tipoCuenta;
      p.nombres = f.nombres || p.nombres;
      p.apellidos = f.apellidos || p.apellidos;
      p.tipoId = f.tipoId || p.tipoId;
      contratos += 1;
    }
    await personaRepo.save(encontradas);
    actualizadas += 1;
  }

  console.log(JSON.stringify({
    enArchivo: filas.length,
    personasActualizadas: actualizadas,
    contratosTocados: contratos,
    sinPersonaEnLaBase: sinPersona.length,
  }));
  if (sinPersona.length) console.log("SIN PERSONA:", JSON.stringify(sinPersona));
  if (diferencias.length) console.log("DIFERENCIAS:", JSON.stringify(diferencias));
  if (noCC.length) console.log("TIPO DE DOCUMENTO DISTINTO DE CC:", JSON.stringify(noCC));

  const resumen = await ds.query(`
    SELECT count(*) FILTER (WHERE banco IS NOT NULL)  AS con_banco,
           count(*) FILTER (WHERE cuenta IS NOT NULL) AS con_cuenta,
           count(*) FILTER (WHERE estado ILIKE 'ACTIVO%' AND cuenta IS NULL) AS activos_sin_cuenta,
           count(*) AS total
    FROM th_personal`);
  console.log("BASE:", JSON.stringify(resumen[0]));

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
