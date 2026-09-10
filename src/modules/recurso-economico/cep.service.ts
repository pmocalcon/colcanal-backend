import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CepMes } from "../../database/entities/cep-mes.entity";
import { CepOrdenPago } from "../../database/entities/cep-orden-pago.entity";
import { RecursoEconomico } from "../../database/entities/recurso-economico.entity";
import {
  ArranqueCep,
  ARRANQUE_EN_CERO,
  CepCapturado,
  CepMesCalculado,
  GirosDelMes,
  calcularSerieCep,
  capturadoVacio,
} from "./cep-calculo";
import { CONCEPTO } from "./cep-conceptos";
import { InformeFinanciero, armarInformeFinanciero } from "./cep-informe";

/**
 * El Control de Excedentes y el Informe Financiero, por municipio.
 *
 * Todo lo que este servicio devuelve está **calculado al momento**. En la base solo hay
 * dos cosas: lo que alguien digitó del extracto (`cep_meses`) y las órdenes de pago
 * (`cep_ordenes_pago`). Ni un solo total se guarda.
 *
 * Eso obliga a leer siempre desde el arranque, aunque se pida un año suelto: los saldos
 * acumulados encadenan y el de marzo de 2027 no se puede saber sin haber pasado por
 * todos los meses anteriores. Son unas pocas decenas de filas por municipio, así que sale
 * más barato que la alternativa —guardar los totales y mantenerlos al día—, que además
 * es la que se daña en silencio.
 */
@Injectable()
export class CepService {
  constructor(
    @InjectRepository(CepMes)
    private readonly meses: Repository<CepMes>,
    @InjectRepository(CepOrdenPago)
    private readonly ordenes: Repository<CepOrdenPago>,
    @InjectRepository(RecursoEconomico)
    private readonly recurso: Repository<RecursoEconomico>,
  ) {}

  // ── Arranque ───────────────────────────────────────────────────────────────

  /**
   * Los saldos con los que empieza cada municipio, y desde qué mes.
   *
   * Viven en el jsonb del módulo y no en tabla propia porque son lo mismo que la
   * interventoría o las retenciones: se configuran una vez, al migrar del Excel, y no se
   * vuelven a tocar. Una tabla de once filas que nadie edita es una tabla de más.
   */
  private async filaRecurso(): Promise<RecursoEconomico> {
    const existente = await this.recurso.findOne({ where: {}, order: { recursoId: "ASC" } });
    if (existente) return existente;
    return this.recurso.save(this.recurso.create({ data: {} }));
  }

  async arranqueDe(companyId: number): Promise<{ desde: string | null; saldos: ArranqueCep }> {
    const fila = await this.filaRecurso();
    const guardado = (fila.data ?? {}).cepArranque?.[String(companyId)];
    return {
      desde: guardado?.desde ?? null,
      saldos: { ...ARRANQUE_EN_CERO, ...(guardado?.saldos ?? {}) },
    };
  }

  async guardarArranque(
    companyId: number,
    desde: string,
    saldos: Partial<ArranqueCep>,
  ): Promise<{ desde: string; saldos: ArranqueCep }> {
    exigirPeriodo(desde);
    const fila = await this.filaRecurso();
    const data = fila.data ?? {};
    const previo = data.cepArranque ?? {};
    const nuevo = { desde, saldos: { ...ARRANQUE_EN_CERO, ...saldos } };
    fila.data = { ...data, cepArranque: { ...previo, [String(companyId)]: nuevo } };
    await this.recurso.save(fila);
    return nuevo;
  }

  // ── Órdenes de pago ────────────────────────────────────────────────────────

  /** Las órdenes de un municipio, del año pedido o de un mes suelto. */
  async ordenesDe(
    companyId: number,
    opciones: { anio?: string; periodo?: string } = {},
  ): Promise<CepOrdenPago[]> {
    const qb = this.ordenes
      .createQueryBuilder("o")
      .where("o.companyId = :companyId", { companyId })
      .orderBy("o.fecha", "ASC")
      .addOrderBy("o.ordenId", "ASC");
    if (opciones.periodo) qb.andWhere("o.periodo = :periodo", { periodo: opciones.periodo });
    else if (opciones.anio) qb.andWhere("o.periodo LIKE :anio", { anio: `${opciones.anio}-%` });
    return qb.getMany();
  }

