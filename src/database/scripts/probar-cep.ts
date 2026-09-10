/**
 * Las cuentas del Control de Excedentes, comprobadas contra un caso armado a mano.
 *
 *     npx ts-node src/database/scripts/probar-cep.ts
 *
 * No toca la base ni manda correos: `calcularSerieCep` y `armarInformeFinanciero` son
 * funciones puras, así que se les puede pedir cuenta sin levantar nada.
 *
 * Los números del caso son redondos y pequeños a propósito —cien de ingreso, treinta de
 * AOM— para que cada resultado se pueda verificar de cabeza. Un caso con las cifras
 * reales de un municipio prueba lo mismo y no deja revisar nada.
 *
 * Aparte de esto, las fórmulas se cotejaron una vez contra el archivo real de Guacarí:
 * veinte meses y veintinueve columnas derivadas, 543 de 580 celdas idénticas. Las 37
 * restantes son tres celdas que en el Excel están escritas a mano por encima de su propia
 * fórmula. @see el comentario de `pendienteComision` más abajo.
 */
import {
  calcularSerieCep,
  capturadoVacio,
  CepCapturado,
  GirosDelMes,
  TOLERANCIA_CONCILIACION,
} from "../../modules/recurso-economico/cep-calculo";
import { armarInformeFinanciero } from "../../modules/recurso-economico/cep-informe";

let malo = false;
const revisar = (que: string, ok: boolean, detalle: string) => {
  console.log(`${ok ? "OK " : "MAL"}  ${que}: ${detalle}`);
  if (!ok) malo = true;
};
/** Compara plata con la holgura de un centavo: el encadenado arrastra decimales. */
const igual = (a: number, b: number) => Math.abs(a - b) < 0.01;
const cifra = (a: number, b: number) => `${a.toFixed(2)} (esperado ${b.toFixed(2)})`;

const cap = (p: Partial<CepCapturado>): CepCapturado => ({ ...capturadoVacio(), ...p });
const sinGiros: GirosDelMes = {
  energiaMedicion: 0, interventoria: 0, obras: 0, navideno: 0, caomCinv: 0,
};

