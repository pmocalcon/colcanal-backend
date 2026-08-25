import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike, MoreThanOrEqual } from "typeorm";
import { ThPersona } from "../../database/entities/th-persona.entity";
import { ThIncapacidad } from "../../database/entities/th-incapacidad.entity";
import { ThAusentismo } from "../../database/entities/th-ausentismo.entity";
import { ThPrestamo } from "../../database/entities/th-prestamo.entity";
import { ThPrestamoPago } from "../../database/entities/th-prestamo-pago.entity";
import { ThHorasExtra } from "../../database/entities/th-horas-extra.entity";
import { ThHorasExtraDetalle } from "../../database/entities/th-horas-extra-detalle.entity";
import { ThVacacion } from "../../database/entities/th-vacacion.entity";

/**
 * Talento humano: personal, incapacidades, ausentismos y préstamos.
 *
 * Ojo con los préstamos, que son dos cosas distintas con el mismo nombre. El **formato**
 * de solicitud de G. de talento humano vive en `gc_solicitudes` y es el papel con el que
 * se pide uno nuevo; `th_prestamos` es la **cartera**: lo prestado, lo descontado por
 * nómina y el saldo. Lo que se administra acá es la cartera.
 */

export interface FiltroPersonal {
  estado?: string;
  area?: string;
  empresa?: string;
  /** Busca por nombre o por identificación. */
  buscar?: string;
}

export interface FiltroIncapacidades {
  estado?: string;
  entidad?: string;
  buscar?: string;
}

export interface FiltroPrestamos {
  proyecto?: string;
  /** true = solo los que aún deben; false = solo los saldados. */
  conSaldo?: boolean;
  buscar?: string;
}

export interface FiltroAusentismos {
  motivo?: string;
  area?: string;
  /** Solo los que empiezan desde esta fecha, en ISO. */
  desde?: string;
  buscar?: string;
}

export interface FiltroHorasExtras {
  buscar?: string;
}

export interface FiltroVacaciones {
  buscar?: string;
  /** Solo las que inician desde este año, en ISO (YYYY). */
  anio?: string;
}

@Injectable()
export class TalentoHumanoService {
  constructor(
    @InjectRepository(ThPersona)
    private readonly personaRepo: Repository<ThPersona>,
    @InjectRepository(ThIncapacidad)
    private readonly incapacidadRepo: Repository<ThIncapacidad>,
    @InjectRepository(ThAusentismo)
    private readonly ausentismoRepo: Repository<ThAusentismo>,
    @InjectRepository(ThPrestamo)
    private readonly prestamoRepo: Repository<ThPrestamo>,
    @InjectRepository(ThPrestamoPago)
    private readonly pagoRepo: Repository<ThPrestamoPago>,
    @InjectRepository(ThHorasExtra)
    private readonly horasExtraRepo: Repository<ThHorasExtra>,
    @InjectRepository(ThHorasExtraDetalle)
    private readonly horasExtraDetalleRepo: Repository<ThHorasExtraDetalle>,
    @InjectRepository(ThVacacion)
    private readonly vacacionRepo: Repository<ThVacacion>,
  ) {}

  // ============================================================
  // PERSONAL
  // ============================================================

  /**
   * La base completa, ordenada por nombre.
   *
   * Sin paginar: son menos de cien personas y la pantalla es un listado que se filtra y
   * se busca entero. Paginar obligaría a pedir página por página para contar cuántos hay
   * activos, que es justo lo que se mira al abrirla.
   */
  async listPersonal(filtros: FiltroPersonal = {}): Promise<ThPersona[]> {
    const where: Record<string, unknown>[] = [];
    const base: Record<string, unknown> = {};
    if (filtros.estado) base.estado = ILike(`${filtros.estado}%`);
    if (filtros.area) base.area = filtros.area;
    if (filtros.empresa) base.empresaProyecto = filtros.empresa;

    if (filtros.buscar) {
      // Nombre o identificación: dos condiciones OR, cada una con el resto de filtros.
      const q = `%${filtros.buscar}%`;
      where.push({ ...base, nombre: ILike(q) }, { ...base, identificacion: ILike(q) });
    } else {
      where.push(base);
    }

    return this.personaRepo.find({ where, order: { nombre: "ASC" } });
  }

