/**
 * Retención en la fuente sobre rentas de trabajo — Procedimiento 1 (Art. 383 E.T.).
 *
 * Traduce la hoja «Retencionindependiente2026.xls» de Accounter. La cadena es fija y
 * el orden importa, porque cada subtotal es la base del siguiente:
 *
 *   Total devengado
 *   − ingresos no constitutivos de renta (aportes obligatorios)   → Subtotal 1
 *   − deducciones (vivienda, dependientes, medicina prepagada)    → Subtotal 2
 *   − rentas exentas (pensiones voluntarias, AFC)                 → Subtotal 3
 *   − renta exenta del 25 %                                       → Subtotal 4
 *   con el tope del 40 % del Subtotal 1                           → base gravable
 *   base ÷ UVT → tabla marginal → retención
 *
 * Dos detalles de la hoja que no son obvios y que cambian el resultado:
 *
 * 1. **Se aproxima al múltiplo de mil**, no se trunca. La hoja lo hace en el Subtotal 1,
 *    en el tope del 40 %, en la renta exenta del 25 % y en la retención final. Sin eso
 *    las cifras no cuadran con las del contador aunque la fórmula sea correcta.
 * 2. **El tope del 40 % se aplica al conjunto** de deducciones y rentas exentas, no a
 *    cada renglón: se compara la suma contra el 40 % del Subtotal 1 y se resta la menor.
 *
 * De los ingresos no constitutivos solo entran los tres aportes obligatorios —pensión,
 * fondo de solidaridad y salud—, que son los que la hoja marca en amarillo. Los demás
 * renglones (ARL, aportes voluntarios a pensión obligatoria, otros) están en la hoja
 * pero se dejan por fuera a propósito: no se diligencian.
 */

/** Aproxima al múltiplo de mil más cercano, como toda la hoja del contador. */
export const milMasCercano = (v: number): number => Math.round(v / 1000) * 1000;

/**
 * Tabla del Art. 383 E.T., en UVT. Cada tramo cobra su tarifa marginal sobre el exceso
 * del piso, más el impuesto acumulado de los tramos anteriores.
 */
export const TABLA_ART_383: ReadonlyArray<{
  desde: number;
  hasta: number | null;
  tarifa: number;
  masUvt: number;
}> = [
  { desde: 0, hasta: 95, tarifa: 0, masUvt: 0 },
  { desde: 95, hasta: 150, tarifa: 0.19, masUvt: 0 },
  { desde: 150, hasta: 360, tarifa: 0.28, masUvt: 10 },
  { desde: 360, hasta: 640, tarifa: 0.33, masUvt: 69 },
  { desde: 640, hasta: 945, tarifa: 0.35, masUvt: 162 },
  { desde: 945, hasta: 2300, tarifa: 0.37, masUvt: 268 },
  { desde: 2300, hasta: null, tarifa: 0.39, masUvt: 770 },
];

/** Topes mensuales de la hoja, en UVT. */
export const TOPES_UVT = {
  /** Intereses de vivienda o leasing habitacional. */
  vivienda: 100,
  /** Pagos por dependientes. */
  dependientes: 32,
  /** Salud y medicina prepagada. */
  medicinaPrepagada: 16,
  /** Renta exenta del 25 %: 790 UVT al año. */
  rentaExenta25Anual: 790,
  /** Tope del conjunto de deducciones y rentas exentas: 1.340 UVT al año. */
  limite40Anual: 1340,
} as const;

/** Cómo se determina la deducción por intereses de vivienda de cada persona. */
export type ModoVivienda = "FIJO" | "PORCENTAJE";

/** Lo que la tabla de retenciones guarda de cada persona para el año. */
export interface FichaRetencion {
  /**
   * «Valor fijo» o «el 10 % del total devengado». La hoja lo anota al margen porque
   * cambia por persona: para unos es una cifra del certificado bancario y para otros
   * se liquida contra lo devengado del mes.
   */
  viviendaModo: ModoVivienda;
  /** El valor cuando el modo es FIJO. */
  viviendaValor: number;
  /** El porcentaje sobre el total devengado cuando el modo es PORCENTAJE (10 = 10 %). */
  viviendaPorcentaje: number;
  dependientes: number;
  medicinaPrepagada: number;
  pensionesVoluntarias: number;
  afc: number;
  /** Si es false, no se le practica retención y todo el cálculo se salta. */
  sujeto: boolean;
}

export const FICHA_RETENCION_VACIA = (): FichaRetencion => ({
  viviendaModo: "FIJO",
  viviendaValor: 0,
  viviendaPorcentaje: 0,
  dependientes: 0,
  medicinaPrepagada: 0,
  pensionesVoluntarias: 0,
  afc: 0,
  sujeto: true,
});

/** Lo que la nómina ya calculó y que la retención necesita como entrada. */
export interface BaseRetencion {
  totalDevengado: number;
  /** Aporte obligatorio a salud del trabajador. */
  salud: number;
  /** Aporte obligatorio a pensión del trabajador. */
  pension: number;
  /** Fondo de solidaridad pensional. */
  fsp: number;
}