function main() {
  /*
   * Un mes con todo lleno. Cada cifra es distinta para que un campo que lea la casilla
   * equivocada salte: si `energiaAforo` y `gmf` valieran los dos 5, confundirlos no
   * cambiaría ningún total.
   */
  const enero = {
    periodo: "2026-01",
    capturado: cap({
      ingresos: { celsia: 600, vatia: 300, municipio: 100 },   // 1000
      energiaAforo: 40,
      caom: 300, cinv: 200,                                    // concesión 500
      comision: 12, gmf: 3, otrosEgresos: 5,
      interventoriaCausada: 50,
      pendienteEnergia: 1, pendienteInterventoria: 2,
      pendienteObras: 4, pendienteNavideno: 8, pendienteOtros: 16,
      rendimientos: 7,
      saldoFiducia: 0,
    }),
    giros: { energiaMedicion: 10, interventoria: 20, obras: 70, navideno: 30, caomCinv: 400 },
  };

  const serie = calcularSerieCep([enero]);
  const m = serie[0];

  revisar("total de ingresos = lo que consignó cada pagador",
    igual(m.totalIngresos, 1000), cifra(m.totalIngresos, 1000));
  revisar("energía = aforo + medición",
    igual(m.energia, 50), cifra(m.energia, 50));
  revisar("ingreso fiducia = ingresos - energía",
    igual(m.ingresoFiducia, 950), cifra(m.ingresoFiducia, 950));
  revisar("interventoría = lo causado + lo que respaldan las órdenes",
    igual(m.interventoria, 70), cifra(m.interventoria, 70));
  revisar("concesión = AOM + inversión",
    igual(m.concesion, 500), cifra(m.concesion, 500));

  // 50 energía + 70 interventoría + 500 concesión + 70 obras + 30 navideño + 12 + 3 + 5
  revisar("total de egresos suma los ocho costos",
    igual(m.totalEgresos, 740), cifra(m.totalEgresos, 740));

  revisar("otros giros de concesión = obras + navideño",
    igual(m.otrosGirosConcesion, 100), cifra(m.otrosGirosConcesion, 100));
  revisar("giro de la fiducia a la concesión = AOM-INV girado + obras + navideño",
    igual(m.giroFiduciaConcesion, 500), cifra(m.giroFiduciaConcesion, 500));

  // Causado 500+70+30=600 contra girado 500: quedan 100 en la fiducia.
  revisar("derechos del concesionario = lo causado menos lo girado",
    igual(m.derechosConcesionarioEnFiducia, 100), cifra(m.derechosConcesionarioEnFiducia, 100));

  revisar("saldo = ingresos - egresos + derechos",
    igual(m.saldo, 360), cifra(m.saldo, 360));

  // 70 interventoría + 500 giro + 12 comisión
  revisar("egresos cancelados = lo que de verdad salió de la fiducia",
    igual(m.egresosCancelados, 582), cifra(m.egresosCancelados, 582));

  /*
   * Pendientes: 1 energía + 2 interventoría + 500 concesión + 12 comisión + 4 obras
   * + 8 navideño + 16 otros = 543, menos 582 cancelados = -39.
   *
   * La comisión pendiente es la del propio mes, que es lo que dice la fórmula del
   * archivo (`AN = +Y`). En tres meses de 2026 esa celda está escrita a mano con la
   * comisión del mes anterior, y de ahí sale la única diferencia contra el Excel real.
   */
  revisar("total de egresos pendientes = lo causado pendiente menos lo cancelado",
    igual(m.totalEgresosPendientes, -39), cifra(m.totalEgresosPendientes, -39));
  revisar("la comisión pendiente es la del propio mes",
    igual(m.pendienteComision, 12), cifra(m.pendienteComision, 12));
  revisar("saldo final = saldo - egresos pendientes",
    igual(m.saldoFinal, 399), cifra(m.saldoFinal, 399));
  revisar("con saldo final acumulado positivo, el estado es excedente",
    m.estado === "Excedente", m.estado);
  revisar("recursos del impuesto = saldo final acumulado",
    igual(m.recursosDelImpuesto, m.saldoFinalAcumulado), cifra(m.recursosDelImpuesto, 399));
  revisar("saldo de recursos del impuesto = recursos + rendimientos acumulados",
    igual(m.saldoRecursosDelImpuesto, 406), cifra(m.saldoRecursosDelImpuesto, 406));

  // ── Los acumulados encadenan ───────────────────────────────────────────────
  const dos = calcularSerieCep([enero, { ...enero, periodo: "2026-02" }]);
  revisar("el acumulado del segundo mes es el del primero más el suyo",
    igual(dos[1].saldoAcumulado, dos[0].saldo * 2)
      && igual(dos[1].saldoFinalAcumulado, dos[0].saldoFinal * 2)
      && igual(dos[1].rendimientosAcumulados, 14),
    `saldo ${dos[1].saldoAcumulado}, final ${dos[1].saldoFinalAcumulado}, rend. 14`);

  const conArranque = calcularSerieCep([enero], {
    saldoAcumulado: 1000, egresosPendientesAcumulado: 500,
    saldoFinalAcumulado: -2000, rendimientosAcumulados: 300, saldoFiduciaAnterior: 50,
  });
  revisar("el arranque entra en los acumulados del primer mes",
    igual(conArranque[0].saldoAcumulado, 1360)
      && igual(conArranque[0].rendimientosAcumulados, 307),
    `saldo acumulado ${conArranque[0].saldoAcumulado} (esperado 1360)`);
  revisar("con acumulado negativo el estado es déficit",
    conArranque[0].estado === "Déficit",
    `saldo final acumulado ${conArranque[0].saldoFinalAcumulado.toFixed(2)}`);

  // ── Conciliación con el extracto ───────────────────────────────────────────
  const limpio = calcularSerieCep([
    { periodo: "2026-01", capturado: cap({ ingresos: { celsia: 100 }, saldoFiducia: 100 }), giros: sinGiros },
  ]);
  revisar("un mes que cuadra con el extracto queda conciliado",
    limpio[0].validacion === "Conciliado",
    `control ${limpio[0].control.toFixed(2)}`);

  const torcido = calcularSerieCep([
    { periodo: "2026-01", capturado: cap({ ingresos: { celsia: 100 }, saldoFiducia: 150 }), giros: sinGiros },
  ]);
  revisar("un extracto que no cuadra se manda a revisar",
    torcido[0].validacion === "Revisar" && igual(torcido[0].control, 50),
    `control ${torcido[0].control.toFixed(2)}, por encima de ${TOLERANCIA_CONCILIACION}`);

  const alFilo = calcularSerieCep([
    { periodo: "2026-01", capturado: cap({ ingresos: { celsia: 100 }, saldoFiducia: 101 }), giros: sinGiros },
  ]);
  revisar("un peso de diferencia todavía concilia",
    alFilo[0].validacion === "Conciliado",
    "la fiducia redondea al peso en cada movimiento");

  // ── El informe es el mismo hecho, contado como estado de cuenta ────────────
  const informe = armarInformeFinanciero(serie, 5000);
  const fila = (clave: string) => informe.filas.find((f) => f.clave === clave)!.valores[0];

  revisar("el informe arranca del saldo que le pasan",
    igual(fila("saldoInicial"), 5000), cifra(fila("saldoInicial"), 5000));
  revisar("ingresos del informe = comercializadores + rendimientos",
    igual(fila("ingresos"), 1007), cifra(fila("ingresos"), 1007));
  // 50 energía + 500 concesión girada + 70 interventoría + 15 bancarios + 5 otros
  revisar("egresos del informe = lo que salió de la fiducia",
    igual(fila("egresos"), 640), cifra(fila("egresos"), 640));
  revisar("saldo fiducia = inicial + ingresos - egresos",
    igual(fila("saldoFiducia"), 5367), cifra(fila("saldoFiducia"), 5367));
  revisar("recursos del impuesto = saldo - lo ya comprometido",
    igual(fila("recursosDelImpuesto"), fila("saldoFiducia") - fila("provisionados")),
    `${fila("saldoFiducia").toFixed(2)} - ${fila("provisionados").toFixed(2)}`);

  revisar("la concesión del informe se desglosa y suma",
    igual(fila("egresos.concesion"),
      fila("egresos.concesion.aomInv") + fila("egresos.concesion.obras") + fila("egresos.concesion.navideno")),
    `${fila("egresos.concesion").toFixed(2)}`);

  /*
   * En el archivo esta casilla siempre sale en cero, y no porque no haya comisión: la
   * fórmula busca «Comision» sin tilde contra una columna que se llama «Comisión», y el
   * emparejamiento falla en silencio. Acá suma, así que el informe del sistema muestra
   * una provisión mayor que la del Excel por el valor de la comisión del mes.
   */
  revisar("la comisión sí entra en los pagos provisionados",
    igual(fila("provisionados.comision"), 12) && fila("provisionados") > 0,
    `${fila("provisionados.comision").toFixed(2)} — en el Excel esta casilla sale en cero`);

  const encadenado = armarInformeFinanciero(dos, 5000);
  revisar("el saldo de un mes es el inicial del siguiente",
    igual(
      encadenado.filas.find((f) => f.clave === "saldoInicial")!.valores[1],
      encadenado.filas.find((f) => f.clave === "saldoFiducia")!.valores[0],
    ),
    "el estado de cuenta cierra consigo mismo");

  // ── Un mes en blanco no rompe la cadena ────────────────────────────────────
  const conHueco = calcularSerieCep([
    enero,
    { periodo: "2026-02", capturado: capturadoVacio(), giros: sinGiros },
  ]);
  revisar("un mes sin digitar deja los acumulados donde estaban",
    igual(conHueco[1].saldoAcumulado, conHueco[0].saldoAcumulado),
    "las casillas vacías valen cero, no rompen");

  console.log(malo ? "\nHay algo mal en las cuentas del CEP." : "\nLas cuentas del CEP están bien.");
  process.exit(malo ? 1 : 0);
}

main();
