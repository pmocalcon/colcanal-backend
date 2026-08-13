import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike, MoreThanOrEqual } from "typeorm";
import { ThPersona } from "../../database/entities/th-persona.entity";
import { ThIncapacidad } from "../../database/entities/th-incapacidad.entity";
import { ThAusentismo } from "../../database/entities/th-ausentismo.entity";

/**
 * Talento humano: base de personal, incapacidades y ausentismos.
 *
 * Los **préstamos no viven acá**: se piden con el formato de G. de talento humano y se
 * guardan en `gc_solicitudes`. El listado del módulo los lee de ahí, así que un préstamo
 * se diligencia una sola vez y se ve en los dos sitios.
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

export interface FiltroAusentismos {
  motivo?: string;
  area?: string;
  /** Solo los que empiezan desde esta fecha, en ISO. */
  desde?: string;
  buscar?: string;
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
}