  async getPersona(id: number): Promise<ThPersona> {
    const persona = await this.personaRepo.findOne({ where: { personaId: id } });
    if (!persona) throw new NotFoundException("Persona no encontrada");
    return persona;
  }

  async createPersona(data: Partial<ThPersona>): Promise<ThPersona> {
    return this.personaRepo.save(this.personaRepo.create(data));
  }

  async updatePersona(id: number, data: Partial<ThPersona>): Promise<ThPersona> {
    const persona = await this.getPersona(id);
    Object.assign(persona, data);
    return this.personaRepo.save(persona);
  }

  /**
   * Una persona no se borra: se marca inactiva.
   *
   * Su historia —incapacidades, permisos, préstamos— la sigue nombrando, y borrarla
   * dejaría esos registros apuntando a alguien que ya no existe.
   */
  async inactivarPersona(id: number): Promise<ThPersona> {
    const persona = await this.getPersona(id);
    persona.estado = "INACTIVO";
    return this.personaRepo.save(persona);
  }

  // ============================================================
  // INCAPACIDADES
  // ============================================================

  async listIncapacidades(filtros: FiltroIncapacidades = {}): Promise<ThIncapacidad[]> {
    const base: Record<string, unknown> = {};
    if (filtros.estado) base.estado = filtros.estado;
    if (filtros.entidad) base.entidad = ILike(`%${filtros.entidad}%`);

    const where: Record<string, unknown>[] = [];
    if (filtros.buscar) {
      const q = `%${filtros.buscar}%`;
      where.push({ ...base, nombre: ILike(q) }, { ...base, identificacion: ILike(q) });
    } else {
      where.push(base);
    }

    return this.incapacidadRepo.find({
      where,
      order: { fechaInicio: "DESC", incapacidadId: "DESC" },
    });
  }

  async getIncapacidad(id: number): Promise<ThIncapacidad> {
    const inc = await this.incapacidadRepo.findOne({ where: { incapacidadId: id } });
    if (!inc) throw new NotFoundException("Incapacidad no encontrada");
    return inc;
  }

  async createIncapacidad(data: Partial<ThIncapacidad>): Promise<ThIncapacidad> {
    return this.incapacidadRepo.save(this.incapacidadRepo.create(data));
  }

  async updateIncapacidad(id: number, data: Partial<ThIncapacidad>): Promise<ThIncapacidad> {
    const inc = await this.getIncapacidad(id);
    Object.assign(inc, data);
    return this.incapacidadRepo.save(inc);
  }

  async deleteIncapacidad(id: number): Promise<void> {
    const inc = await this.getIncapacidad(id);
    await this.incapacidadRepo.remove(inc);
  }

  /**
   * Cuánto hay en juego, por estado.
   *
   * Se calcula en SQL y no cargando las filas: es un número, y traer la tabla entera para
   * sumarla en memoria es la forma de quedarse sin ella.
   */
  async resumenRecobro(): Promise<
    { estado: string | null; cantidad: number; proyectado: number; recuperado: number }[]
  > {
    const filas = await this.incapacidadRepo
      .createQueryBuilder("i")
      .select("i.estado", "estado")
      .addSelect("COUNT(*)", "cantidad")
      .addSelect("COALESCE(SUM(i.valor_proyectado_recuperar), 0)", "proyectado")
      .addSelect("COALESCE(SUM(i.valor_recuperado), 0)", "recuperado")
      .groupBy("i.estado")
      .getRawMany<{ estado: string | null; cantidad: string; proyectado: string; recuperado: string }>();

    return filas.map((f) => ({
      estado: f.estado,
      cantidad: Number(f.cantidad),
      proyectado: Number(f.proyectado),
      recuperado: Number(f.recuperado),
    }));
  }

