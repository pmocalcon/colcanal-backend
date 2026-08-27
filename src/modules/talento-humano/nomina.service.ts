import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, ILike, In, Repository } from "typeorm";
import { ThPersona } from "../../database/entities/th-persona.entity";
import { ThPrestamo } from "../../database/entities/th-prestamo.entity";
import { ThPrestamoPago } from "../../database/entities/th-prestamo-pago.entity";
import { ThIncapacidad } from "../../database/entities/th-incapacidad.entity";
import { ThHorasExtra } from "../../database/entities/th-horas-extra.entity";
import { ThHorasExtraDetalle } from "../../database/entities/th-horas-extra-detalle.entity";
import { ThVacacion } from "../../database/entities/th-vacacion.entity";
import { ThNovedadNomina } from "../../database/entities/th-novedad-nomina.entity";
import { ThNominaLiquidacion } from "../../database/entities/th-nomina-liquidacion.entity";
import { User } from "../../database/entities/user.entity";

/**
 * Nómina: liquidación mensual de todos los empleados activos.
 *
 * Espeja el Excel "Prueba Nómina.xlsx" (hojas NOVEDADES NÓMINA y NÓMINA), con una
 * diferencia deliberada: **lo que ya vive en un formato no se vuelve a digitar**. Las
 * horas extras y el recargo nocturno salen de las planillas GTH-016-F aprobadas, la
 * incapacidad de `th_incapacidades` y las vacaciones de los GTH-018-F aprobados. Queda
 * de digitación solo lo que no nace de ningún formato: días trabajados, bonificación,
 * embargo, retención en la fuente y servicios GrupoRecordar.
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

/**
 * Lo que los formatos ya aprobados aportan a la novedad de una persona en el periodo.
 *
 * `null` es "ningún formato dice nada de esto", que no es lo mismo que cero: si alguien
 * digitó un valor a mano, ese manda; si no hay ni lo uno ni lo otro, entra cero.
 * `origen` explica de dónde salió cada cifra, para que en pantalla no aparezca un número
 * sin dueño.
 */
export interface SugerenciasNovedad {
  horasExtrasValor: number | null;
  recargoNocturnoValor: number | null;
  incapacidadEmpresa: number | null;
  incapacidadEmpleado: number | null;
  vacacionesHabiles: number | null;
  /** La cuota de la póliza funeraria que tiene la persona en su ficha. */
  serviciosGruporecordar: number | null;
  origen: string[];
}

export const SUGERENCIAS_VACIAS = (): SugerenciasNovedad => ({
  horasExtrasValor: null,
  recargoNocturnoValor: null,
  incapacidadEmpresa: null,
  incapacidadEmpleado: null,
  vacacionesHabiles: null,
  serviciosGruporecordar: null,
  origen: [],
});

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

/** Qué quedó anotado en la cartera de préstamos al mandar la liquidación de un periodo. */
export interface CuotasEnCartera {
  /** Cuotas nuevas que se anotaron. */
  creadas: number;
  /** Préstamos que ya tenían la cuota de ese mes y se dejaron como estaban. */
  yaEstaban: number;
  /** Cuánto sumó lo anotado. */
  total: number;
  /** Lo que no se pudo anotar y hay que mirar a mano. */
  avisos: string[];
}

const num = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/**
 * El recargo nocturno, **espejo de `TIPOS_HORA_EXTRA`** en `gestion-conocimiento.service.ts`.
 *
 * Hace falta acá para separar lo que la planilla guardó junto: `liquidacion` de cada
 * renglón trae las cinco clases de hora sumadas, pero la nómina las lleva en dos
 * columnas distintas —H. EXTRAS y RN—, y el RN no entra al auxilio de transporte igual
 * que las demás.
 */
const cop = (v: number) => "$" + Math.round(v).toLocaleString("es-CO");

const FACTOR_RECARGO_NOCTURNO = 0.35;

/** Lo que el empleado recibe por los días de incapacidad que asume la EPS: dos tercios. */
const TASA_INCAPACIDAD_EMPLEADO = 2 / 3;

const MESES_ES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};

