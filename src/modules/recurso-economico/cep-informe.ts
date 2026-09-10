import { CepMesCalculado } from "./cep-calculo";
import { PAGADORES } from "./cep-conceptos";

/**
 * El Informe Financiero de Gestión Fiducia (GC-001-F), mes a mes.
 *
 * Es lo que se le entrega al municipio: los mismos hechos del CEP, pero contados como
 * un estado de cuenta —de qué saldo se partió, qué entró, qué salió, con qué se quedó y
 * qué le queda comprometido para el mes que viene—.
 *
 * **No tiene ni una cifra propia.** Cada renglón es una casilla del CEP o la suma de
 * otros renglones, así que no se guarda: se arma al pedirlo. Guardarlo sería tener dos
 * versiones de la misma plata y descubrir en la peor reunión posible que no coinciden.
 *
 * El orden y la sangría de los renglones son los del formato impreso. No es decoración:
 * el municipio lo compara contra el informe del mes pasado renglón por renglón, y mover
 * uno de sitio obliga a leerlo entero otra vez.
 */

export interface FilaInforme {
  clave: string;
  etiqueta: string;
  /** 0 son los grandes bloques; 1 y 2, sus desgloses. Es la sangría del impreso. */
  nivel: 0 | 1 | 2;
  /** true en los renglones que suman a los de abajo: se imprimen en negrilla. */
  total?: boolean;
  /** Un valor por periodo, en el mismo orden que `periodos`. */
  valores: number[];
}

export interface InformeFinanciero {
  periodos: string[];
  filas: FilaInforme[];
}

const sumar = (...listas: number[][]): number[] =>
  listas[0].map((_, i) => listas.reduce((s, l) => s + (l[i] ?? 0), 0));

const restar = (a: number[], b: number[]): number[] => a.map((v, i) => v - (b[i] ?? 0));

/**
 * Arma el informe de una serie de meses ya calculados.
 *
 * `saldoInicial` es el saldo de la fiducia del mes anterior al primero. En el arranque
 * sale del extracto; de ahí en adelante el informe encadena su propio saldo, que es lo
 * que hace que el estado de cuenta cierre consigo mismo.
 */