  // ============================================================
  // AUSENTISMOS
  // ============================================================

  /**
   * Los permisos, del más reciente al más viejo.
   *
   * **Acotado, a diferencia del personal.** La base de personal tiene un techo natural
   * —la gente de la empresa— pero esto es un registro que solo crece: son cientos hoy y
   * miles en unos años. `limite` existe para que la consulta no se vuelva insostenible
   * el día que nadie esté mirando.
   */
  async listAusentismos(
    filtros: FiltroAusentismos = {},
    limite = 500,
  ): Promise<ThAusentismo[]> {
    const base: Record<string, unknown> = {};
    if (filtros.motivo) base.motivo = ILike(`%${filtros.motivo}%`);
    if (filtros.area) base.area = filtros.area;
    if (filtros.desde) base.fechaInicio = MoreThanOrEqual(filtros.desde);

    const where: Record<string, unknown>[] = [];
    if (filtros.buscar) {
      const q = `%${filtros.buscar}%`;
      where.push({ ...base, nombre: ILike(q) }, { ...base, identificacion: ILike(q) });
    } else {
      where.push(base);
    }

    return this.ausentismoRepo.find({
      where,
      order: { fechaInicio: "DESC", ausentismoId: "DESC" },
      take: Math.min(limite, 2000),
    });
  }

  async getAusentismo(id: number): Promise<ThAusentismo> {
    const a = await this.ausentismoRepo.findOne({ where: { ausentismoId: id } });
    if (!a) throw new NotFoundException("Ausentismo no encontrado");
    return a;
  }

  async createAusentismo(data: Partial<ThAusentismo>): Promise<ThAusentismo> {
    return this.ausentismoRepo.save(this.ausentismoRepo.create(data));
  }

  async updateAusentismo(id: number, data: Partial<ThAusentismo>): Promise<ThAusentismo> {
    const a = await this.getAusentismo(id);
    Object.assign(a, data);
    return this.ausentismoRepo.save(a);
  }

  async deleteAusentismo(id: number): Promise<void> {
    await this.ausentismoRepo.remove(await this.getAusentismo(id));
  }

  /**
   * Horas perdidas por motivo, para el año en curso.
   *
   * Se agrupa en SQL por lo mismo que el resumen de recobro: es un puñado de números y
   * traer la tabla entera para sumarla en memoria es la forma de quedarse sin ella.
   */
  async resumenAusentismos(
    desde?: string,
  ): Promise<{ motivo: string | null; cantidad: number; horas: number }[]> {
    const q = this.ausentismoRepo
      .createQueryBuilder("a")
      .select("a.motivo", "motivo")
      .addSelect("COUNT(*)", "cantidad")
      .addSelect("COALESCE(SUM(a.horas_ausencia), 0)", "horas")
      .groupBy("a.motivo")
      .orderBy("horas", "DESC");

    if (desde) q.where("a.fecha_inicio >= :desde", { desde });

    const filas = await q.getRawMany<{ motivo: string | null; cantidad: string; horas: string }>();
    return filas.map((f) => ({
      motivo: f.motivo,
      cantidad: Number(f.cantidad),
      horas: Number(f.horas),
    }));
  }

  // ============================================================
  // PRÉSTAMOS
  // ============================================================

