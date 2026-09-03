import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
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
import { ThParametroNomina } from "../../database/entities/th-parametro-nomina.entity";
import { ThRetencionFicha } from "../../database/entities/th-retencion-ficha.entity";
import { ThBanco } from "../../database/entities/th-banco.entity";

/**
 * Talento humano: personal, incapacidades, ausentismos y préstamos.
 *
 * Ojo con los préstamos, que son dos cosas distintas con el mismo nombre. El **formato**
 * de solicitud de G. de talento humano vive en `gc_solicitudes` y es el papel con el que
 * se pide uno nuevo; `th_prestamos` es la **cartera**: lo prestado, lo descontado por
 * nómina y el saldo. Lo que se administra acá es la cartera.
 */

/**
 * La ficha con lo que se calcula al leerla: la edad y los días del año en curso.
 *
 * Va como un tipo aparte y no como columnas de la entidad para que se vea de un vistazo
 * qué se guarda y qué no. Lo de aquí no se puede editar: sale de otro lado.
 */
export type ThPersonaConResumen = ThPersona & {
  /** Años cumplidos. Nulo si no hay fecha de nacimiento. */
  edad: number | null;
  /** Días de incapacidad registrados este año. */
  diasIncapacidad: number;
  /** Días de permiso este año, contando las horas sueltas como días de ocho. */
  diasPermiso: number;
};

/** La jornada con la que se convierten las horas de permiso a días. */
const HORAS_POR_DIA = 8;

/**
 * Años cumplidos a hoy.
 *
 * La fecha se parte a mano en vez de pasarla por `new Date(...)`: una cadena «1996-08-27»
 * se interpreta como medianoche **en UTC**, y en Colombia —cinco horas atrás— eso cae el
 * 26 de agosto. Con `new Date` la edad subía el día antes del cumpleaños.
 */
const edadDe = (fechaNacimiento: string | null): number | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaNacimiento ?? "");
  if (!m) return null;
  const [anioN, mesN, diaN] = [Number(m[1]), Number(m[2]), Number(m[3])];

  const hoy = new Date();
  let anios = hoy.getFullYear() - anioN;
  // Si todavía no ha llegado su cumpleaños este año, le falta uno.
  const mesesDeDiferencia = hoy.getMonth() + 1 - mesN;
  if (mesesDeDiferencia < 0 || (mesesDeDiferencia === 0 && hoy.getDate() < diaN)) anios -= 1;
  return anios >= 0 && anios < 130 ? anios : null;
};

/** Lo que lleva una ficha cuando no hay contra qué cruzarla. */
const SIN_RESUMEN = (p: ThPersona) => ({
  edad: edadDe(p.fechaNacimiento),
  diasIncapacidad: 0,
  diasPermiso: 0,
});

/**
 * Lo que la ficha le presta a un formato de Talento Humano cuando se escribe la cédula.
 *
 * Es un recorte a propósito, no la ficha entera: estos formatos los diligencia cualquier
 * empleado, y el buscador está abierto a quien tenga sesión. Va lo que el formato pide en
 * su encabezado —quién es, con qué documento, en qué cargo— y nada de lo que no.
 */
export interface FichaParaFormato {
  personaId: number;
  identificacion: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  primerNombre: string;
  segundoNombre: string;
  /** CC, CE, TI… Vacío se lee como CC, que es lo que es casi toda la base. */
  tipoId: string | null;
  estadoCivil: string | null;
  correo: string | null;
  cargo: string | null;
  area: string | null;
  empresaProyecto: string | null;
  fechaIngreso: string | null;
  diasVacacionesPendientes: number | null;
  /**
   * Solo va con `incluirSalario`. Sin eso queda en nulo y el formato lo pide a mano.
   *
   * Cualquiera con sesión puede consultar una cédula, así que devolverlo siempre haría
   * del prellenado un consultor de sueldos ajenos.
   */
  salario: string | null;
}

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

/** Una línea del cierre del mes: un préstamo y lo que toca descontarle. */
export interface FilaCierre {
  prestamoId: number;
  nombre: string;
  identificacion: string | null;
  proyecto: string | null;
  /** Con qué nombre lo busca la nómina. Vacío = ese préstamo no se está descontando. */
  nombreNomina: string | null;
  valorPrestamo: string | null;
  valorCuota: string | null;
  cuotaDescontar: string | null;
  /** Lo último que se le descontó. Es la cuota de los préstamos que vienen sin una. */
  ultimaCuota: number;
  saldo: string | null;
  /** El tope del mes: el saldo más lo que ya se haya registrado de este mismo mes. */
  disponible: number;
  /** La cuota que ya está guardada en este mes, si se está reabriendo el cierre. */
  yaDescontado: number;
  /** Los abonos extraordinarios del mes. No se editan acá. */
  abonos: number;
  sugerido: number;
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
    @InjectRepository(ThParametroNomina)
    private readonly parametroRepo: Repository<ThParametroNomina>,
    @InjectRepository(ThRetencionFicha)
    private readonly retencionRepo: Repository<ThRetencionFicha>,
    @InjectRepository(ThBanco)
    private readonly bancoRepo: Repository<ThBanco>,
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
  async listPersonal(filtros: FiltroPersonal = {}): Promise<ThPersonaConResumen[]> {
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

    const personas = await this.personaRepo.find({ where, order: { nombre: "ASC" } });
    return this.conResumen(personas);
  }

