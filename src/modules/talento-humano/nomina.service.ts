import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { ThPersona } from "../../database/entities/th-persona.entity";
import { ThPrestamo } from "../../database/entities/th-prestamo.entity";
import { ThNovedadNomina } from "../../database/entities/th-novedad-nomina.entity";
import { ThNominaLiquidacion } from "../../database/entities/th-nomina-liquidacion.entity";
import { User } from "../../database/entities/user.entity";

/**
 * Nómina: liquidación mensual de todos los empleados activos.
 *
 * Espeja el Excel "Prueba Nómina.xlsx" (hojas NOVEDADES NÓMINA y NÓMINA): días
 * trabajados, bonificación, incapacidad empresa, incapacidad empleado, incapacidad
 * otros, vacaciones y retención en la fuente son de digitación manual —igual que allá,
 * donde son casillas vacías que Talento Humano llena a mano cuando aplica, no fórmulas.
 *
 * Dos tablas, un mismo periodo ("2026-08"):
 *  - `th_novedades_nomina`: lo que se digita a mano cada mes, por empleado.
 *  - `th_nomina_liquidaciones`: la fotografía del cálculo, solo existe una vez que el
 *    periodo se **genera**. No se recalcula sola si después cambia el salario en
 *    `th_personal` — para eso hay que reabrir el periodo.
 */

export interface CamposNovedad {
  diasTrabajados?: number;
  horasExtrasValor?: string | number | null;
  recargoNocturnoValor?: string | number | null;
  bonificaciones?: string | number | null;
  embargo?: string | number | null;
  incapacidadEmpresa?: string | number | null;
  incapacidadEmpleado?: string | number | null;
  incapacidadOtros?: string | number | null;
  vacacionesHabiles?: string | number | null;
  vacacionesNoHabiles?: string | number | null;
  retencionFuente?: string | number | null;
  serviciosGruporecordar?: string | number | null;
  observaciones?: string | null;
}

export interface FilaNominaPreview {
  personaId: number;
  identificacion: string;
  nombre: string;
  cargo: string | null;
  proyecto: string | null;
  /**
   * true si esta persona tiene más de un contrato activo (varias empresas del grupo):
   * `prestamo` es su cuota completa, sin repartir entre proyectos, porque no hay regla
   * de Contabilidad para hacerlo todavía. Aviso para no dar por buena la cifra sin más.
   */
  multiEmpresa: boolean;
  salarioBasico: number;
  diasTrabajados: number;
  devengadoBasico: number;
  horasExtras: number;
  recargoNocturno: number;
  auxilioRodamiento: number;
  bonificacion: number;
  incapacidadEmpresa: number;
  incapacidadEmpleado: number;
  incapacidadOtros: number;
  vacacionesHabiles: number;
  vacacionesNoHabiles: number;
  auxilioTransporte: number;
  totalDevengado: number;
  ibc: number;
  salud: number;
  pension: number;
  fsp: number;
  retencionFuente: number;
  bonificacionDeduccion: number;
  prestamo: number;
  embargos: number;
  serviciosGruporecordar: number;
  totalDeduccion: number;
  netoPagar: number;
}

const PERIODO_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const num = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