  /**
   * La cartera completa: los que aún deben primero, y dentro de esos el saldo más alto.
   *
   * Sin paginar, como el personal: son unas decenas y lo que se mira al abrir es el total
   * adeudado, que con páginas no se puede ver sin recorrerlas todas.
   *
   * **No trae las cuotas.** Son cientos de filas hijas y hidratarlas con
   * `leftJoinAndSelect` es exactamente lo que tumbó el listado de levantamientos: con
   * colecciones, acotar el padre no acota al hijo. Se piden por préstamo en `getPrestamo`.
   */
  async listPrestamos(filtros: FiltroPrestamos = {}): Promise<ThPrestamo[]> {
    const q = this.prestamoRepo.createQueryBuilder("p");

    if (filtros.proyecto) q.andWhere("p.proyecto = :proyecto", { proyecto: filtros.proyecto });
    if (filtros.conSaldo !== undefined) {
      q.andWhere(
        filtros.conSaldo ? "COALESCE(p.saldo, 0) > 0" : "COALESCE(p.saldo, 0) <= 0",
      );
    }
    if (filtros.buscar) {
      q.andWhere("(p.nombre ILIKE :q OR p.identificacion ILIKE :q)", {
        q: `%${filtros.buscar}%`,
      });
    }

    return q
      .orderBy("CASE WHEN COALESCE(p.saldo, 0) > 0 THEN 0 ELSE 1 END", "ASC")
      .addOrderBy("p.saldo", "DESC")
      .addOrderBy("p.nombre", "ASC")
      .getMany();
  }

  /** El préstamo con su historia de descuentos, en orden cronológico. */
  async getPrestamo(
    id: number,
  ): Promise<ThPrestamo & { pagos: ThPrestamoPago[] }> {
    const prestamo = await this.prestamoRepo.findOne({ where: { prestamoId: id } });
    if (!prestamo) throw new NotFoundException("Préstamo no encontrado");

    const pagos = await this.pagoRepo.find({
      where: { prestamoId: id },
      order: { anio: "ASC", mes: "ASC" },
    });
    return { ...prestamo, pagos };
  }

  async createPrestamo(data: Partial<ThPrestamo>): Promise<ThPrestamo> {
    return this.prestamoRepo.save(this.prestamoRepo.create(data));
  }

  async updatePrestamo(id: number, data: Partial<ThPrestamo>): Promise<ThPrestamo> {
    const prestamo = await this.prestamoRepo.findOne({ where: { prestamoId: id } });
    if (!prestamo) throw new NotFoundException("Préstamo no encontrado");
    Object.assign(prestamo, data);
    return this.prestamoRepo.save(prestamo);
  }

  /**
   * Borra el préstamo y sus cuotas.
   *
   * Las cuotas se borran a mano porque `th_prestamo_pagos` apunta a `th_prestamos` sin
   * llave foránea —las tablas `th_*` se crearon aisladas—, así que no hay cascada que las
   * arrastre y quedarían huérfanas, sumando en los informes de un préstamo que ya no está.
   */
  async deletePrestamo(id: number): Promise<void> {
    const prestamo = await this.prestamoRepo.findOne({ where: { prestamoId: id } });
    if (!prestamo) throw new NotFoundException("Préstamo no encontrado");
    await this.pagoRepo.delete({ prestamoId: id });
    await this.prestamoRepo.remove(prestamo);
  }

  /**
   * Registra el descuento de un mes.
   *
   * `valor` se guarda como texto porque así declara la entidad las columnas `numeric`:
   * es lo que Postgres devuelve al leerlas, y tenerlo distinto al escribir que al leer
   * es la forma de que un centavo se pierda en una conversión a `number`.
   */
  async registrarPago(
    prestamoId: number,
    data: { anio: number; mes: number; valor: number | string },
  ): Promise<ThPrestamoPago> {
    await this.getPrestamo(prestamoId); // valida que exista
    return this.pagoRepo.save(
      this.pagoRepo.create({
        prestamoId,
        anio: data.anio,
        mes: data.mes,
        valor: String(data.valor),
      }),
    );
  }

