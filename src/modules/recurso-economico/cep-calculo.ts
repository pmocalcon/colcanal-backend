import { PAGADORES } from "./cep-conceptos";

/**
 * El Control de Excedentes (CEP), mes a mes y municipio por municipio.
 *
 * Responde una sola pregunta: **de la plata del impuesto de alumbrado que entró a la
 * fiducia, ¿cuánta sobra y cuánta falta?** El municipio recauda por medio de los
 * comercializadores de energía, la fiducia paga la concesión, la interventoría y sus
 * propios gastos, y lo que queda —o lo que falta— es el excedente del municipio.
 *
 * Es la traducción de las fórmulas de la hoja «CEP» del archivo
 * «01. Control de Excedentes». Se separó del servicio y no tiene una sola consulta a la
 * base a propósito: son veinticinco fórmulas encadenadas sobre plata de un municipio, y
 * tienen que poder comprobarse contra el archivo real sin levantar nada.
 *
 * **Los acumulados encadenan.** El saldo de agosto depende del de julio, que depende del
 * de junio. Por eso no existe «calcular un mes suelto»: se calcula la serie completa
 * desde un arranque, y quien pida un mes recibe el mes de esa serie. Calcular uno solo
 * con el acumulado guardado del anterior parece más barato hasta que alguien corrige
 * mayo y junio queda mintiendo en silencio.
 */

/** Lo que se digita del extracto de la fiducia. Nada de esto se puede deducir. */
export interface CepCapturado {
  /** Recaudo bruto del mes, por pagador. La clave es la de PAGADORES. */
  ingresos: Record<string, number>;

  // ── Costos de la prestación del servicio ──
  /** Energía facturada por aforo (la que no tiene medidor). */
  energiaAforo: number;
  /** AOM causado del mes: lo que la concesión factura por operar y mantener. */
  caom: number;
  /** Inversión causada del mes. */
  cinv: number;
  /** Comisión fiduciaria. */
  comision: number;
  /** Gravamen a los movimientos financieros (el 4x1000). */
  gmf: number;
  /** Lo que no cabe en ninguna otra casilla. */
  otrosEgresos: number;
  /**
   * Interventoría causada del mes.
   *
   * Va capturada y no traída de Parámetros porque Parámetros dice cuánto vale el
   * contrato del año y esto es lo que la fiducia registró ese mes, que no siempre
   * coinciden: hay meses con dos interventorías y meses sin ninguna. La pantalla
   * sugiere el valor de Parámetros; la cifra sigue siendo de quien concilia.
   */
  interventoriaCausada: number;

  // ── Egresos pendientes: lo causado que todavía no ha salido de la fiducia ──
  pendienteEnergia: number;
  pendienteInterventoria: number;
  pendienteObras: number;
  pendienteNavideno: number;
  pendienteOtros: number;

  // ── Fiducia ──
  /** Rendimientos financieros del mes. */
  rendimientos: number;
  /** Saldo que reporta el extracto al cierre. Es el dato contra el que se concilia. */
  saldoFiducia: number;
}

/** Lo que las órdenes de pago del mes dicen que salió, sumado por concepto. */
export interface GirosDelMes {
  energiaMedicion: number;
  /**
   * Interventoría girada.
   *
   * Se toma de las órdenes imputadas al **mes siguiente**, que es como lo hace el
   * archivo. No es un error suyo: la interventoría de un mes se paga al mes siguiente y
   * la orden se imputa al mes en que se gira, así que el costo de agosto lo respalda la
   * orden de septiembre.
   */
  interventoria: number;
  obras: number;
  navideno: number;
  caomCinv: number;
}

/** De dónde arranca la serie. En el primer mes cargado son los saldos del Excel. */
export interface ArranqueCep {
  saldoAcumulado: number;
  egresosPendientesAcumulado: number;
  saldoFinalAcumulado: number;
  rendimientosAcumulados: number;
  /** El saldo del extracto del mes anterior al primero: lo usa la validación. */
  saldoFiduciaAnterior: number;
}

export const ARRANQUE_EN_CERO: ArranqueCep = {
  saldoAcumulado: 0,
  egresosPendientesAcumulado: 0,
  saldoFinalAcumulado: 0,
  rendimientosAcumulados: 0,
  saldoFiduciaAnterior: 0,
};