  async crearOrden(datos: Partial<CepOrdenPago>, userId?: number): Promise<CepOrdenPago> {
    exigirPeriodo(datos.periodo);
    return this.ordenes.save(this.ordenes.create({ ...datos, createdBy: userId ?? null }));
  }

  async actualizarOrden(ordenId: number, datos: Partial<CepOrdenPago>): Promise<CepOrdenPago> {
    const orden = await this.ordenes.findOne({ where: { ordenId } });
    if (!orden) throw new NotFoundException("Esa orden de pago no existe");
    if (datos.periodo) exigirPeriodo(datos.periodo);
    // El municipio no se cambia: mover una orden de municipio le corre la plata a dos
    // CEP a la vez y ninguno de los dos avisa. Se borra y se crea donde va.
    const { companyId: _ignorado, ordenId: _tampoco, ...editable } = datos as any;
    Object.assign(orden, editable);
    return this.ordenes.save(orden);
  }

  async borrarOrden(ordenId: number): Promise<{ ok: true }> {
    const orden = await this.ordenes.findOne({ where: { ordenId } });
    if (!orden) throw new NotFoundException("Esa orden de pago no existe");
    await this.ordenes.remove(orden);
    return { ok: true };
  }

  // ── El CEP ─────────────────────────────────────────────────────────────────

  /**
   * La serie completa del municipio, desde el arranque hasta el último mes con datos.
   *
   * Es la única forma de obtener un mes: los acumulados encadenan, así que un mes suelto
   * no existe sin los de antes.
   */
  private async serieCompleta(companyId: number): Promise<CepMesCalculado[]> {
    const { desde, saldos } = await this.arranqueDe(companyId);

    const filas = await this.meses.find({
      where: { companyId },
      order: { periodo: "ASC" },
    });
    const enRango = desde ? filas.filter((f) => f.periodo >= desde) : filas;
    if (enRango.length === 0) return [];

    const ordenes = await this.ordenes.find({ where: { companyId } });
    const girosPorPeriodo = agruparGiros(ordenes);

    return calcularSerieCep(
      enRango.map((f) => ({
        periodo: f.periodo,
        capturado: { ...capturadoVacio(), ...(f.capturado as CepCapturado) },
        giros: girosDe(girosPorPeriodo, f.periodo),
      })),
      saldos,
    );
  }

  /**
   * El CEP de un año.
   *
   * Devuelve además los meses del año que todavía no existen, en blanco, para que la
   * pantalla los pueda ofrecer sin que alguien tenga que crearlos primero. Un mes en
   * blanco no altera los acumulados: sus casillas valen cero.
   */
  async cepDe(companyId: number, anio: string): Promise<{
    anio: string;
    arranque: { desde: string | null; saldos: ArranqueCep };
    meses: CepMesCalculado[];
    notas: Record<string, string | null>;
  }> {
    const serie = await this.serieCompleta(companyId);
    const arranque = await this.arranqueDe(companyId);
    const filas = await this.meses.find({ where: { companyId } });
    const notas: Record<string, string | null> = {};
    for (const f of filas) notas[f.periodo] = f.nota ?? null;

    return {
      anio,
      arranque,
      meses: serie.filter((m) => m.periodo.startsWith(`${anio}-`)),
      notas,
    };
  }