@Injectable()
export class NominaService {
  constructor(
    @InjectRepository(ThPersona)
    private readonly personaRepo: Repository<ThPersona>,
    @InjectRepository(ThPrestamo)
    private readonly prestamoRepo: Repository<ThPrestamo>,
    @InjectRepository(ThNovedadNomina)
    private readonly novedadRepo: Repository<ThNovedadNomina>,
    @InjectRepository(ThNominaLiquidacion)
    private readonly liquidacionRepo: Repository<ThNominaLiquidacion>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private validarPeriodo(periodo: string): void {
    if (!PERIODO_RE.test(periodo)) {
      throw new BadRequestException('El periodo debe tener el formato "AAAA-MM", p. ej. "2026-08".');
    }
  }

  // ============================================================
  // NOVEDADES (lo manual, por empleado y periodo)
  // ============================================================

  /**
   * El personal activo del periodo, cada uno con su novedad guardada (o vacía si
   * todavía no se ha diligenciado). Es la nómina de personas sobre la que se va a
   * liquidar: quien no esté ACTIVO en `th_personal` no aparece.
   *
   * `prestamoCuota` va de referencia (como la columna PRESTAMO EMPLEADO del Excel): no
   * es editable acá, sale de la auxiliar CUOTA A DESCONTAR de la cartera de prestamos.
   */
  async listNovedades(
    periodo: string,
  ): Promise<Array<ThPersona & { novedad: ThNovedadNomina | null; prestamoCuota: number }>> {
    this.validarPeriodo(periodo);
    const [activos, novedades] = await Promise.all([
      this.personaRepo.find({ where: { estado: ILike("ACTIVO%") }, order: { nombre: "ASC" } }),
      this.novedadRepo.find({ where: { periodo } }),
    ]);
    const porPersona = new Map(novedades.map((n) => [n.personaId, n]));
    const cuotasPorPersona = await this.cuotasPrestamosPorPersona(activos);
    return activos.map((p) => ({
      ...p,
      novedad: porPersona.get(p.personaId) ?? null,
      prestamoCuota: cuotasPorPersona.get(p.personaId) ?? 0,
    }));
  }

  /**
   * Guarda la novedad de una persona en el periodo. Es upsert: una fila por
   * (periodo, personaId), no una por cada vez que Talento Humano le da a Guardar.
   *
   * La llave es `personaId`, no `identificacion`: quien tiene contrato en varias
   * empresas del grupo a la vez tiene un `persona_id` por cada una, y cada una lleva su
   * propia novedad — los días trabajados de un proyecto no son los del otro.
   */
  async guardarNovedad(
    periodo: string,
    personaId: number,
    identificacion: string,
    nombre: string,
    campos: CamposNovedad,
  ): Promise<ThNovedadNomina> {
    this.validarPeriodo(periodo);
    if (!personaId) throw new BadRequestException("Falta la persona a la que pertenece esta novedad");
    if (!identificacion?.trim()) throw new BadRequestException("Falta la identificación del empleado");

    if (await this.periodoGenerado(periodo)) {
      throw new BadRequestException(
        "Este periodo ya se generó. Reábrelo para volver a editar sus novedades.",
      );
    }

    let novedad = await this.novedadRepo.findOne({ where: { periodo, personaId } });
    if (!novedad) {
      novedad = this.novedadRepo.create({ periodo, personaId, identificacion, nombre });
    }
    Object.assign(novedad, {
      nombre,
      diasTrabajados: campos.diasTrabajados ?? novedad.diasTrabajados ?? 30,
      horasExtrasValor: campos.horasExtrasValor != null ? String(campos.horasExtrasValor) : novedad.horasExtrasValor,
      recargoNocturnoValor:
        campos.recargoNocturnoValor != null ? String(campos.recargoNocturnoValor) : novedad.recargoNocturnoValor,
      bonificaciones: campos.bonificaciones != null ? String(campos.bonificaciones) : novedad.bonificaciones,
      embargo: campos.embargo != null ? String(campos.embargo) : novedad.embargo,
      incapacidadEmpresa:
        campos.incapacidadEmpresa != null ? String(campos.incapacidadEmpresa) : novedad.incapacidadEmpresa,
      incapacidadEmpleado:
        campos.incapacidadEmpleado != null ? String(campos.incapacidadEmpleado) : novedad.incapacidadEmpleado,
      incapacidadOtros: campos.incapacidadOtros != null ? String(campos.incapacidadOtros) : novedad.incapacidadOtros,
      vacacionesHabiles:
        campos.vacacionesHabiles != null ? String(campos.vacacionesHabiles) : novedad.vacacionesHabiles,
      vacacionesNoHabiles:
        campos.vacacionesNoHabiles != null ? String(campos.vacacionesNoHabiles) : novedad.vacacionesNoHabiles,
      retencionFuente: campos.retencionFuente != null ? String(campos.retencionFuente) : novedad.retencionFuente,
      serviciosGruporecordar:
        campos.serviciosGruporecordar != null
          ? String(campos.serviciosGruporecordar)
          : novedad.serviciosGruporecordar,
      observaciones: campos.observaciones !== undefined ? campos.observaciones : novedad.observaciones,
    });
    return this.novedadRepo.save(novedad);
  }

  // ============================================================
  // CÁLCULO
  // ============================================================

  /**
   * Cuánto le descuentan de nómina este mes por préstamos.
   *
   * En el Excel no se toma `VALOR CUOTA` directamente: NOVEDADES NOMINA suma la columna
   * auxiliar `CUOTA A DESCONTAR` por `NOMBRE EN NOMINA`. Esa columna permite que
   * Contabilidad deje un préstamo con saldo sin descontarlo en el periodo.
   */
  private async cuotasPrestamosPorPersona(personas: ThPersona[]): Promise<Map<number, number>> {
    if (personas.length === 0) return new Map();

    const prestamos = await this.prestamoRepo.find();
    const cuotas = new Map<number, number>();
    const traeColumnasNomina = prestamos.some((p) => p.nombreNomina || p.cuotaDescontar != null);

    if (traeColumnasNomina) {
      const personasPorNombre = new Map<string, ThPersona[]>();
      for (const persona of personas) {
        const clave = this.claveNombre(persona.nombre);
        personasPorNombre.set(clave, [...(personasPorNombre.get(clave) ?? []), persona]);
      }
      for (const p of prestamos) {
        const cuota = num(p.cuotaDescontar);
        if (!p.nombreNomina || cuota <= 0) continue;
        for (const persona of personasPorNombre.get(this.claveNombre(p.nombreNomina)) ?? []) {
          cuotas.set(persona.personaId, (cuotas.get(persona.personaId) ?? 0) + cuota);
        }
      }
      return cuotas;
    }

    const idsActivos = new Set(personas.map((p) => p.identificacion));
    for (const p of prestamos) {
      if (!p.identificacion || !idsActivos.has(p.identificacion) || num(p.saldo) <= 0) continue;
      for (const persona of personas.filter((item) => item.identificacion === p.identificacion)) {
        cuotas.set(persona.personaId, (cuotas.get(persona.personaId) ?? 0) + num(p.valorCuota));
      }
    }
    return cuotas;
  }

  private claveNombre(nombre: string | null): string {
    return (nombre ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  /**
   * Liquida una fila: mismas fórmulas del Excel (proración por días, auxilio de
   * transporte si el básico + RN no supera 2 SMMLV, IBC sin los no salariales, salud y
   * pensión al 4%, FSP al 1% desde 4 SMMLV). Incapacidad empresa/empleado son el valor
   * que digitó Talento Humano en la novedad, tal cual —no se calculan acá.
   */
  private liquidarFila(
    persona: ThPersona,
    novedad: ThNovedadNomina | null,
    smmlv: number,
    auxTransporte: number,
    multiEmpresa: boolean,
    prestamoCuota: number,
  ): FilaNominaPreview {
    const salarioBasico = num(persona.salario);
    const diasTrabajados = novedad?.diasTrabajados ?? 30;
    const devengadoBasico = (salarioBasico / 30) * diasTrabajados;

    const horasExtras = num(novedad?.horasExtrasValor);
    const recargoNocturno = num(novedad?.recargoNocturnoValor);
    const auxilioRodamiento = (num(persona.auxilioRodamiento) / 30) * diasTrabajados;
    const bonificacion = num(novedad?.bonificaciones);

    const incapacidadEmpresa = num(novedad?.incapacidadEmpresa);
    const incapacidadEmpleado = num(novedad?.incapacidadEmpleado);
    const incapacidadOtros = num(novedad?.incapacidadOtros);

    const vacacionesHabiles = num(novedad?.vacacionesHabiles);
    const vacacionesNoHabiles = num(novedad?.vacacionesNoHabiles);

    const auxilioTransporteValor =
      salarioBasico + recargoNocturno < smmlv * 2 ? Math.round((auxTransporte * diasTrabajados) / 30) : 0;

    const totalDevengado =
      devengadoBasico +
      horasExtras +
      recargoNocturno +
      auxilioRodamiento +
      bonificacion +
      incapacidadEmpresa +
      incapacidadEmpleado +
      incapacidadOtros +
      vacacionesHabiles +
      vacacionesNoHabiles +
      auxilioTransporteValor;

    const ibc = totalDevengado - auxilioRodamiento - auxilioTransporteValor - bonificacion;
    const salud = ibc * 0.04;
    const pension = ibc * 0.04;
    const baseFsp = ibc - devengadoBasico + salarioBasico;
    const fsp = baseFsp > smmlv * 4 ? Math.round((salarioBasico * 0.01 * diasTrabajados) / 30) : 0;
    const retencionFuente = num(novedad?.retencionFuente);
    const bonificacionDeduccion = bonificacion;
    const prestamo = prestamoCuota;
    const embargos = num(novedad?.embargo);
    const serviciosGruporecordar = num(novedad?.serviciosGruporecordar);

    const totalDeduccion =
      salud + pension + fsp + retencionFuente + bonificacionDeduccion + prestamo + embargos + serviciosGruporecordar;
    const netoPagar = totalDevengado - totalDeduccion;

    return {
      personaId: persona.personaId,
      identificacion: persona.identificacion,
      nombre: persona.nombre,
      cargo: persona.cargo,
      proyecto: persona.empresaProyecto,
      multiEmpresa,
      salarioBasico,
      diasTrabajados,
      devengadoBasico,
      horasExtras,
      recargoNocturno,
      auxilioRodamiento,
      bonificacion,
      incapacidadEmpresa,
      incapacidadEmpleado,
      incapacidadOtros,
      vacacionesHabiles,
      vacacionesNoHabiles,
      auxilioTransporte: auxilioTransporteValor,
      totalDevengado,
      ibc,
      salud,
      pension,
      fsp,
      retencionFuente,
      bonificacionDeduccion,
      prestamo,
      embargos,
      serviciosGruporecordar,
      totalDeduccion,
      netoPagar,
    };
  }

  /** True si el periodo ya tiene liquidación generada (cerrada). */
  async periodoGenerado(periodo: string): Promise<boolean> {
    const count = await this.liquidacionRepo.count({ where: { periodo } });
    return count > 0;
  }

  /**
   * La nómina del periodo. Si ya se generó, es la fotografía guardada (fija). Si no,
   * es una vista previa calculada al vuelo con lo que haya en las novedades hasta
   * ahora — sirve para revisar antes de generar, pero no queda guardada.
   */
  async getNomina(
    periodo: string,
    smmlv?: number,
    auxTransporte?: number,
  ): Promise<{ generado: boolean; filas: FilaNominaPreview[] }> {
    this.validarPeriodo(periodo);
    const generadas = await this.liquidacionRepo.find({ where: { periodo }, order: { nombre: "ASC" } });
    if (generadas.length > 0) {
      return { generado: true, filas: generadas.map(this.aPreview) };
    }

    if (!smmlv || !auxTransporte) {
      return { generado: false, filas: [] };
    }
    const personas = await this.listNovedades(periodo);
    const multiEmpresaPorId = this.marcarMultiEmpresa(personas);
    const filas = personas.map((p) =>
      this.liquidarFila(
        p,
        p.novedad,
        smmlv,
        auxTransporte,
        multiEmpresaPorId.get(p.identificacion) ?? false,
        p.prestamoCuota,
      ),
    );
    filas.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return { generado: false, filas };
  }

  /**
   * Identificaciones con más de un `persona_id` activo: alguien con contrato en varias
   * empresas del grupo a la vez. Sirve para avisar en la fila de Préstamo, cuya cuota se
   * calcula por identificación y por eso se repite completa en cada una de sus filas.
   */
  private marcarMultiEmpresa(personas: ThPersona[]): Map<string, boolean> {
    const conteo = new Map<string, number>();
    for (const p of personas) conteo.set(p.identificacion, (conteo.get(p.identificacion) ?? 0) + 1);
    return new Map([...conteo.entries()].map(([id, n]) => [id, n > 1]));
  }

  private aPreview(l: ThNominaLiquidacion): FilaNominaPreview {
    return {
      personaId: l.personaId,
      identificacion: l.identificacion,
      nombre: l.nombre,
      cargo: l.cargo,
      proyecto: l.proyecto,
      multiEmpresa: l.multiEmpresa,
      salarioBasico: num(l.salarioBasico),
      diasTrabajados: l.diasTrabajados,
      devengadoBasico: num(l.devengadoBasico),
      horasExtras: num(l.horasExtras),
      recargoNocturno: num(l.recargoNocturno),
      auxilioRodamiento: num(l.auxilioRodamiento),
      bonificacion: num(l.bonificacion),
      incapacidadEmpresa: num(l.incapacidadEmpresa),
      incapacidadEmpleado: num(l.incapacidadEmpleado),
      incapacidadOtros: num(l.incapacidadOtros),
      vacacionesHabiles: num(l.vacacionesHabiles),
      vacacionesNoHabiles: num(l.vacacionesNoHabiles),
      auxilioTransporte: num(l.auxilioTransporte),
      totalDevengado: num(l.totalDevengado),
      ibc: num(l.ibc),
      salud: num(l.salud),
      pension: num(l.pension),
      fsp: num(l.fsp),
      retencionFuente: num(l.retencionFuente),
      bonificacionDeduccion: num(l.bonificacionDeduccion),
      prestamo: num(l.prestamo),
      embargos: num(l.embargos),
      serviciosGruporecordar: num(l.serviciosGruporecordar),
      totalDeduccion: num(l.totalDeduccion),
      netoPagar: num(l.netoPagar),
    };
  }

  /**
   * Genera y guarda la nómina del periodo: una fila por cada empleado activo, tal como
   * está en ese momento. Falla si el periodo ya se generó — hay que reabrirlo primero,
   * para que generar dos veces no duplique filas.
   */
  async generarNomina(
    periodo: string,
    smmlv: number,
    auxTransporte: number,
    userId: number,
  ): Promise<{ filas: FilaNominaPreview[] }> {
    this.validarPeriodo(periodo);
    if (!smmlv || smmlv <= 0) throw new BadRequestException("Indica el salario mínimo del año.");
    if (!auxTransporte || auxTransporte <= 0) throw new BadRequestException("Indica el auxilio de transporte.");
    if (await this.periodoGenerado(periodo)) {
      throw new BadRequestException("Este periodo ya está generado.");
    }

    const personas = await this.listNovedades(periodo);
    if (personas.length === 0) {
      throw new BadRequestException("No hay personal activo para liquidar.");
    }

    const user = await this.userRepo.findOne({ where: { userId } });
    const ahora = new Date();

    const multiEmpresaPorId = this.marcarMultiEmpresa(personas);
    const filas = personas.map((p) =>
      this.liquidarFila(
        p,
        p.novedad,
        smmlv,
        auxTransporte,
        multiEmpresaPorId.get(p.identificacion) ?? false,
        p.prestamoCuota,
      ),
    );

    const registros = filas.map((f) =>
      this.liquidacionRepo.create({
        periodo,
        personaId: f.personaId,
        identificacion: f.identificacion,
        nombre: f.nombre,
        cargo: f.cargo,
        proyecto: f.proyecto,
        multiEmpresa: f.multiEmpresa,
        salarioBasico: String(f.salarioBasico),
        diasTrabajados: f.diasTrabajados,
        devengadoBasico: String(f.devengadoBasico),
        horasExtras: String(f.horasExtras),
        recargoNocturno: String(f.recargoNocturno),
        auxilioRodamiento: String(f.auxilioRodamiento),
        bonificacion: String(f.bonificacion),
        incapacidadEmpresa: String(f.incapacidadEmpresa),
        incapacidadEmpleado: String(f.incapacidadEmpleado),
        incapacidadOtros: String(f.incapacidadOtros),
        vacacionesHabiles: String(f.vacacionesHabiles),
        vacacionesNoHabiles: String(f.vacacionesNoHabiles),
        auxilioTransporte: String(f.auxilioTransporte),
        totalDevengado: String(f.totalDevengado),
        ibc: String(f.ibc),
        salud: String(f.salud),
        pension: String(f.pension),
        fsp: String(f.fsp),
        retencionFuente: String(f.retencionFuente),
        bonificacionDeduccion: String(f.bonificacionDeduccion),
        prestamo: String(f.prestamo),
        embargos: String(f.embargos),
        serviciosGruporecordar: String(f.serviciosGruporecordar),
        totalDeduccion: String(f.totalDeduccion),
        netoPagar: String(f.netoPagar),
        generadoPor: user?.nombre ?? null,
        generadoEn: ahora,
      }),
    );
    await this.liquidacionRepo.save(registros);

    filas.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return { filas };
  }

  /** Borra la liquidación guardada del periodo, para poder corregir y generarlo de nuevo. */
  async reabrirNomina(periodo: string): Promise<void> {
    this.validarPeriodo(periodo);
    const existe = await this.periodoGenerado(periodo);
    if (!existe) throw new NotFoundException("Este periodo no está generado.");
    await this.liquidacionRepo.delete({ periodo });
  }

  /** Total devengado, deducido y neto del periodo, generado o en vista previa. */
  async resumenNomina(
    periodo: string,
    smmlv?: number,
    auxTransporte?: number,
  ): Promise<{ generado: boolean; empleados: number; totalDevengado: number; totalDeduccion: number; netoPagar: number }> {
    const { generado, filas } = await this.getNomina(periodo, smmlv, auxTransporte);
    return {
      generado,
      empleados: filas.length,
      totalDevengado: filas.reduce((s, f) => s + f.totalDevengado, 0),
      totalDeduccion: filas.reduce((s, f) => s + f.totalDeduccion, 0),
      netoPagar: filas.reduce((s, f) => s + f.netoPagar, 0),
    };
  }

  /** Los periodos que ya tienen algo guardado (novedades o liquidación), más recientes primero. */
  async listPeriodos(): Promise<string[]> {
    const [n, l] = await Promise.all([
      this.novedadRepo
        .createQueryBuilder("n")
        .select("DISTINCT n.periodo", "periodo")
        .getRawMany<{ periodo: string }>(),
      this.liquidacionRepo
        .createQueryBuilder("l")
        .select("DISTINCT l.periodo", "periodo")
        .getRawMany<{ periodo: string }>(),
    ]);
    const periodos = new Set([...n.map((x) => x.periodo), ...l.map((x) => x.periodo)]);
    return [...periodos].sort().reverse();
  }
}