/** El desglose completo, para poder mostrar en pantalla de dónde salió cada cifra. */
export interface DetalleRetencion {
  uvt: number;
  ingresos: number;
  ingresosNoConstitutivos: number;
  subtotal1: number;
  vivienda: number;
  dependientes: number;
  medicinaPrepagada: number;
  totalDeducciones: number;
  subtotal2: number;
  rentasExentas: number;
  subtotal3: number;
  rentaExenta25: number;
  subtotal4: number;
  /** Deducciones + rentas exentas del mes, antes de aplicar el tope. */
  deduccionesYExentas: number;
  /** El 40 % del Subtotal 1, ya aproximado. */
  limite40: number;
  /** Lo que efectivamente se restó: la menor entre las dos anteriores. */
  aplicado: number;
  baseGravable: number;
  baseUvt: number;
  /** Tarifa marginal del tramo en el que cayó. */
  tarifa: number;
  retencion: number;
}

const positivo = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);

/**
 * Calcula la retención del mes. Devuelve el desglose completo: la cifra suelta no le
 * sirve a nadie que tenga que explicársela al empleado o a la DIAN.
 */
export function calcularRetencion(
  base: BaseRetencion,
  ficha: FichaRetencion,
  uvt: number,
): DetalleRetencion {
  const vacio = (retencion: number): DetalleRetencion => ({
    uvt,
    ingresos: positivo(base.totalDevengado),
    ingresosNoConstitutivos: 0,
    subtotal1: 0,
    vivienda: 0,
    dependientes: 0,
    medicinaPrepagada: 0,
    totalDeducciones: 0,
    subtotal2: 0,
    rentasExentas: 0,
    subtotal3: 0,
    rentaExenta25: 0,
    subtotal4: 0,
    deduccionesYExentas: 0,
    limite40: 0,
    aplicado: 0,
    baseGravable: 0,
    baseUvt: 0,
    tarifa: 0,
    retencion,
  });

  if (!ficha.sujeto || !(uvt > 0)) return vacio(0);

  const ingresos = positivo(base.totalDevengado);

  // Ingresos no constitutivos de renta: solo los tres aportes obligatorios.
  const ingresosNoConstitutivos =
    positivo(base.pension) + positivo(base.fsp) + positivo(base.salud);
  const subtotal1 = milMasCercano(Math.max(0, ingresos - ingresosNoConstitutivos));

  // Deducciones, cada una con su tope mensual en UVT.
  const viviendaBruta =
    ficha.viviendaModo === "PORCENTAJE"
      ? ingresos * (positivo(ficha.viviendaPorcentaje) / 100)
      : positivo(ficha.viviendaValor);
  const vivienda = Math.min(viviendaBruta, TOPES_UVT.vivienda * uvt);
  const dependientes = Math.min(positivo(ficha.dependientes), TOPES_UVT.dependientes * uvt);
  const medicinaPrepagada = Math.min(
    positivo(ficha.medicinaPrepagada),
    TOPES_UVT.medicinaPrepagada * uvt,
  );
  const totalDeducciones = vivienda + dependientes + medicinaPrepagada;
  const subtotal2 = Math.max(0, subtotal1 - totalDeducciones);

  // Rentas exentas.
  const rentasExentas = positivo(ficha.pensionesVoluntarias) + positivo(ficha.afc);
  const subtotal3 = Math.max(0, subtotal2 - rentasExentas);

  // Renta de trabajo exenta del 25 %, con su tope anual repartido por mes.
  const rentaExenta25 = milMasCercano(
    Math.min(subtotal3 * 0.25, (TOPES_UVT.rentaExenta25Anual * uvt) / 12),
  );
  const subtotal4 = Math.max(0, subtotal3 - rentaExenta25);

  /*
   * El tope del 40 % va sobre el CONJUNTO de deducciones y rentas exentas, no sobre
   * cada renglón. Se compara la suma del mes contra el 40 % del Subtotal 1 —y contra
   * el tope anual de 1.340 UVT repartido por mes— y se resta la menor de las tres.
   */
  const deduccionesYExentas = totalDeducciones + rentasExentas + rentaExenta25;
  const limite40 = milMasCercano(
    Math.min(subtotal1 * 0.4, (TOPES_UVT.limite40Anual * uvt) / 12),
  );
  const aplicado = Math.min(deduccionesYExentas, limite40);

  const baseGravable = milMasCercano(Math.max(0, subtotal1 - aplicado));
  const baseUvt = baseGravable / uvt;

  const tramo =
    TABLA_ART_383.find((t) => baseUvt > t.desde && (t.hasta === null || baseUvt <= t.hasta)) ??
    TABLA_ART_383[0];
  const retencionUvt = (baseUvt - tramo.desde) * tramo.tarifa + tramo.masUvt;
  const retencion = milMasCercano(Math.max(0, retencionUvt * uvt));

  return {
    uvt,
    ingresos,
    ingresosNoConstitutivos,
    subtotal1,
    vivienda,
    dependientes,
    medicinaPrepagada,
    totalDeducciones,
    subtotal2,
    rentasExentas,
    subtotal3,
    rentaExenta25,
    subtotal4,
    deduccionesYExentas,
    limite40,
    aplicado,
    baseGravable,
    baseUvt,
    tarifa: tramo.tarifa,
    retencion,
  };
}