export interface CepMesCalculado {
  periodo: string;
  capturado: CepCapturado;
  giros: GirosDelMes;

  // Ingresos
  totalIngresos: number;
  ingresoFiducia: number;

  // Costos
  energia: number;
  interventoria: number;
  concesion: number;
  obras: number;
  navideno: number;
  totalEgresos: number;

  // Giros de la concesión
  otrosGirosConcesion: number;
  giroFiduciaConcesion: number;
  derechosConcesionarioEnFiducia: number;

  saldo: number;
  saldoAcumulado: number;

  // Egresos pendientes
  pendienteCaom: number;
  pendienteCinv: number;
  pendienteConcesion: number;
  pendienteComision: number;
  egresosCancelados: number;
  totalEgresosPendientes: number;
  egresosPendientesAcumulado: number;

  saldoFinal: number;
  saldoFinalAcumulado: number;
  estado: EstadoCep;

  // Excedentes y rendimientos
  recursosDelImpuesto: number;
  rendimientosAcumulados: number;
  saldoRecursosDelImpuesto: number;

  // Conciliación con la fiducia
  saldoFiducia: number;
  saldoFiduciaValidado: number;
  control: number;
  validacion: ValidacionCep;
}

export type EstadoCep = "Excedente" | "Déficit" | "En cero";
export type ValidacionCep = "Conciliado" | "Revisar";

/**
 * Cuánto puede diferir el saldo del extracto del que se calcula sin que sea un problema.
 *
 * Un peso. Sale del archivo, y no es una tolerancia generosa sino la mínima que existe:
 * la fiducia redondea al peso en cada movimiento y el CEP arrastra centavos, así que un
 * mes limpio difiere en céntimos. Cualquier cosa por encima de un peso es un movimiento
 * que a alguien se le quedó sin registrar, y por eso se manda a revisar.
 */
export const TOLERANCIA_CONCILIACION = 1;

/** Lo que no es un número finito vale cero: una casilla en blanco no rompe la cadena. */
const n = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** El recaudo bruto del mes: la suma de lo que consignó cada pagador. */
export const totalIngresosDe = (ingresos: Record<string, number>): number =>
  PAGADORES.reduce((s, p) => s + n(ingresos?.[p.clave]), 0);

/**
 * Calcula la serie completa, en orden de periodo.
 *
 * Devuelve un mes por cada entrada recibida. Los meses tienen que llegar ordenados y sin
 * huecos: un hueco no rompe el cálculo pero corre el acumulado un mes, y eso no se ve.
 * Quien llama es el que sabe qué meses existen, así que es quien tiene que ordenarlos.
 */