  /**
   * Cuánto se prestó, cuánto se ha descontado y cuánto falta.
   *
   * `valor_cancelado` y `saldo` se suman **tal como están guardados** y no se recalculan
   * desde las cuotas: no siempre cuadran, porque hay cruces con vacaciones y abonos
   * extraordinarios anotados a mano, y el número de la hoja es el que la empresa da por
   * bueno.
   */
  async resumenPrestamos(): Promise<{
    prestamos: number;
    activos: number;
    prestado: number;
    cancelado: number;
    saldo: number;
  }> {
    const f = await this.prestamoRepo
      .createQueryBuilder("p")
      .select("COUNT(*)", "prestamos")
      .addSelect("COUNT(*) FILTER (WHERE COALESCE(p.saldo, 0) > 0)", "activos")
      .addSelect("COALESCE(SUM(p.valor_prestamo), 0)", "prestado")
      .addSelect("COALESCE(SUM(p.valor_cancelado), 0)", "cancelado")
      .addSelect("COALESCE(SUM(p.saldo), 0)", "saldo")
      .getRawOne<Record<string, string>>();

    return {
      prestamos: Number(f?.prestamos ?? 0),
      activos: Number(f?.activos ?? 0),
      prestado: Number(f?.prestado ?? 0),
      cancelado: Number(f?.cancelado ?? 0),
      saldo: Number(f?.saldo ?? 0),
    };
  }

  // ============================================================
  // HORAS EXTRAS
  // ============================================================

  /**
   * Las planillas aprobadas, de la más reciente a la más vieja.
   *
   * **No trae el detalle día a día.** Son decenas de renglones por planilla e
   * hidratarlos con `leftJoinAndSelect` es lo que tumbó por memoria el listado de
   * levantamientos: con colecciones, acotar el padre no acota al hijo. Se piden por
   * planilla en `getHorasExtra`.
   */
  async listHorasExtras(filtros: FiltroHorasExtras = {}): Promise<ThHorasExtra[]> {
    const q = this.horasExtraRepo.createQueryBuilder("h");
    if (filtros.buscar) {
      q.andWhere("(h.nombre ILIKE :q OR h.identificacion ILIKE :q)", {
        q: `%${filtros.buscar}%`,
      });
    }
    return q.orderBy("h.created_at", "DESC").getMany();
  }

  /** La planilla con su detalle día a día, en orden cronológico. */
  async getHorasExtra(
    id: number,
  ): Promise<ThHorasExtra & { detalle: ThHorasExtraDetalle[] }> {
    const planilla = await this.horasExtraRepo.findOne({ where: { horasExtraId: id } });
    if (!planilla) throw new NotFoundException("Planilla de horas extras no encontrada");

    const detalle = await this.horasExtraDetalleRepo.find({
      where: { horasExtraId: id },
      order: { fecha: "ASC", detalleId: "ASC" },
    });
    return { ...planilla, detalle };
  }

  /**
   * Registra la planilla ya aprobada: la cabecera y sus renglones en un solo movimiento,
   * porque nacen juntos —no hay un paso posterior que agregue renglones sueltos, a
   * diferencia de las cuotas de un préstamo, que se van descontando mes a mes—.
   */
  async registrarPlanilla(
    data: Partial<ThHorasExtra>,
    detalle: Partial<ThHorasExtraDetalle>[],
  ): Promise<ThHorasExtra & { detalle: ThHorasExtraDetalle[] }> {
    const planilla = await this.horasExtraRepo.save(this.horasExtraRepo.create(data));
    const filas = detalle.length
      ? await this.horasExtraDetalleRepo.save(
          detalle.map((d) =>
            this.horasExtraDetalleRepo.create({ ...d, horasExtraId: planilla.horasExtraId }),
          ),
        )
      : [];
    return { ...planilla, detalle: filas };
  }

  async updateHorasExtra(id: number, data: Partial<ThHorasExtra>): Promise<ThHorasExtra> {
    const planilla = await this.horasExtraRepo.findOne({ where: { horasExtraId: id } });
    if (!planilla) throw new NotFoundException("Planilla de horas extras no encontrada");
    Object.assign(planilla, data);
    return this.horasExtraRepo.save(planilla);
  }

