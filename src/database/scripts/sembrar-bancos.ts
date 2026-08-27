import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { ThBanco } from "../entities/th-banco.entity";

/**
 * Siembra el catálogo de bancos con los códigos de la hoja «COD Bancos» del libro
 * «Nómina Banco Formato.xlsm».
 *
 *     npx ts-node src/database/scripts/sembrar-bancos.ts
 *
 * Es **idempotente y no destructivo**: inserta lo que falte y corrige el nombre de lo que
 * ya esté, pero no borra ninguna entidad que se haya agregado a mano después. Los códigos
 * son del banco pagador, no nuestros; esta lista es el punto de partida y de ahí en
 * adelante el catálogo se mantiene desde Parámetros.
 */

const BANCOS: Array<[number, string]> = [
  [1, "BANCO DE BOGOTA"],
  [2, "BANCO POPULAR"],
  [6, "BANCO CORPBANCA"],
  [7, "BANCOLOMBIA"],
  [9, "CITIBANK"],
  [12, "BANCO GNB SUDAMERIS"],
  [13, "BBVA COLOMBIA"],
  [14, "ITAU"],
  [19, "BANCO COLPATRIA"],
  [23, "BANCO DE OCCIDENTE"],
  [32, "BANCO CAJA SOCIAL"],
  [40, "BANCO AGRARIO"],
  [42, "BNP PARIBAS"],
  [51, "BANCO DAVIVIENDA S.A."],
  [52, "BANCO AV VILLAS"],
  [58, "BANCO PROCREDIT"],
  [60, "BANCO PICHINCHA S.A."],
  [61, "BANCOOMEVA"],
  [62, "BANCO FALABELLA S.A."],
  [63, "BANCO FINANDINA S.A."],
  [64, "BANCO MULTIBANK"],
  [65, "BANCO SANTANDER DE NEGOCIOS COLOMBIA S.A."],
  [66, "COOPCENTRAL"],
  [67, "BANCO COMPARTIR"],
  [90, "CORFICOLOMBIANA"],
  [121, "FINANCIERA JURIDISCOOP"],
  [283, "COOPERATIVA FINANCIERA DE ANTIOQUIA"],
  [289, "COTRAFA COOPERATIVA FINANCIERA"],
  [292, "CONFIAR S.A"],
  [370, "COLTEFINANCIERA"],
  [507, "NEQUI"],
];

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();
  const repo = ds.getRepository(ThBanco);

  let nuevos = 0;
  let corregidos = 0;
  for (const [codigo, nombre] of BANCOS) {
    const fila = await repo.findOne({ where: { codigo } });
    if (!fila) {
      await repo.save(repo.create({ codigo, nombre, activo: true }));
      nuevos += 1;
    } else if (fila.nombre !== nombre) {
      fila.nombre = nombre;
      await repo.save(fila);
      corregidos += 1;
    }
  }

  const total = await repo.count();
  console.log(JSON.stringify({ nuevos, corregidos, total }));
  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