export function calcularSerieCep(
  meses: { periodo: string; capturado: CepCapturado; giros: GirosDelMes }[],
  arranque: ArranqueCep = ARRANQUE_EN_CERO,
): CepMesCalculado[] {
  const salida: CepMesCalculado[] = [];

  let saldoAcumulado = n(arranque.saldoAcumulado);
  let egresosPendientesAcumulado = n(arranque.egresosPendientesAcumulado);
  let saldoFinalAcumulado = n(arranque.saldoFinalAcumulado);
  let rendimientosAcumulados = n(arranque.rendimientosAcumulados);
  let saldoFiduciaAnterior = n(arranque.saldoFiduciaAnterior);

  for (const mes of meses) {
    const c = mes.capturado;
    const g = mes.giros;

    const totalIngresos = totalIngresosDe(c.ingresos);
    const energia = n(c.energiaAforo) + n(g.energiaMedicion);
    const ingresoFiducia = totalIngresos - energia;

    // La interventoría del costo es lo causado más lo que las órdenes respaldan.
    const interventoria = n(g.interventoria) + n(c.interventoriaCausada);

    // La concesión causada del mes: AOM más inversión.
    const concesion = n(c.caom) + n(c.cinv);
    const obras = n(g.obras);
    const navideno = n(g.navideno);

    const totalEgresos =
      energia + interventoria + concesion + obras + navideno
      + n(c.comision) + n(c.gmf) + n(c.otrosEgresos);

    const otrosGirosConcesion = obras + navideno;
    const giroFiduciaConcesion = n(g.caomCinv) + otrosGirosConcesion;

    /*
     * Lo que la fiducia le debe al concesionario: lo que se le causó menos lo que se le
     * giró. Puede salir negativo, y entonces significa lo contrario —se le giró de más—,
     * que es lo que pasa el mes en que se pagan dos facturas juntas.
     */
    const derechosConcesionarioEnFiducia = concesion + obras + navideno - giroFiduciaConcesion;

    const saldo = totalIngresos - totalEgresos + derechosConcesionarioEnFiducia;
    saldoAcumulado += saldo;

    const pendienteCaom = n(c.caom);
    const pendienteCinv = n(c.cinv);
    const pendienteConcesion = pendienteCaom + pendienteCinv;
    const pendienteComision = n(c.comision);

    /** Lo que de verdad salió de la fiducia este mes. */
    const egresosCancelados = interventoria + giroFiduciaConcesion + n(c.comision);

    const totalEgresosPendientes =
      n(c.pendienteEnergia)
      + n(c.pendienteInterventoria)
      + pendienteConcesion
      + pendienteComision
      + n(c.pendienteObras)
      + n(c.pendienteNavideno)
      + n(c.pendienteOtros)
      - egresosCancelados;
    egresosPendientesAcumulado += totalEgresosPendientes;

    const saldoFinal = saldo - totalEgresosPendientes;
    saldoFinalAcumulado += saldoFinal;

    const recursosDelImpuesto = saldoFinalAcumulado;
    rendimientosAcumulados += n(c.rendimientos);
    const saldoRecursosDelImpuesto = recursosDelImpuesto + rendimientosAcumulados;

    /*
     * El saldo que la fiducia debería tener, reconstruido movimiento a movimiento desde
     * el del mes pasado. Se compara con el del extracto: si difieren, hay un movimiento
     * sin registrar, y es mejor saberlo el mes en que pasó que al cierre del año.
     */
    const saldoFiduciaValidado =
      saldoFiduciaAnterior + totalIngresos - energia
      - n(c.comision) - n(c.gmf) - n(c.otrosEgresos)
      - giroFiduciaConcesion + n(c.rendimientos) - interventoria;

    const control = n(c.saldoFiducia) - (rendimientosAcumulados + saldoAcumulado);

    salida.push({
      periodo: mes.periodo,
      capturado: c,
      giros: g,
      totalIngresos,
      ingresoFiducia,
      energia,
      interventoria,
      concesion,
      obras,
      navideno,
      totalEgresos,
      otrosGirosConcesion,
      giroFiduciaConcesion,
      derechosConcesionarioEnFiducia,
      saldo,
      saldoAcumulado,
      pendienteCaom,
      pendienteCinv,
      pendienteConcesion,
      pendienteComision,
      egresosCancelados,
      totalEgresosPendientes,
      egresosPendientesAcumulado,
      saldoFinal,
      saldoFinalAcumulado,
      estado:
        saldoFinalAcumulado < 0 ? "Déficit" : saldoFinalAcumulado > 0 ? "Excedente" : "En cero",
      recursosDelImpuesto,
      rendimientosAcumulados,
      saldoRecursosDelImpuesto,
      saldoFiducia: n(c.saldoFiducia),
      saldoFiduciaValidado,
      control,
      validacion: Math.abs(control) <= TOLERANCIA_CONCILIACION ? "Conciliado" : "Revisar",
    });

    saldoFiduciaAnterior = n(c.saldoFiducia);
  }

  return salida;
}

/** Un capturado vacío: todas las casillas en cero. Es el mes que todavía nadie tocó. */
export const capturadoVacio = (): CepCapturado => ({
  ingresos: Object.fromEntries(PAGADORES.map((p) => [p.clave, 0])),
  energiaAforo: 0,
  caom: 0,
  cinv: 0,
  comision: 0,
  gmf: 0,
  otrosEgresos: 0,
  interventoriaCausada: 0,
  pendienteEnergia: 0,
  pendienteInterventoria: 0,
  pendienteObras: 0,
  pendienteNavideno: 0,
  pendienteOtros: 0,
  rendimientos: 0,
  saldoFiducia: 0,
});