  /**
   * Le agrega a cada ficha lo que **no se guarda en ella**: la edad y los días de
   * incapacidad y de permiso del año.
   *
   * Ninguno de los tres se guarda a propósito. La edad cambia sola cada año. Los días
   * viven en los módulos de Incapacidades y Ausentismos, donde se registran uno por uno;
   * una copia en la ficha quedaría vieja el día siguiente y nadie sabría cuál de las dos
   * cifras creer.
   *
   * Se calcula del año en curso, que es como se lee la cifra —«cuántos días lleva este
   * año»—, y en dos consultas agrupadas para las ochenta y seis fichas, no una por cada
   * una.
   */
  private async conResumen(personas: ThPersona[]): Promise<ThPersonaConResumen[]> {
    if (personas.length === 0) return [];
    const anio = new Date().getFullYear();
    const desde = `${anio}-01-01`;
    const hasta = `${anio}-12-31`;
    const cedulas = [...new Set(personas.map((p) => p.identificacion).filter(Boolean))];
    if (cedulas.length === 0) return personas.map((p) => ({ ...p, ...SIN_RESUMEN(p) }));

    const [incapacidades, ausencias] = await Promise.all([
      this.incapacidadRepo
        .createQueryBuilder("i")
        .select("i.identificacion", "identificacion")
        .addSelect("COALESCE(SUM(i.total_dias), 0)", "dias")
        .where("i.identificacion IN (:...cedulas)", { cedulas })
        .andWhere("i.fecha_inicio BETWEEN :desde AND :hasta", { desde, hasta })
        .groupBy("i.identificacion")
        .getRawMany<{ identificacion: string; dias: string }>(),
      this.ausentismoRepo
        .createQueryBuilder("a")
        .select("a.identificacion", "identificacion")
        .addSelect("COALESCE(SUM(a.dias_permiso), 0)", "dias")
        .addSelect("COALESCE(SUM(a.horas_ausencia), 0)", "horas")
        .where("a.identificacion IN (:...cedulas)", { cedulas })
        .andWhere("a.fecha_inicio BETWEEN :desde AND :hasta", { desde, hasta })
        .groupBy("a.identificacion")
        .getRawMany<{ identificacion: string; dias: string; horas: string }>(),
    ]);

    const diasIncapacidad = new Map(incapacidades.map((f) => [f.identificacion, Number(f.dias)]));
    /*
     * Los permisos se registran casi siempre en horas —«salió dos horas al médico»— y
     * `dias_permiso` queda en cero. Sumar solo los días diría que nadie pidió permiso
     * nunca teniendo setecientas horas registradas, así que las horas se convierten a
     * días de ocho.
     */
    const diasPermiso = new Map(
      ausencias.map((f) => [f.identificacion, Number(f.dias) + Number(f.horas) / HORAS_POR_DIA]),
    );

    return personas.map((p) => ({
      ...p,
      edad: edadDe(p.fechaNacimiento),
      diasIncapacidad: diasIncapacidad.get(p.identificacion) ?? 0,
      diasPermiso: Math.round((diasPermiso.get(p.identificacion) ?? 0) * 10) / 10,
    }));
  }