/**
 * "Agosto 2026" → "2026-08".
 *
 * El periodo de una planilla de horas extras es texto libre: en el formato GTH-016-F se
 * escribe a mano y nadie lo normaliza. Devuelve `null` cuando no se entiende, que es
 * preferible a arrimarlo al mes que se está liquidando: colgarle a alguien las horas del
 * mes equivocado es peor que no traerlas y que las digiten.
 */
function periodoDeTextoLibre(texto: string | null | undefined): string | null {
  if (!texto) return null;
  // No hace falta quitar tildes: ningún mes en español lleva.
  const t = String(texto).toLowerCase().trim();

  let m = t.match(/^(\d{4})[-/](\d{1,2})$/);
  if (m) return `${m[1]}-${String(Number(m[2])).padStart(2, "0")}`;

  m = t.match(/^(\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[2]}-${String(Number(m[1])).padStart(2, "0")}`;

  m = t.match(/([a-z]+)\s*(?:de\s*)?(\d{4})/);
  if (m && MESES_ES[m[1]]) return `${m[2]}-${String(MESES_ES[m[1]]).padStart(2, "0")}`;

  return null;
}

/**
 * Si el contrato es de prestación de servicios, que **no se liquida en nómina**.
 *
 * Quien está por prestación de servicios factura: no tiene básico por días, ni auxilio de
 * transporte, ni salud y pensión descontadas por la empresa —los paga él como
 * independiente—. Liquidarlo con las reglas de un empleado le inventaba deducciones que
 * nadie le hace y lo metía en el archivo del banco entre los sueldos del mes.
 *
 * Se compara sin tildes porque la base tiene las dos formas —«PRESTACIÓN DE SERVICIO» y
 * «PRESTACION DE SERVICIO»—, según cómo se digitó cada ficha, y por el comienzo porque
 * unas dicen «SERVICIO» y otras «SERVICIOS».
 */
export const esPrestacionDeServicios = (tipoContrato: string | null | undefined): boolean =>
  (tipoContrato ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .startsWith("PRESTACION DE SERVICIO");

@Injectable()
export class NominaService {
  constructor(
    @InjectRepository(ThPersona)
    private readonly personaRepo: Repository<ThPersona>,
    @InjectRepository(ThPrestamo)
    private readonly prestamoRepo: Repository<ThPrestamo>,
    @InjectRepository(ThPrestamoPago)
    private readonly prestamoPagoRepo: Repository<ThPrestamoPago>,
    @InjectRepository(ThIncapacidad)
    private readonly incapacidadRepo: Repository<ThIncapacidad>,
    @InjectRepository(ThHorasExtra)
    private readonly horasExtraRepo: Repository<ThHorasExtra>,
    @InjectRepository(ThHorasExtraDetalle)
    private readonly horasExtraDetalleRepo: Repository<ThHorasExtraDetalle>,
    @InjectRepository(ThVacacion)
    private readonly vacacionRepo: Repository<ThVacacion>,
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
   *
   * `sugerencias` es lo que aportan los formatos ya aprobados —horas extras, incapacidad
   * y vacaciones—, para que no haya que volver a digitarlo.
   */
  async listNovedades(
    periodo: string,
    smmlv?: number,
  ): Promise<
    Array<
      ThPersona & {
        novedad: ThNovedadNomina | null;
        prestamoCuota: number;
        sugerencias: SugerenciasNovedad;
      }
    >
  > {
    this.validarPeriodo(periodo);
    const [enBase, novedades] = await Promise.all([
      this.personaRepo.find({ where: { estado: ILike("ACTIVO%") }, order: { nombre: "ASC" } }),
      this.novedadRepo.find({ where: { periodo } }),
    ]);
    /*
     * El filtro se hace acá y no en el `where` a propósito: `Not(ILike(...))` en SQL deja
     * por fuera las fichas con `tipo_contrato` en nulo —NULL no es distinto de nada—, y
     * son justo las que sí hay que liquidar.
     *
     * Esto solo afecta lo que se calcula de aquí en adelante. Las liquidaciones ya
     * generadas se leen de `th_liquidaciones` y se quedan como se pagaron: la nómina de
     * un mes cerrado es un hecho, no algo que se recalcula.
     */
    const activos = enBase.filter((p) => !esPrestacionDeServicios(p.tipoContrato));
    const porPersona = new Map(novedades.map((n) => [n.personaId, n]));
    const [cuotasPorPersona, sugerenciasPorPersona] = await Promise.all([
      this.cuotasPrestamosPorPersona(activos, periodo),
      this.sugerenciasDelPeriodo(activos, periodo, smmlv),
    ]);
    return activos.map((p) => ({
      ...p,
      novedad: porPersona.get(p.personaId) ?? null,
      prestamoCuota: cuotasPorPersona.get(p.personaId) ?? 0,
      sugerencias: sugerenciasPorPersona.get(p.personaId) ?? SUGERENCIAS_VACIAS(),
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

    /**
     * Qué guardar en una columna `numeric` según lo que llegó del formulario:
     *
     *  - el campo no vino  → se deja como estaba (no se pisa lo que no se editó)
     *  - vino vacío        → `null`, no `""`: Postgres no acepta cadena vacía en un
     *                        `numeric`, y además vacío es justo lo que hace que valga el
     *                        valor del formato aprobado
     *  - vino con algo     → ese valor
     */
    const cifra = (entrada: string | number | null | undefined, actual: string | null): string | null => {
      if (entrada === undefined) return actual;
      if (entrada === null || String(entrada).trim() === "") return null;
      return String(entrada);
    };

    Object.assign(novedad, {
      nombre,
      diasTrabajados: campos.diasTrabajados ?? novedad.diasTrabajados ?? 30,
      horasExtrasValor: cifra(campos.horasExtrasValor, novedad.horasExtrasValor),
      recargoNocturnoValor: cifra(campos.recargoNocturnoValor, novedad.recargoNocturnoValor),
      bonificaciones: cifra(campos.bonificaciones, novedad.bonificaciones),
      embargo: cifra(campos.embargo, novedad.embargo),
      incapacidadEmpresa: cifra(campos.incapacidadEmpresa, novedad.incapacidadEmpresa),
      incapacidadEmpleado: cifra(campos.incapacidadEmpleado, novedad.incapacidadEmpleado),
      incapacidadOtros: cifra(campos.incapacidadOtros, novedad.incapacidadOtros),
      vacacionesHabiles: cifra(campos.vacacionesHabiles, novedad.vacacionesHabiles),
      vacacionesNoHabiles: cifra(campos.vacacionesNoHabiles, novedad.vacacionesNoHabiles),
      retencionFuente: cifra(campos.retencionFuente, novedad.retencionFuente),
      serviciosGruporecordar: cifra(campos.serviciosGruporecordar, novedad.serviciosGruporecordar),
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
  private async cuotasPrestamosPorPersona(
    personas: ThPersona[],
    periodo: string,
  ): Promise<Map<number, number>> {
    const cuotas = new Map<number, number>();
    for (const c of await this.cruceDePrestamos(personas, periodo)) {
      cuotas.set(c.personaId, (cuotas.get(c.personaId) ?? 0) + c.cuota + c.abono);
    }
    return cuotas;
  }

  /**
   * El descuento de préstamos del periodo, abierto **préstamo por préstamo**.
   *
   * De acá salen dos cosas que tienen que dar exactamente lo mismo: lo que la nómina le
   * descuenta a cada quien, y lo que después se le anota a cada préstamo en la cartera.
   * Se calculan del mismo cruce a propósito —con dos cálculos parecidos, que sigan
   * coincidiendo el año entrante sería cuestión de suerte—.
   *
   * Sale un renglón por cada cruce préstamo–persona, no uno por préstamo: quien tiene
   * contrato en dos empresas del grupo cruza dos veces con el mismo préstamo, y esa es
   * justamente la razón de que la cuota se le repita completa en sus dos filas de la
   * liquidación. Quien vaya a anotarla en la cartera tiene que anotarla **una sola vez**.
   *
   * La cuota y el abono van separados porque en la cartera no son lo mismo: el abono ya
   * está registrado —lo registró quien lo capturó— y solo la cuota está por anotar.
   */
  private async cruceDePrestamos(
    gente: Array<{ personaId: number; identificacion: string; nombre: string }>,
    periodo: string,
  ): Promise<Array<{ prestamoId: number; personaId: number; cuota: number; abono: number }>> {
    if (gente.length === 0) return [];

    const prestamos = await this.prestamoRepo.find();
    const cruce: Array<{ prestamoId: number; personaId: number; cuota: number; abono: number }> = [];

    // Abonos extraordinarios que se pagan por nómina en este periodo. Van sumados a la
    // cuota, que es lo que antes se resolvía escribiendo el total a mano en la hoja
    // —a CAVADIA le quedaba $3.305.273 en vez de su cuota de $305.273—.
    const [anio, mes] = periodo.split("-").map(Number);
    const abonos = await this.prestamoPagoRepo.find({
      where: { anio, mes, tipo: "ABONO", medio: "NOMINA" },
    });
    const abonoPorPrestamo = new Map<number, number>();
    for (const a of abonos) {
      abonoPorPrestamo.set(a.prestamoId, (abonoPorPrestamo.get(a.prestamoId) ?? 0) + num(a.valor));
    }
    const traeColumnasNomina = prestamos.some((p) => p.nombreNomina || p.cuotaDescontar != null);

    if (traeColumnasNomina) {
      const personasPorNombre = new Map<string, typeof gente>();
      for (const persona of gente) {
        const clave = this.claveNombre(persona.nombre);
        personasPorNombre.set(clave, [...(personasPorNombre.get(clave) ?? []), persona]);
      }
      for (const p of prestamos) {
        const abono = abonoPorPrestamo.get(p.prestamoId) ?? 0;
        const cuota = num(p.cuotaDescontar);
        if (!p.nombreNomina || cuota + abono <= 0) continue;
        for (const persona of personasPorNombre.get(this.claveNombre(p.nombreNomina)) ?? []) {
          cruce.push({ prestamoId: p.prestamoId, personaId: persona.personaId, cuota, abono });
        }
      }
      return cruce;
    }

    const idsActivos = new Set(gente.map((p) => p.identificacion));
    for (const p of prestamos) {
      if (!p.identificacion || !idsActivos.has(p.identificacion) || num(p.saldo) <= 0) continue;
      const abono = abonoPorPrestamo.get(p.prestamoId) ?? 0;
      const cuota = num(p.valorCuota);
      for (const persona of gente.filter((item) => item.identificacion === p.identificacion)) {
        cruce.push({ prestamoId: p.prestamoId, personaId: persona.personaId, cuota, abono });
      }
    }
    return cruce;
  }

  /**
   * Le devuelve a la cartera de préstamos las cuotas que la nómina del periodo descontó.
   *
   * Hasta ahora la nómina descontaba y la cartera no se enteraba: el saldo se quedaba
   * donde lo dejó la importación del Excel y el plan de pagos marcaba el mes como
   * pendiente aunque a la persona ya se lo hubieran quitado del sueldo. Solo se movía si
   * alguien entraba a anotar el abono a mano, y acordarse todos los meses de sesenta
   * préstamos no es un procedimiento.
   *
   * Va enganchado a **mandar** la liquidación y no a generarla. Generar se deshace
   * —`reabrirNomina` borra el periodo para poder corregirlo— y mandar no: mandar es lo
   * que arma la solicitud de pago, y el descuento ocurre cuando se gira.
   *
   * **Es idempotente por préstamo y mes.** Mandar dos veces el mismo periodo no descuenta
   * dos veces: el préstamo que ya tiene su cuota de ese mes se deja como está. Es la
   * garantía que más importa acá, porque el envío se puede anular y volver a mandar, y
   * una cuota repetida baja el saldo de más sin que nadie lo note hasta que alguien cuadra
   * la cartera meses después.
   *
   * Nunca borra ni corrige lo que ya está. Si lo anotado no es lo que hoy correspondería
   * —porque entre un envío y otro cambió la ficha del préstamo—, lo dice en un aviso y
   * deja la fila quieta: quien la revise decide, con el botón de borrar el pago que ya
   * existe en el detalle del préstamo.
   */
  async registrarCuotasEnCartera(periodo: string): Promise<CuotasEnCartera> {
    this.validarPeriodo(periodo);
    const [anio, mes] = periodo.split("-").map(Number);

    const liquidadas = await this.liquidacionRepo.find({ where: { periodo } });
    if (liquidadas.length === 0) {
      return {
        creadas: 0, yaEstaban: 0, total: 0,
        avisos: [`La nómina de ${periodo} no está generada: no hay cuotas que anotar.`],
      };
    }

    const cruce = await this.cruceDePrestamos(liquidadas, periodo);
    const avisos: string[] = [];

    /*
     * Antes de tocar la cartera se comprueba que el cruce dé lo mismo que la liquidación
     * guardada.
     *
     * Si no cuadra es porque la ficha del préstamo cambió entre generar la nómina y
     * mandarla. Anotar entonces la cuota de hoy contra el descuento de ayer dejaría la
     * cartera afirmando que se le quitó una plata que no se le quitó, y eso es peor que
     * no anotar nada. Se deja por fuera a esa persona —solo a esa— y se dice.
     */
    const calculadoPorPersona = new Map<number, number>();
    for (const c of cruce) {
      calculadoPorPersona.set(
        c.personaId,
        (calculadoPorPersona.get(c.personaId) ?? 0) + c.cuota + c.abono,
      );
    }
    const enDesacuerdo = new Set<number>();
    for (const l of liquidadas) {
      const calculado = calculadoPorPersona.get(l.personaId) ?? 0;
      if (Math.round(calculado) === Math.round(num(l.prestamo))) continue;
      enDesacuerdo.add(l.personaId);
      avisos.push(
        `${l.nombre}: la nómina le descontó ${cop(num(l.prestamo))} de préstamos y la ` +
          `cartera hoy daría ${cop(calculado)}. No se le anotó nada; revísalo a mano.`,
      );
    }

    // Un préstamo puede cruzar con dos personas —la misma cédula en dos empresas del
    // grupo—, pero la cuota se descontó una sola vez y se anota una sola vez.
    const porPrestamo = new Map<number, number>();
    for (const c of cruce) {
      if (enDesacuerdo.has(c.personaId)) continue;
      porPrestamo.set(c.prestamoId, c.cuota);
    }

    const nombrePorPrestamo = new Map(
      (await this.prestamoRepo.find()).map((p) => [p.prestamoId, p.nombre ?? `préstamo ${p.prestamoId}`]),
    );

    let creadas = 0;
    let yaEstaban = 0;
    let total = 0;

    for (const [prestamoId, cuota] of porPrestamo) {
      // Los meses de puro abono no llevan cuota: el abono ya quedó registrado cuando se
      // capturó, y anotarlo otra vez acá sería contarlo dos veces.
      if (!(cuota > 0)) continue;

      await this.prestamoPagoRepo.manager.transaction(async (manager) => {
        // Dentro de la transacción y no antes: entre leer y escribir cabe otro envío.
        const yaHay = await manager.find(ThPrestamoPago, {
          where: { prestamoId, anio, mes, tipo: "CUOTA", medio: "NOMINA" },
        });
        if (yaHay.length > 0) {
          yaEstaban++;
          const anotado = yaHay.reduce((sum, p) => sum + num(p.valor), 0);
          if (Math.round(anotado) !== Math.round(cuota)) {
            avisos.push(
              `${nombrePorPrestamo.get(prestamoId)}: su préstamo ya tenía anotados ` +
                `${cop(anotado)} en ${periodo} y ahora la cuota es ${cop(cuota)}. Se dejó lo ` +
                `que estaba; si sobra, bórralo desde el detalle del préstamo.`,
            );
          }
          return;
        }

        const prestamo = await manager.findOne(ThPrestamo, { where: { prestamoId } });
        if (!prestamo) return;

        await manager.save(
          manager.create(ThPrestamoPago, {
            prestamoId,
            anio,
            mes,
            valor: String(cuota),
            tipo: "CUOTA",
            medio: "NOMINA",
            fecha: null,
            observaciones: `Descontado en la nómina de ${periodo}.`,
          }),
        );
        await manager.update(ThPrestamo, prestamoId, {
          valorCancelado: String(num(prestamo.valorCancelado) + cuota),
          saldo: String(num(prestamo.saldo) - cuota),
        });
        creadas++;
        total += cuota;
      });
    }

    return { creadas, yaEstaban, total, avisos };
  }

  /** El primer y el último día del periodo, en ISO, para acotar por fecha. */
  private rangoDelPeriodo(periodo: string): { inicio: string; fin: string } {
    const [anio, mes] = periodo.split("-").map(Number);
    const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
    return { inicio: `${periodo}-01`, fin: `${periodo}-${String(ultimo).padStart(2, "0")}` };
  }

  /**
   * A cuál de los contratos de una cédula se le carga una novedad.
   *
   * Las tablas de incapacidades, planillas y vacaciones se llevan por cédula, no por
   * contrato. Quien tiene contrato en varias empresas del grupo tiene una fila por cada
   * una, y **repetirle la novedad en todas le multiplicaría el devengado**. Se carga a
   * una sola: la del proyecto que nombra el formato si coincide, y si no, la del
   * contrato mejor pagado, que es el principal.
   */
  private contratoQueRecibe(candidatos: ThPersona[], proyecto?: string | null): ThPersona {
    if (proyecto) {
      const clave = this.claveNombre(proyecto);
      const exacto = candidatos.find((p) => this.claveNombre(p.empresaProyecto) === clave);
      if (exacto) return exacto;
    }
    return candidatos.reduce((a, b) => (num(b.salario) > num(a.salario) ? b : a));
  }

  /**
   * Lo que los formatos ya aprobados aportan al periodo, por persona.
   *
   * Es lo que en el Excel se copiaba a mano de una hoja a otra. Nada de esto se guarda
   * en `th_novedades_nomina`: se recalcula cada vez, para que corregir una incapacidad o
   * una planilla se refleje en la nómina sin tener que volver a digitar nada.
   *
   * `smmlv` solo hace falta para el piso legal de la incapacidad del empleado; sin él
   * ese campo queda en `null` en vez de salir por debajo del mínimo.
   */
  private async sugerenciasDelPeriodo(
    personas: ThPersona[],
    periodo: string,
    smmlv?: number,
  ): Promise<Map<number, SugerenciasNovedad>> {
    const porPersona = new Map<number, SugerenciasNovedad>();
    for (const p of personas) {
      const s = SUGERENCIAS_VACIAS();
      // La póliza funeraria no depende del periodo: es la misma cuota todos los meses y
      // vive en la ficha de la persona, no en un formato.
      const poliza = num(p.polizaFuneraria);
      if (poliza > 0) {
        s.serviciosGruporecordar = poliza;
        s.origen.push("Póliza funeraria");
      }
      porPersona.set(p.personaId, s);
    }
    if (personas.length === 0) return porPersona;

    const { inicio, fin } = this.rangoDelPeriodo(periodo);
    const identificaciones = [...new Set(personas.map((p) => p.identificacion))];
    const porIdentificacion = new Map<string, ThPersona[]>();
    for (const p of personas) {
      porIdentificacion.set(p.identificacion, [...(porIdentificacion.get(p.identificacion) ?? []), p]);
    }

    const [incapacidades, planillas, vacaciones] = await Promise.all([
      // La incapacidad se carga al mes en que empieza, entera. Partirla entre dos meses
      // exigiría prorratear un valor que ya viene calculado y cuadrado con la EPS.
      this.incapacidadRepo.find({
        where: { identificacion: In(identificaciones), fechaInicio: Between(inicio, fin) },
      }),
      // El periodo de la planilla es texto libre: toca traerlas y filtrarlas en memoria.
      this.horasExtraRepo.find({ where: { identificacion: In(identificaciones) } }),
      this.vacacionRepo.find({
        where: { identificacion: In(identificaciones), fechaInicio: Between(inicio, fin) },
      }),
    ]);

    const suma = (persona: ThPersona, campo: keyof SugerenciasNovedad, valor: number, origen: string) => {
      const s = porPersona.get(persona.personaId);
      if (!s || valor === 0) return;
      (s[campo] as number | null) = ((s[campo] as number | null) ?? 0) + valor;
      if (!s.origen.includes(origen)) s.origen.push(origen);
    };

    for (const inc of incapacidades) {
      const candidatos = porIdentificacion.get(inc.identificacion);
      if (!candidatos?.length) continue;
      const persona = this.contratoQueRecibe(candidatos, inc.proyecto);

      suma(persona, "incapacidadEmpresa", num(inc.valorAsumidoEmpresa), "Incapacidades");

      // Los días que asume la EPS los adelanta la empresa al empleado a dos tercios del
      // salario, sin bajar del mínimo. Es la fórmula de la hoja NÓMINA, pero con los
      // días reales de la incapacidad en vez de una constante igual para todos.
      const dias = inc.diasEntidad ?? 0;
      if (dias > 0 && smmlv) {
        const salario = num(persona.salario);
        const tarifa = Math.max(salario * TASA_INCAPACIDAD_EMPLEADO, smmlv);
        suma(persona, "incapacidadEmpleado", (tarifa / 30) * dias, "Incapacidades");
      }
    }

    const planillasDelPeriodo = planillas.filter((pl) => periodoDeTextoLibre(pl.periodo) === periodo);
    if (planillasDelPeriodo.length > 0) {
      const detalles = await this.horasExtraDetalleRepo.find({
        where: { horasExtraId: In(planillasDelPeriodo.map((pl) => pl.horasExtraId)) },
      });
      const detallePorPlanilla = new Map<number, ThHorasExtraDetalle[]>();
      for (const d of detalles) {
        detallePorPlanilla.set(d.horasExtraId, [...(detallePorPlanilla.get(d.horasExtraId) ?? []), d]);
      }
      for (const pl of planillasDelPeriodo) {
        const candidatos = pl.identificacion ? porIdentificacion.get(pl.identificacion) : undefined;
        if (!candidatos?.length) continue;
        const persona = this.contratoQueRecibe(candidatos);

        // La planilla guardó las cinco clases de hora sumadas en `liquidacion`; la
        // nómina las quiere en dos columnas. El RN se recalcula y el resto es la resta.
        const valorHora = num(pl.valorHora);
        const rn = (detallePorPlanilla.get(pl.horasExtraId) ?? []).reduce(
          (s, d) => s + num(d.recargoNocturno) * FACTOR_RECARGO_NOCTURNO * valorHora,
          0,
        );
        suma(persona, "recargoNocturnoValor", rn, "Horas extras");
        suma(persona, "horasExtrasValor", num(pl.totalLiquidacion) - rn, "Horas extras");
      }
    }

    for (const vac of vacaciones) {
      const candidatos = porIdentificacion.get(vac.identificacion);
      if (!candidatos?.length) continue;
      const persona = this.contratoQueRecibe(candidatos);
      // El formato lleva días, no pesos: se valoran al salario del contrato que las recibe.
      const dias = (vac.diasDisfrutar ?? 0) + (vac.diasCompensar ?? 0);
      if (dias > 0) {
        suma(persona, "vacacionesHabiles", (num(persona.salario) / 30) * dias, "Vacaciones");
      }
    }

    return porPersona;
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
   * pensión al 4%, FSP al 1% desde 4 SMMLV).
   *
   * Horas extras, recargo nocturno, incapacidad y vacaciones salen de los formatos ya
   * aprobados (`sugerencias`). Lo digitado a mano en la novedad **manda sobre ellos**:
   * es la salida para el caso que el formato no alcanza a cubrir.
   */
  private liquidarFila(
    persona: ThPersona,
    novedad: ThNovedadNomina | null,
    smmlv: number,
    auxTransporte: number,
    multiEmpresa: boolean,
    prestamoCuota: number,
    sugerencias: SugerenciasNovedad,
  ): FilaNominaPreview {
    /** Lo digitado gana; si está vacío, lo que traen los formatos; si tampoco, cero. */
    const valor = (manual: string | null | undefined, sugerido: number | null): number =>
      manual !== null && manual !== undefined && manual !== "" ? num(manual) : (sugerido ?? 0);

    const salarioBasico = num(persona.salario);
    const diasTrabajados = novedad?.diasTrabajados ?? 30;
    const devengadoBasico = (salarioBasico / 30) * diasTrabajados;

    const horasExtras = valor(novedad?.horasExtrasValor, sugerencias.horasExtrasValor);
    const recargoNocturno = valor(novedad?.recargoNocturnoValor, sugerencias.recargoNocturnoValor);
    const auxilioRodamiento = (num(persona.auxilioRodamiento) / 30) * diasTrabajados;
    const bonificacion = num(novedad?.bonificaciones);

    const incapacidadEmpresa = valor(novedad?.incapacidadEmpresa, sugerencias.incapacidadEmpresa);
    const incapacidadEmpleado = valor(novedad?.incapacidadEmpleado, sugerencias.incapacidadEmpleado);
    const incapacidadOtros = num(novedad?.incapacidadOtros);

    const vacacionesHabiles = valor(novedad?.vacacionesHabiles, sugerencias.vacacionesHabiles);
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

    /**
     * IBC, con el tope del 40 % de la Ley 1393 de 2010 (art. 30).
     *
     * Lo no salarial —auxilio de rodamiento y bonificación— normalmente no cotiza. Pero
     * la ley pone un techo: no puede pasar del 40 % del total de la remuneración, y lo
     * que se pase **sí entra al IBC**. Sin esto, subirle a alguien la parte no salarial
     * le baja los aportes indefinidamente.
     *
     * El auxilio de transporte queda por fuera del cálculo, como en la hoja.
     *
     * La hoja entra a esta rama cuando lo no salarial supera el **básico**; acá se
     * compara contra el 40 % del total, que es lo que dice la ley y salta un poco antes.
     * En julio 2026 dan el mismo número —solo aplica en el caso de WALLIS, con
     * $3.982.800 por ambos caminos—, pero el de la ley no se le escapa quien tenga
     * horas extras o incapacidades de por medio.
     */
    const baseSalarial = totalDevengado - auxilioRodamiento - auxilioTransporteValor - bonificacion;
    const noSalarial = auxilioRodamiento + bonificacion;
    const excesoNoSalarial = Math.max(0, noSalarial - 0.4 * (baseSalarial + noSalarial));
    const ibc = baseSalarial + excesoNoSalarial;
    // `aporta_salud` y `aporta_pension` traen `true` de la base; el `!== false` cubre
    // además a quien venga de un registro anterior a esas columnas.
    const salud = persona.aportaSalud !== false ? ibc * 0.04 : 0;
    const pension = persona.aportaPension !== false ? ibc * 0.04 : 0;
    /**
     * FSP: 1 % adicional para quien cotiza sobre 4 SMMLV o más (Ley 100, art. 27).
     *
     * La prueba va sobre el **IBC del periodo**, no sobre el IBC llevado a mes completo.
     * El Excel compara `Q-E+C`, que le cambia los días prorrateados por el salario
     * entero; para los de 30 días da igual, pero a quien trabajó menos lo sube por
     * encima del umbral sin haber cotizado esa plata. A BECERRA, con 25 días, lo pasaba
     * de 3,43 a 4,02 mínimos y le cobraba un FSP que no lleva.
     *
     * `fspModo` en la ficha manda sobre el umbral, para los casos que Talento Humano ya
     * sabe. El valor siempre se calcula: marcarlo no lo congela.
     *
     * En automático también se mira si cotiza a pensión: el FSP es un aporte al fondo de
     * pensiones, y cobrárselo a quien no cotiza —un pensionado activo, por ejemplo— no
     * tendría sentido. Poner «SI» a mano sigue mandando sobre eso.
     */
    const aplicaFsp =
      persona.fspModo === "SI" ? true :
      persona.fspModo === "NO" ? false :
      persona.aportaPension !== false && ibc >= smmlv * 4;
    const fsp = aplicaFsp ? Math.round((salarioBasico * 0.01 * diasTrabajados) / 30) : 0;
    const retencionFuente = num(novedad?.retencionFuente);
    const bonificacionDeduccion = bonificacion;
    const prestamo = prestamoCuota;
    const embargos = num(novedad?.embargo);
    const serviciosGruporecordar = valor(
      novedad?.serviciosGruporecordar,
      sugerencias.serviciosGruporecordar,
    );

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
    const personas = await this.listNovedades(periodo, smmlv);
    const multiEmpresaPorId = this.marcarMultiEmpresa(personas);
    const filas = personas.map((p) =>
      this.liquidarFila(
        p,
        p.novedad,
        smmlv,
        auxTransporte,
        multiEmpresaPorId.get(p.identificacion) ?? false,
        p.prestamoCuota,
        p.sugerencias,
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

    const personas = await this.listNovedades(periodo, smmlv);
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
        p.sugerencias,
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