  /** Guarda lo digitado de un mes. Crea el mes si es la primera vez que se toca. */
  async guardarMes(
    companyId: number,
    periodo: string,
    capturado: Partial<CepCapturado>,
    nota: string | null,
    userId?: number,
  ): Promise<CepMesCalculado> {
    exigirPeriodo(periodo);
    const { desde } = await this.arranqueDe(companyId);
    if (desde && periodo < desde) {
      throw new BadRequestException(
        `El CEP de este municipio arranca en ${desde}. Para cargar un mes anterior hay `
        + "que mover el arranque, y eso cambia todos los saldos acumulados.",
      );
    }

    const existente = await this.meses.findOne({ where: { companyId, periodo } });
    const fila = existente ?? this.meses.create({ companyId, periodo, capturado: {} });
    fila.capturado = { ...capturadoVacio(), ...(fila.capturado ?? {}), ...capturado };
    fila.nota = nota;
    fila.updatedBy = userId ?? null;
    await this.meses.save(fila);

    const serie = await this.serieCompleta(companyId);
    const mes = serie.find((m) => m.periodo === periodo);
    if (!mes) throw new NotFoundException("No se pudo recalcular el mes guardado");
    return mes;
  }

  // ── El informe ─────────────────────────────────────────────────────────────

  /**
   * El Informe Financiero (GC-001-F) de un año.
   *
   * El saldo inicial de enero no se calcula: es el saldo con el que cerró diciembre, y
   * ese sale de la serie completa. Por eso el informe también se arma desde el arranque
   * aunque solo se pidan doce meses.
   */
  async informeDe(companyId: number, anio: string): Promise<InformeFinanciero & { anio: string }> {
    const serie = await this.serieCompleta(companyId);
    const delAnio = serie.filter((m) => m.periodo.startsWith(`${anio}-`));
    if (delAnio.length === 0) return { anio, periodos: [], filas: [] };

    const primero = serie.indexOf(delAnio[0]);
    const anterior = primero > 0 ? serie[primero - 1] : null;
    const arranque = await this.arranqueDe(companyId);
    const saldoInicial = anterior
      ? anterior.saldoFiducia
      : arranque.saldos.saldoFiduciaAnterior;

    return { anio, ...armarInformeFinanciero(delAnio, saldoInicial) };
  }

  /** Los años que tienen algo cargado, para poblar el selector sin adivinar. */
  async aniosDe(companyId: number): Promise<string[]> {
    const filas = await this.meses.find({ where: { companyId }, select: ["periodo"] });
    return [...new Set(filas.map((f) => f.periodo.slice(0, 4)))].sort();
  }
}

/** 'YYYY-MM' y nada más: un periodo mal escrito ordena mal y descuadra los acumulados. */
function exigirPeriodo(periodo: string | undefined): void {
  if (!periodo || !/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
    throw new BadRequestException(`El periodo "${periodo}" no tiene la forma AAAA-MM`);
  }
}

/** El mes siguiente, en 'YYYY-MM'. */
function mesSiguiente(periodo: string): string {
  const [a, m] = periodo.split("-").map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
}

type SumaPorConcepto = Map<string, Map<string, number>>;

/** Suma las órdenes por periodo y concepto, de una sola pasada. */
function agruparGiros(ordenes: CepOrdenPago[]): SumaPorConcepto {
  const mapa: SumaPorConcepto = new Map();
  for (const o of ordenes) {
    const delMes = mapa.get(o.periodo) ?? new Map<string, number>();
    delMes.set(o.concepto, (delMes.get(o.concepto) ?? 0) + Number(o.valor ?? 0));
    mapa.set(o.periodo, delMes);
  }
  return mapa;
}

const leer = (mapa: SumaPorConcepto, periodo: string, concepto: string): number =>
  mapa.get(periodo)?.get(concepto) ?? 0;

function girosDe(mapa: SumaPorConcepto, periodo: string): GirosDelMes {
  return {
    energiaMedicion: leer(mapa, periodo, CONCEPTO.ENERGIA_MEDICION),
    // La interventoría de un mes se gira al mes siguiente: la orden que respalda el
    // costo de agosto está imputada a septiembre. @see GirosDelMes.
    interventoria: leer(mapa, mesSiguiente(periodo), CONCEPTO.INTERVENTORIA),
    obras: leer(mapa, periodo, CONCEPTO.OBRA),
    navideno: leer(mapa, periodo, CONCEPTO.NAVIDENO),
    caomCinv: leer(mapa, periodo, CONCEPTO.CAOM_CINV),
  };
}