  /**
   * La ficha de una cédula, recortada para prellenar un formato.
   *
   * Devuelve **una sola**: si la cédula tiene varios contratos en el grupo, se toma la
   * activa —y entre varias activas, la de mayor salario, que es el contrato principal—.
   * El encabezado del formato lleva un cargo y un área, no dos.
   *
   * Nulo si no está: el formato se sigue pudiendo diligenciar a mano. Alguien recién
   * contratado puede no tener ficha todavía, y eso no puede trancarle una solicitud.
   */
  async fichaParaFormato(
    identificacion: string,
    incluirSalario = false,
  ): Promise<FichaParaFormato | null> {
    const cedula = String(identificacion ?? "").trim();
    if (!cedula) return null;

    const candidatas = await this.personaRepo.find({ where: { identificacion: cedula } });
    if (candidatas.length === 0) return null;

    const activas = candidatas.filter((p) => /^activo/i.test(p.estado ?? ""));
    const elegibles = activas.length > 0 ? activas : candidatas;
    const p = elegibles.sort((a, b) => Number(b.salario ?? 0) - Number(a.salario ?? 0))[0];

    const { apellidos, nombres } = this.partirNombre(p);
    const [primerApellido, ...restoApellidos] = apellidos.split(/\s+/).filter(Boolean);
    const [primerNombre, ...restoNombres] = nombres.split(/\s+/).filter(Boolean);

    return {
      personaId: p.personaId,
      identificacion: p.identificacion,
      nombre: p.nombre,
      primerApellido: primerApellido ?? "",
      // El resto se junta: «DE LA CRUZ» es un solo apellido, y partirlo por espacios lo
      // repartiría en dos casillas del formato.
      segundoApellido: restoApellidos.join(" "),
      primerNombre: primerNombre ?? "",
      segundoNombre: restoNombres.join(" "),
      tipoId: p.tipoId,
      estadoCivil: p.estadoCivil,
      correo: p.correo,
      cargo: p.cargo,
      area: p.area,
      empresaProyecto: p.empresaProyecto,
      fechaIngreso: p.fechaIngreso,
      diasVacacionesPendientes: p.diasVacacionesPendientes,
      salario: incluirSalario ? p.salario : null,
    };
  }

  /**
   * Apellidos y nombres de la ficha.
   *
   * Si están corregidos a mano se usan tal cual —**siempre que estén completos**—. Si no,
   * se parte `nombre`, que viene «APELLIDOS NOMBRES» en una sola cadena: dos apellidos
   * cuando hay cuatro palabras o más, uno cuando hay tres. No siempre acierta —«CASTILLO
   * JORGE EDUARDO» es un apellido y dos nombres— y por eso la ficha guarda la corrección.
   *
   * Lo de «completos» no es paranoia: en la base hay una docena de fichas que traen
   * `apellidos = 'BAEZA'` para «BAEZA MARÍN YAKI MICHELL», con el segundo apellido
   * perdido en la importación de los datos bancarios. Eso no es una corrección, es un
   * dato roto, y usarlo tal cual imprimiría a la persona con un apellido de menos en cada
   * formato que firme.
   */
  private partirNombre(p: ThPersona): { apellidos: string; nombres: string } {
    const guardados = {
      apellidos: (p.apellidos ?? "").trim(),
      nombres: (p.nombres ?? "").trim(),
    };
    if ((guardados.apellidos || guardados.nombres) && this.cubreElNombre(p, guardados)) {
      return guardados;
    }

    const palabras = (p.nombre ?? "").trim().split(/\s+/).filter(Boolean);
    if (palabras.length === 0) return { apellidos: "", nombres: "" };
    if (palabras.length === 1) return { apellidos: palabras[0], nombres: "" };
    const cuantos = palabras.length >= 4 ? 2 : 1;
    return {
      apellidos: palabras.slice(0, cuantos).join(" "),
      nombres: palabras.slice(cuantos).join(" "),
    };
  }

  /**
   * Si el corte guardado usa exactamente las mismas palabras que `nombre`.
   *
   * Se comparan como conjunto y sin tildes: partir bien es repartir las palabras en dos
   * casillas, no quitar ni agregar ninguna. Sin tildes porque el archivo del banco las
   * quita —«HERNANDEZ» contra «HERNÁNDEZ»— y esa diferencia no significa que falte nada.
   */
  private cubreElNombre(
    p: ThPersona,
    corte: { apellidos: string; nombres: string },
  ): boolean {
    const normalizar = (v: string): string[] =>
      v
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase()
        .split(/\s+/)
        .filter(Boolean)
        .sort();

    const enLaFicha = normalizar(p.nombre ?? "");
    const enElCorte = normalizar(`${corte.apellidos} ${corte.nombres}`);
    return (
      enLaFicha.length === enElCorte.length &&
      enLaFicha.every((palabra, i) => palabra === enElCorte[i])
    );
  }