export function armarInformeFinanciero(
  meses: CepMesCalculado[],
  saldoInicial: number,
): InformeFinanciero {
  const periodos = meses.map((m) => m.periodo);
  const val = (f: (m: CepMesCalculado) => number): number[] => meses.map(f);

  // ── Ingresos ──
  const porPagador = PAGADORES.map((p) => ({
    clave: `ingreso.${p.clave}`,
    etiqueta: p.etiqueta,
    valores: val((m) => Number(m.capturado?.ingresos?.[p.clave]) || 0),
  }));
  const comercializadores = val((m) => m.totalIngresos);
  const rendimientos = val((m) => Number(m.capturado?.rendimientos) || 0);
  const ingresos = sumar(comercializadores, rendimientos);

  // ── Egresos ──
  const energia = val((m) => m.energia);
  const aomInv = val((m) => m.giros.caomCinv);
  const obras = val((m) => m.obras);
  const navideno = val((m) => m.navideno);
  const concesion = sumar(aomInv, obras, navideno);
  const interventoria = val((m) => m.interventoria);
  const gmf = val((m) => Number(m.capturado?.gmf) || 0);
  const comision = val((m) => Number(m.capturado?.comision) || 0);
  const gastosBancarios = sumar(gmf, comision);
  const otrosEgresos = val((m) => Number(m.capturado?.otrosEgresos) || 0);
  const egresos = sumar(energia, concesion, interventoria, gastosBancarios, otrosEgresos);

  /*
   * El saldo encadena: el de cada mes es el inicial del siguiente. Se hace en un bucle y
   * no con un `map` porque cada valor depende del anterior, y escribirlo como si no
   * dependiera es la forma más fácil de que un día deje de depender.
   */
  const saldoInicialMes: number[] = [];
  const saldoFiducia: number[] = [];
  let arrastre = saldoInicial;
  for (let i = 0; i < meses.length; i++) {
    saldoInicialMes.push(arrastre);
    arrastre = arrastre + ingresos[i] - egresos[i];
    saldoFiducia.push(arrastre);
  }

  // ── Lo que ya está comprometido para el mes siguiente ──
  const provComision = val((m) => m.pendienteComision);
  const provAomInv = val((m) => m.pendienteConcesion);
  const provObras = val((m) => Number(m.capturado?.pendienteObras) || 0);
  const provNavideno = val((m) => Number(m.capturado?.pendienteNavideno) || 0);
  const provConcesion = sumar(provAomInv, provObras, provNavideno);
  const provInterventoria = val((m) => Number(m.capturado?.pendienteInterventoria) || 0);
  const provisionados = sumar(provComision, provConcesion, provInterventoria);

  const recursosDelImpuesto = restar(saldoFiducia, provisionados);

  const filas: FilaInforme[] = [
    { clave: "saldoInicial", etiqueta: "Saldo inicial", nivel: 0, total: true, valores: saldoInicialMes },

    { clave: "ingresos", etiqueta: "Ingresos", nivel: 0, total: true, valores: ingresos },
    { clave: "ingresos.comercializadores", etiqueta: "Ingresos comercializadores", nivel: 1, total: true, valores: comercializadores },
    ...porPagador.map((p) => ({ ...p, nivel: 2 as const })),
    { clave: "ingresos.rendimientos", etiqueta: "Rendimientos financieros", nivel: 1, valores: rendimientos },

    { clave: "egresos", etiqueta: "Egresos", nivel: 0, total: true, valores: egresos },
    { clave: "egresos.energia", etiqueta: "Energía", nivel: 1, valores: energia },
    { clave: "egresos.concesion", etiqueta: "Concesión", nivel: 1, total: true, valores: concesion },
    { clave: "egresos.concesion.aomInv", etiqueta: "AOM-INV", nivel: 2, valores: aomInv },
    { clave: "egresos.concesion.obras", etiqueta: "Obras", nivel: 2, valores: obras },
    { clave: "egresos.concesion.navideno", etiqueta: "Navideño", nivel: 2, valores: navideno },
    { clave: "egresos.interventoria", etiqueta: "Interventoría", nivel: 1, valores: interventoria },
    { clave: "egresos.bancarios", etiqueta: "Gastos bancarios y de fiducia", nivel: 1, total: true, valores: gastosBancarios },
    { clave: "egresos.bancarios.gmf", etiqueta: "GMF", nivel: 2, valores: gmf },
    { clave: "egresos.bancarios.comision", etiqueta: "Comisión", nivel: 2, valores: comision },
    { clave: "egresos.otros", etiqueta: "Otros egresos", nivel: 1, valores: otrosEgresos },

    { clave: "saldoFiducia", etiqueta: "Saldo fiducia", nivel: 0, total: true, valores: saldoFiducia },

    { clave: "provisionados", etiqueta: "Pagos provisionados sig. mes", nivel: 0, total: true, valores: provisionados },
    { clave: "provisionados.comision", etiqueta: "Comisión", nivel: 1, valores: provComision },
    { clave: "provisionados.concesion", etiqueta: "Concesión", nivel: 1, total: true, valores: provConcesion },
    { clave: "provisionados.concesion.aomInv", etiqueta: "AOM-INV", nivel: 2, valores: provAomInv },
    { clave: "provisionados.concesion.obras", etiqueta: "Expansiones (Obras)", nivel: 2, valores: provObras },
    { clave: "provisionados.concesion.navideno", etiqueta: "Navideño", nivel: 2, valores: provNavideno },
    { clave: "provisionados.interventoria", etiqueta: "Interventoría", nivel: 1, valores: provInterventoria },

    { clave: "recursosDelImpuesto", etiqueta: "Recursos del impuesto", nivel: 0, total: true, valores: recursosDelImpuesto },
  ];

  return { periodos, filas };
}