  /**
   * Borra la planilla y su detalle a mano, como en `deletePrestamo`: sin llave foránea
   * no hay cascada que arrastre los renglones, y quedarían huérfanos sumando en los
   * informes de una planilla que ya no está.
   */
  async deleteHorasExtra(id: number): Promise<void> {
    const planilla = await this.horasExtraRepo.findOne({ where: { horasExtraId: id } });
    if (!planilla) throw new NotFoundException("Planilla de horas extras no encontrada");
    await this.horasExtraDetalleRepo.delete({ horasExtraId: id });
    await this.horasExtraRepo.remove(planilla);
  }

  /** Cuántas planillas, horas y liquidación proyectada hay registradas. */
  async resumenHorasExtras(): Promise<{
    planillas: number;
    totalHoras: number;
    totalLiquidacion: number;
  }> {
    const f = await this.horasExtraRepo
      .createQueryBuilder("h")
      .select("COUNT(*)", "planillas")
      .addSelect("COALESCE(SUM(h.total_horas), 0)", "totalHoras")
      .addSelect("COALESCE(SUM(h.total_liquidacion), 0)", "totalLiquidacion")
      .getRawOne<Record<string, string>>();

    return {
      planillas: Number(f?.planillas ?? 0),
      totalHoras: Number(f?.totalHoras ?? 0),
      totalLiquidacion: Number(f?.totalLiquidacion ?? 0),
    };
  }

  // ============================================================
  // VACACIONES
  // ============================================================

  /** Las vacaciones aprobadas, de la más reciente a la más vieja. */
  async listVacaciones(filtros: FiltroVacaciones = {}): Promise<ThVacacion[]> {
    const q = this.vacacionRepo.createQueryBuilder("v");
    if (filtros.anio) {
      q.andWhere("EXTRACT(YEAR FROM v.fecha_inicio) = :anio", { anio: Number(filtros.anio) });
    }
    if (filtros.buscar) {
      q.andWhere("(v.nombre ILIKE :q OR v.identificacion ILIKE :q)", {
        q: `%${filtros.buscar}%`,
      });
    }
    return q.orderBy("v.created_at", "DESC").getMany();
  }

  async getVacacion(id: number): Promise<ThVacacion> {
    const v = await this.vacacionRepo.findOne({ where: { vacacionId: id } });
    if (!v) throw new NotFoundException("Vacaciones no encontradas");
    return v;
  }

  async createVacacion(data: Partial<ThVacacion>): Promise<ThVacacion> {
    return this.vacacionRepo.save(this.vacacionRepo.create(data));
  }

  async updateVacacion(id: number, data: Partial<ThVacacion>): Promise<ThVacacion> {
    const v = await this.getVacacion(id);
    Object.assign(v, data);
    return this.vacacionRepo.save(v);
  }

  async deleteVacacion(id: number): Promise<void> {
    await this.vacacionRepo.remove(await this.getVacacion(id));
  }

  /** Cuántas vacaciones y cuántos días concedidos hay registrados en el año en curso. */
  async resumenVacaciones(
    anio?: string,
  ): Promise<{ registros: number; diasDisfrutar: number; diasCompensar: number }> {
    const q = this.vacacionRepo
      .createQueryBuilder("v")
      .select("COUNT(*)", "registros")
      .addSelect("COALESCE(SUM(v.dias_disfrutar), 0)", "diasDisfrutar")
      .addSelect("COALESCE(SUM(v.dias_compensar), 0)", "diasCompensar");
    if (anio) q.where("EXTRACT(YEAR FROM v.fecha_inicio) = :anio", { anio: Number(anio) });

    const f = await q.getRawOne<Record<string, string>>();
    return {
      registros: Number(f?.registros ?? 0),
      diasDisfrutar: Number(f?.diasDisfrutar ?? 0),
      diasCompensar: Number(f?.diasCompensar ?? 0),
    };
  }
}