  async getPersona(id: number): Promise<ThPersona> {
    // Sin resumen: quien pide una ficha suelta la va a editar, y los calculados no se
    // editan. El listado, que es donde se leen, sí los trae.
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
   * Registra un pago: la cuota del mes o un abono extraordinario.
   *
   * Además de dejar el renglón, **mueve lo descontado y el saldo del préstamo**. Se suma
   * y se resta en vez de recalcular desde cero a propósito: los saldos que vienen del
   * Excel traen cruces con vacaciones y abonos anotados a mano que no cuadran con la
   * suma de las cuotas, y recalcularlos cambiaría cifras que nadie decidió cambiar. Lo
   * que se registre de acá en adelante sí queda cuadrado.
   *
   * Un abono con `medio: "NOMINA"` lo descuenta además la nómina de ese periodo, sumado
   * a la cuota. Uno `DIRECTO` —consignación, prima, liquidación— solo baja el saldo.
   *
   * `valor` se guarda como texto porque así declara la entidad las columnas `numeric`:
   * es lo que Postgres devuelve al leerlas, y tenerlo distinto al escribir que al leer
   * es la forma de que un centavo se pierda en una conversión a `number`.
   */
  /**
   * Cuántos abonos se aceptan sobre un mismo préstamo en un mismo mes.
   *
   * No es una limitación técnica: es que un mes con más de siete abonos deja de ser una
   * cartera y pasa a ser una digitación repetida —el caso real es teclear el mismo abono
   * varias veces sin darse cuenta, que baja el saldo de más y no salta a la vista hasta
   * que alguien cuadra—. Las cuotas de nómina no cuentan: esas las pone el sistema, una
   * por mes.
   */
  private static readonly MAX_ABONOS_POR_MES = 7;

  async registrarPago(
    prestamoId: number,
    data: {
      anio: number; mes: number; valor: number | string;
      tipo?: string; medio?: string; fecha?: string | null; observaciones?: string | null;
    },
  ): Promise<ThPrestamoPago> {
    const prestamo = await this.getPrestamo(prestamoId);

    const valor = Number(data.valor);
    if (!(valor > 0)) throw new BadRequestException("El valor del pago tiene que ser mayor que cero");
    if (!Number.isInteger(Number(data.anio))) throw new BadRequestException("El año no es válido");
    const mes = Number(data.mes);
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) throw new BadRequestException("El mes no es válido");

    const tipo = (data.tipo ?? "CUOTA").toUpperCase();
    const medio = (data.medio ?? "NOMINA").toUpperCase();
    if (!["CUOTA", "ABONO"].includes(tipo)) throw new BadRequestException("Tipo de pago no válido");
    if (!["NOMINA", "DIRECTO"].includes(medio)) throw new BadRequestException("Medio de pago no válido");

    if (tipo === "ABONO") {
      const yaHay = await this.pagoRepo.count({
        where: { prestamoId, anio: Number(data.anio), mes, tipo: "ABONO" },
      });
      if (yaHay >= TalentoHumanoService.MAX_ABONOS_POR_MES) {
        throw new BadRequestException(
          `Este préstamo ya tiene ${yaHay} abonos en ${mes}/${data.anio}, que es el tope de ` +
            `${TalentoHumanoService.MAX_ABONOS_POR_MES} por mes. Si hay más pagos, únelos en uno solo ` +
            "o revisa si alguno quedó repetido.",
        );
      }
    }

    return this.pagoRepo.manager.transaction(async (manager) => {
      const pago = await manager.save(
        manager.create(ThPrestamoPago, {
          prestamoId,
          anio: Number(data.anio),
          mes,
          valor: String(valor),
          tipo,
          medio,
          fecha: data.fecha ?? null,
          observaciones: data.observaciones ?? null,
        }),
      );
      await manager.update(ThPrestamo, prestamoId, {
        valorCancelado: String(Number(prestamo.valorCancelado ?? 0) + valor),
        saldo: String(Number(prestamo.saldo ?? 0) - valor),
      });
      return pago;
    });
  }

  /**
   * Borra un pago y le devuelve la plata al saldo.
   *
   * Es lo que hace falta cuando alguien se equivoca digitando: sin esto, corregir un
   * abono de más obligaría a inventar otro en negativo.
   */
  async eliminarPago(prestamoId: number, pagoId: number): Promise<void> {
    const prestamo = await this.getPrestamo(prestamoId);
    const pago = await this.pagoRepo.findOne({ where: { pagoId, prestamoId } });
    if (!pago) throw new NotFoundException("Ese pago no existe en este préstamo");

    const valor = Number(pago.valor);
    await this.pagoRepo.manager.transaction(async (manager) => {
      await manager.delete(ThPrestamoPago, { pagoId });
      await manager.update(ThPrestamo, prestamoId, {
        valorCancelado: String(Number(prestamo.valorCancelado ?? 0) - valor),
        saldo: String(Number(prestamo.saldo ?? 0) + valor),
      });
    });
  }

  /**
   * El cierre del mes: qué hay que descontarle a cada préstamo que todavía debe.
   *
   * Es la columna del Excel, pero calculada. Hasta ahora la cartera se actualizaba
   * préstamo por préstamo —con cincuenta y dos activos, cincuenta y dos aperturas cada
   * mes—, y por eso se seguía llevando en la hoja.
   *
   * Lo que se sugiere descontar sale, en este orden: lo que ya se haya registrado del
   * mes (para poder volver a entrar y corregir), la `cuota_descontar` que deja
   * Contabilidad cuando el descuento del mes no es la cuota pactada, y si no, la cuota
   * del préstamo. Nunca más de lo que se debe: la última cuota es el saldo, no la cuota.
   *
   * Los abonos del mes se muestran pero no se tocan acá: se registran uno a uno con su
   * medio y su observación, que es información que una tabla de un solo número perdería.
   */
  async cierreDelMes(anio: number, mes: number): Promise<FilaCierre[]> {
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
      throw new BadRequestException("El año no es válido");
    }
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      throw new BadRequestException("El mes no es válido");
    }

    const prestamos = await this.prestamoRepo.find({ order: { nombre: "ASC" } });
    const pagos = await this.pagoRepo.find({ where: { anio, mes } });

    /*
     * La última cuota que se le descontó a cada préstamo.
     *
     * Hace falta porque hay préstamos sin cuota pactada —vienen del archivo histórico,
     * donde esa casilla iba vacía— y sin esto se les sugeriría cero, que es justo el
     * préstamo que se queda sin descontar porque nadie notó el renglón en blanco. Lo que
     * se le viene descontando es un dato real, no una invención.
     */
    const ultimas: { prestamo_id: number; valor: string }[] = await this.pagoRepo.query(
      `SELECT DISTINCT ON (prestamo_id) prestamo_id, valor
         FROM th_prestamo_pagos
        WHERE tipo = 'CUOTA'
        ORDER BY prestamo_id, anio DESC, mes DESC, pago_id DESC`,
    );
    const ultimaPorPrestamo = new Map(
      ultimas.map((u) => [Number(u.prestamo_id), Number(u.valor)]),
    );

    const filas: FilaCierre[] = [];
    for (const p of prestamos) {
      const delMes = pagos.filter((g) => g.prestamoId === p.prestamoId);
      const cuotas = delMes.filter((g) => g.tipo === "CUOTA");
      const yaDescontado = cuotas.reduce((t, g) => t + Number(g.valor), 0);
      const abonos = delMes
        .filter((g) => g.tipo === "ABONO")
        .reduce((t, g) => t + Number(g.valor), 0);

      const saldo = Number(p.saldo ?? 0);
      // Lo que cabría descontar este mes. Se le suma lo ya registrado porque eso ya salió
      // del saldo: sin sumarlo, al reabrir el mes el tope bajaría y no se podría subir la
      // cifra que uno mismo acaba de guardar.
      const disponible = saldo + yaDescontado;
      if (disponible <= 0 && yaDescontado === 0) continue;

      const ultimaCuota = ultimaPorPrestamo.get(p.prestamoId) ?? 0;
      const pactada = Number(p.cuotaDescontar ?? p.valorCuota ?? 0) || ultimaCuota;
      const sugerido =
        yaDescontado > 0 ? yaDescontado : Math.max(0, Math.min(disponible, pactada));

      filas.push({
        prestamoId: p.prestamoId,
        nombre: p.nombre,
        identificacion: p.identificacion,
        proyecto: p.proyecto,
        nombreNomina: p.nombreNomina,
        valorPrestamo: p.valorPrestamo,
        valorCuota: p.valorCuota,
        cuotaDescontar: p.cuotaDescontar,
        ultimaCuota,
        saldo: p.saldo,
        disponible,
        yaDescontado,
        abonos,
        sugerido,
      });
    }
    return filas;
  }

  /**
   * Guarda el mes entero de una vez.
   *
   * Todo en una transacción: un cierre a medias —la mitad de la gente con el descuento
   * puesto y la otra mitad no— es peor que uno que no se hizo, porque nadie sabría por
   * dónde iba.
   *
   * De cada préstamo se reescribe **solo la cuota del mes**; los abonos quedan como
   * estén. Un cero borra la cuota y le devuelve la plata al saldo, que es como se
   * deshace un descuento mal puesto sin tener que inventar un pago en negativo.
   */
  async guardarCierreDelMes(
    anio: number,
    mes: number,
    filas: { prestamoId: number; valor: number | string }[],
  ): Promise<{ anio: number; mes: number; prestamos: number; total: number }> {
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
      throw new BadRequestException("El año no es válido");
    }
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      throw new BadRequestException("El mes no es válido");
    }
    if (!Array.isArray(filas) || filas.length === 0) {
      throw new BadRequestException("No hay nada que guardar");
    }

    return this.pagoRepo.manager.transaction(async (manager) => {
      let tocados = 0;
      let total = 0;

      for (const f of filas) {
        const prestamo = await manager.findOne(ThPrestamo, {
          where: { prestamoId: Number(f.prestamoId) },
        });
        if (!prestamo) {
          throw new NotFoundException(`El préstamo ${f.prestamoId} no existe`);
        }

        const nuevo = Math.round(Number(f.valor ?? 0));
        if (!Number.isFinite(nuevo) || nuevo < 0) {
          throw new BadRequestException(
            `El valor de ${prestamo.nombre} no es válido`,
          );
        }

        const cuotas = await manager.find(ThPrestamoPago, {
          where: { prestamoId: prestamo.prestamoId, anio, mes, tipo: "CUOTA" },
          order: { pagoId: "ASC" },
        });
        const actual = cuotas.reduce((t, g) => t + Number(g.valor), 0);
        total += nuevo;

        if (Math.abs(nuevo - actual) < 1) continue;

        // No se puede descontar más de lo que se debe: dejaría el saldo en negativo y
        // el error no saltaría hasta que alguien cuadre la cartera meses después.
        const disponible = Number(prestamo.saldo ?? 0) + actual;
        if (nuevo > disponible + 0.5) {
          throw new BadRequestException(
            `A ${prestamo.nombre} se le está descontando ${nuevo.toLocaleString("es-CO")} ` +
              `y solo debe ${Math.round(disponible).toLocaleString("es-CO")}.`,
          );
        }

        // Se conserva la primera fila y se le cambia el valor, en vez de borrar e
        // insertar: así no se pierde la observación que traiga («cuota pactada de
        // agosto», un cruce con vacaciones) ni cambia el id que ya está en pantalla.
        const [primera, ...sobrantes] = cuotas;
        for (const s of sobrantes) {
          await manager.delete(ThPrestamoPago, { pagoId: s.pagoId });
        }
        if (nuevo === 0) {
          if (primera) await manager.delete(ThPrestamoPago, { pagoId: primera.pagoId });
        } else if (primera) {
          await manager.update(ThPrestamoPago, { pagoId: primera.pagoId }, {
            valor: String(nuevo),
          });
        } else {
          await manager.save(
            manager.create(ThPrestamoPago, {
              prestamoId: prestamo.prestamoId,
              anio,
              mes,
              valor: String(nuevo),
              tipo: "CUOTA",
              medio: "NOMINA",
            }),
          );
        }

        await manager.update(ThPrestamo, prestamo.prestamoId, {
          valorCancelado: String(Number(prestamo.valorCancelado ?? 0) + (nuevo - actual)),
          saldo: String(Number(prestamo.saldo ?? 0) - (nuevo - actual)),
        });
        tocados++;
      }

      return { anio, mes, prestamos: tocados, total };
    });
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
    // Cabecera y renglones van en una transacción. Sin ella, un renglón que Postgres
    // rechace deja la cabecera ya escrita: una planilla sin detalle que nadie pidió y
    // que la nómina igual suma. Así pasó —cada clic en «Aprobar» dejaba una huérfana.
    return this.horasExtraRepo.manager.transaction(async (em) => {
      const planilla = await em.save(em.create(ThHorasExtra, data));
      const filas = detalle.length
        ? await em.save(
            detalle.map((d) =>
              em.create(ThHorasExtraDetalle, { ...d, horasExtraId: planilla.horasExtraId }),
            ),
          )
        : [];
      return { ...planilla, detalle: filas };
    });
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

  // ── Anulación de formatos ──────────────────────────────────────────

  /**
   * Borra lo que un formato de Gestión del Conocimiento dejó en las tablas de nómina.
   *
   * Los cuatro formatos de Talento Humano crean un registro real al aprobarse —un
   * préstamo, un ausentismo, una planilla de horas extras, unas vacaciones—, y ese
   * registro es el que la liquidación lee. Al anular el formato hay que quitarlo: si
   * no, la nómina sigue pagando o descontando algo que ya nadie autorizó, y no falla
   * nada que avise.
   *
   * Se borra en vez de marcarse: el registro es un derivado y la historia completa
   * queda en el documento anulado, con su motivo y su bitácora. Marcarlo obligaría a
   * filtrarlo en cada cálculo de nómina, y basta que un sitio lo olvide para volver a
   * pagar lo anulado en silencio.
   *
   * Los registros creados antes de que existiera `solicitudId` se buscan por la marca
   * que el propio formato escribió en las observaciones («… solicitud GTH-018-F N.º 7.»).
   * Sin ese respaldo, anular un formato aprobado hace tiempo no borraría nada.
   *
   * @returns cuántas filas se borraron.
   */
  async borrarDerivadosDeSolicitud(solicitudId: number, formato: string): Promise<number> {
    const marca = `solicitud ${formato} N.º ${solicitudId}.`;

    /** Las filas de una tabla que nacieron de esta solicitud, por id o por la marca. */
    const buscar = async <T extends { solicitudId: number | null; observaciones: string | null }>(
      repo: Repository<T>,
    ): Promise<T[]> => {
      const porId = await repo.find({ where: { solicitudId } as any });
      if (porId.length > 0) return porId;
      const candidatas = await repo.find({
        where: { observaciones: ILike(`%${marca}`) } as any,
      });
      return candidatas;
    };

    let borradas = 0;

    if (formato === "GTH-007-F") {
      const filas = await buscar(this.prestamoRepo);
      for (const f of filas) {
        // Los pagos van primero: apuntan al préstamo sin llave foránea, así que nadie
        // los borraría solos y quedarían señalando a un préstamo que ya no existe.
        await this.pagoRepo.delete({ prestamoId: f.prestamoId });
      }
      if (filas.length > 0) borradas += (await this.prestamoRepo.remove(filas)).length;
    } else if (formato === "GTH-009-F") {
      const filas = await buscar(this.ausentismoRepo);
      if (filas.length > 0) borradas += (await this.ausentismoRepo.remove(filas)).length;
    } else if (formato === "GTH-016-F") {
      const filas = await buscar(this.horasExtraRepo);
      for (const f of filas) {
        await this.horasExtraDetalleRepo.delete({ horasExtraId: f.horasExtraId });
      }
      if (filas.length > 0) borradas += (await this.horasExtraRepo.remove(filas)).length;
    } else if (formato === "GTH-018-F") {
      const filas = await buscar(this.vacacionRepo);
      if (filas.length > 0) borradas += (await this.vacacionRepo.remove(filas)).length;
    }

    return borradas;
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
  // ============================================================
  // PARÁMETROS DE NÓMINA
  // ============================================================

  /** Los años cargados, del más reciente al más viejo. */
  listParametros(): Promise<ThParametroNomina[]> {
    return this.parametroRepo.find({ order: { anio: "DESC" } });
  }

  /**
   * Los parámetros de un año.
   *
   * Devuelve `null` en vez de reventar cuando el año no está cargado: quien llama decide
   * qué hacer —la pantalla lo pide para que lo llenen, la nómina se cae con un mensaje
   * que dice qué falta—. Que no exista el año es una situación normal cada 1º de enero,
   * no un error del programa.
   */
  getParametros(anio: number): Promise<ThParametroNomina | null> {
    return this.parametroRepo.findOne({ where: { anio } });
  }

  /**
   * Crea o actualiza el año. Es upsert por `anio`, que es único: guardar dos veces el
   * mismo año lo corrige, no lo duplica.
   */
  async guardarParametros(data: Partial<ThParametroNomina>): Promise<ThParametroNomina> {
    const anio = Number(data.anio);
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
      throw new BadRequestException("El año no es válido");
    }
    const smmlv = Number(data.smmlv);
    const auxilio = Number(data.auxilioTransporte);
    if (!(smmlv > 0)) throw new BadRequestException("El salario mínimo tiene que ser mayor que cero");
    if (!(auxilio >= 0)) throw new BadRequestException("El auxilio de transporte no puede ser negativo");

    const fila = (await this.parametroRepo.findOne({ where: { anio } }))
      ?? this.parametroRepo.create({ anio });
    fila.smmlv = String(smmlv);
    fila.auxilioTransporte = String(auxilio);
    // El UVT es opcional al guardar el año: sin él simplemente no hay retención que
    // calcular, y el resto de la nómina funciona igual.
    if (data.uvt !== undefined && data.uvt !== null && String(data.uvt) !== "") {
      const uvt = Number(data.uvt);
      if (!(uvt >= 0)) throw new BadRequestException("El UVT no puede ser negativo");
      fila.uvt = String(uvt);
    }
    fila.observaciones = data.observaciones ?? fila.observaciones ?? null;
    return this.parametroRepo.save(fila);
  }

  // ── Tabla de retenciones (Procedimiento 1, Art. 383 E.T.) ──

  /**
   * La tabla del año: TODO el personal activo, cada uno con su ficha si la tiene.
   *
   * Devuelve a todos y no solo a los que tienen ficha porque la retención se le
   * practica a cualquiera que pase el umbral: una lista que solo mostrara a los
   * configurados escondería justo a quien falta configurar.
   */
  async listRetenciones(anio: number): Promise<
    Array<{
      personaId: number;
      identificacion: string;
      nombre: string;
      cargo: string | null;
      empresaProyecto: string | null;
      salario: string | null;
      ficha: ThRetencionFicha | null;
    }>
  > {
    const [personas, fichas] = await Promise.all([
      this.personaRepo.find({ where: { estado: ILike("ACTIVO%") }, order: { nombre: "ASC" } }),
      this.retencionRepo.find({ where: { anio } }),
    ]);
    const porPersona = new Map(fichas.map((f) => [f.personaId, f]));
    return personas.map((p) => ({
      personaId: p.personaId,
      identificacion: p.identificacion,
      nombre: p.nombre,
      cargo: p.cargo,
      empresaProyecto: p.empresaProyecto,
      salario: p.salario,
      ficha: porPersona.get(p.personaId) ?? null,
    }));
  }

  /** Crea o actualiza la ficha de una persona para un año (upsert por persona+año). */
  async guardarRetencion(data: Record<string, any>): Promise<ThRetencionFicha> {
    const anio = Number(data.anio);
    const personaId = Number(data.personaId);
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
      throw new BadRequestException("El año no es válido");
    }
    if (!Number.isInteger(personaId) || personaId <= 0) {
      throw new BadRequestException("Falta la persona");
    }

    /** Las cifras del formulario llegan como texto; vacío es cero, negativo no existe. */
    const cifra = (v: unknown, etiqueta: string): string => {
      if (v === undefined || v === null || String(v).trim() === "") return "0";
      const n = Number(String(v).replace(/[^\d.-]/g, ""));
      if (!Number.isFinite(n) || n < 0) {
        throw new BadRequestException(`${etiqueta} no puede ser negativo`);
      }
      return String(n);
    };

    const fila =
      (await this.retencionRepo.findOne({ where: { anio, personaId } })) ??
      this.retencionRepo.create({ anio, personaId });

    fila.viviendaModo = data.viviendaModo === "PORCENTAJE" ? "PORCENTAJE" : "FIJO";
    fila.viviendaValor = cifra(data.viviendaValor, "El valor de vivienda");
    fila.viviendaPorcentaje = cifra(data.viviendaPorcentaje, "El porcentaje de vivienda");
    fila.dependientes = cifra(data.dependientes, "La deducción por dependientes");
    fila.medicinaPrepagada = cifra(data.medicinaPrepagada, "La medicina prepagada");
    fila.pensionesVoluntarias = cifra(data.pensionesVoluntarias, "Las pensiones voluntarias");
    fila.afc = cifra(data.afc, "Los aportes AFC");
    fila.sujeto = data.sujeto !== false;
    fila.observaciones = data.observaciones ?? fila.observaciones ?? null;

    if (Number(fila.viviendaPorcentaje) > 100) {
      throw new BadRequestException("El porcentaje de vivienda no puede pasar de 100");
    }
    return this.retencionRepo.save(fila);
  }

  /** Borra la ficha: la persona vuelve a quedar sin deducciones, no sin retención. */
  async borrarRetencion(anio: number, personaId: number): Promise<void> {
    await this.retencionRepo.delete({ anio, personaId });
  }

  async borrarParametros(anio: number): Promise<void> {
    const fila = await this.parametroRepo.findOne({ where: { anio } });
    if (!fila) throw new NotFoundException("Ese año no está cargado");
    await this.parametroRepo.remove(fila);
  }

  // ============================================================
  // CATÁLOGO DE BANCOS
  // ============================================================

  /**
   * Las entidades financieras con el código que las identifica en el archivo plano que se
   * sube al portal bancario. Ordenadas por nombre porque así se buscan; el código no
   * sigue ningún orden útil para leerlo.
   */
  listBancos(): Promise<ThBanco[]> {
    return this.bancoRepo.find({ order: { nombre: "ASC" } });
  }

  /**
   * Crea o actualiza una entidad. Es upsert por `codigo`, que es único: volver a guardar
   * el mismo código lo corrige en vez de duplicarlo.
   */
  async guardarBanco(data: Partial<ThBanco>): Promise<ThBanco> {
    const codigo = Number(data.codigo);
    if (!Number.isInteger(codigo) || codigo <= 0) {
      throw new BadRequestException("El código del banco es un número entero mayor que cero");
    }
    const nombre = (data.nombre ?? "").trim();
    if (!nombre) throw new BadRequestException("Escribe el nombre de la entidad");

    // Dos entidades con el mismo nombre harían ambigua la resolución desde la ficha de
    // personal, que casa por nombre y no por id.
    const repetido = (await this.bancoRepo.find()).find(
      (b) => b.nombre.trim().toUpperCase() === nombre.toUpperCase() && b.codigo !== codigo,
    );
    if (repetido) {
      throw new BadRequestException(
        `«${nombre}» ya está cargado con el código ${repetido.codigo}`,
      );
    }

    const fila = (await this.bancoRepo.findOne({ where: { codigo } })) ?? this.bancoRepo.create({ codigo });
    fila.nombre = nombre;
    fila.activo = data.activo ?? fila.activo ?? true;
    return this.bancoRepo.save(fila);
  }

  async borrarBanco(codigo: number): Promise<void> {
    const fila = await this.bancoRepo.findOne({ where: { codigo } });
    if (!fila) throw new NotFoundException("Ese banco no está en el catálogo");
    await this.bancoRepo.remove(fila);
  }
}
