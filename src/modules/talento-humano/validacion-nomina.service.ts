import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ThValidacionNomina } from "../../database/entities/th-validacion-nomina.entity";
import { ThEnvioNomina } from "../../database/entities/th-envio-nomina.entity";
import { ThPersona } from "../../database/entities/th-persona.entity";
import { ThParametroNomina } from "../../database/entities/th-parametro-nomina.entity";
import { User } from "../../database/entities/user.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { NominaService, type CuotasEnCartera, type FilaNominaPreview } from "./nomina.service";
import { DESTINO_LIQUIDACION } from "./validacion-nomina.destino";
import { PagosService } from "./pagos.service";

/**
 * Validación de la nómina antes de mandarla a Financiera.
 *
 * El revisor —hoy la Coordinación de Talento Humano— busca a cada persona por su cédula,
 * ve lo que el sistema calculó, ve lo que le falta a su ficha y **digita a mano el neto a
 * pagar**. El visto bueno no se guarda si lo digitado no coincide o si a la ficha le
 * falta algo para poder pagar.
 *
 * Cuando todas las personas del periodo tienen visto bueno vigente, se habilita mandar la
 * liquidación del mes a la Coordinación Financiera. **Es un solo envío por periodo**, no
 * uno por persona: Financiera necesita el mes completo para poder pagarlo, y sesenta
 * correos sueltos serían sesenta pedazos que alguien tendría que volver a juntar.
 */

const num = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const limpio = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const PERIODO_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const cop = (v: number) => "$" + Math.round(v).toLocaleString("es-CO");

/**
 * Cuánto se le perdona al valor digitado, en pesos.
 *
 * La liquidación se arma con porcentajes —salud, pensión, el 40 % de la Ley 1393— y cada
 * uno se redondea. El sistema redondea al final y la planilla del revisor redondea en
 * cada renglón, así que la misma nómina puede dar un peso de diferencia sin que ninguno
 * de los dos esté mal.
 *
 * Un peso, ni más: la tolerancia existe para el redondeo, no para dejar pasar una cifra
 * distinta. Con dos ya no se sabría si es redondeo o un error de digitación.
 */
const TOLERANCIA_PESOS = 1;

/**
 * Qué le falta a una ficha para que esa persona se pueda pagar.
 *
 * Es más ancho que lo que exige el archivo del banco (ver `faltantesDe` en
 * `pagos.service.ts`, que solo mira lo que la fila del archivo plano necesita): acá
 * también se revisa lo que hace que la liquidación **misma** sea creíble —que tenga
 * salario, cargo y fecha de ingreso—, porque este es el momento en que alguien la está
 * mirando antes de que salga la plata.
 */
export function faltantesDeFicha(p: ThPersona): string[] {
  const falta: string[] = [];

  if (!(num(p.salario) > 0)) falta.push("salario");
  if (!p.fechaIngreso) falta.push("fecha de ingreso");
  if (!limpio(p.cargo)) falta.push("cargo");

  if (!limpio(p.banco)) falta.push("banco");
  if (!limpio(p.cuenta)) falta.push("número de cuenta");
  if (!limpio(p.tipoCuenta)) falta.push("tipo de cuenta");

  // Una identificación con comas o puntos —las hay en la base, importadas de un Excel que
  // las traía con formato de miles— no cruza contra el banco ni contra la DIAN.
  if (limpio(p.identificacion) && !/^\d+$/.test(limpio(p.identificacion))) {
    falta.push(`identificación mal escrita («${p.identificacion}»)`);
  }

  // A quien ya salió hay que saberle el último día trabajado; sin eso no se sabe si este
  // mes le corresponde completo.
  if (limpio(p.estado).toUpperCase().startsWith("INACTIVO") && !p.fechaSalida) {
    falta.push("fecha de salida");
  }

  return falta;
}

/** La persona buscada, con lo que el sistema calculó y lo que le falta. */
export interface PersonaValidacion {
  personaId: number;
  identificacion: string;
  nombre: string;
  cargo: string | null;
  proyecto: string | null;
  estado: string | null;
  banco: string | null;
  cuenta: string | null;
  tipoCuenta: string | null;
  fechaIngreso: string | null;
  fechaSalida: string | null;
  salario: string | null;
  /** La fila de nómina del periodo, para poder ver de dónde sale el neto. */
  liquidacion: FilaNominaPreview;
  faltantes: string[];
  /** El visto bueno que ya tenga, si lo tiene. */
  validacion: ThValidacionNomina | null;
  /** true si la nómina cambió después de que se validó: el visto bueno quedó viejo. */
  desactualizada: boolean;
}

export interface EstadoPeriodo {
  periodo: string;
  /** Cuántas filas tiene la nómina del periodo. */
  total: number;
  /** Cuántas tienen visto bueno vigente. */
  validadas: number;
  /** Cuántas tienen algo pendiente en la ficha. */
  conFaltantes: number;
  /** Las que se validaron y después la nómina cambió. */
  desactualizadas: number;
  /** Qué impide mandar la liquidación. Vacío = se puede mandar. */
  bloqueos: string[];
  envio: ThEnvioNomina | null;
  destinatario: string | null;
  /** Quiénes están pendientes, para no tener que buscarlos uno por uno. */
  pendientes: Array<{
    personaId: number;
    identificacion: string;
    nombre: string;
    motivo: string;
  }>;
  /**
   * Todas las personas del periodo, en el mismo orden de la liquidación.
   *
   * Es la lista por la que se navega la revisión: se entra a cada quien desde acá. Va
   * completa y no solo con las pendientes porque a una ya revisada también hay que poder
   * volver —a mirarla otra vez o a quitarle el visto bueno—, y si solo estuvieran las que
   * faltan, la última en revisarse desaparecería de la pantalla sin dejar cómo volver.
   */
  personas: Array<{
    personaId: number;
    identificacion: string;
    nombre: string;
    cargo: string | null;
    /** Lo que le pasa hoy: el mismo texto que se le muestra al revisor. */
    motivo: string;
    validada: boolean;
  }>;
  /**
   * Qué quedó anotado en la cartera de préstamos.
   *
   * Solo viene al mandar la liquidación —es el resultado de ese envío, no un estado del
   * periodo—. Al consultar el estado va en `null`.
   */
  cartera: CuotasEnCartera | null;
}

@Injectable()
export class ValidacionNominaService {
  private readonly logger = new Logger(ValidacionNominaService.name);

  constructor(
    @InjectRepository(ThValidacionNomina)
    private readonly validacionRepo: Repository<ThValidacionNomina>,
    @InjectRepository(ThEnvioNomina)
    private readonly envioRepo: Repository<ThEnvioNomina>,
    @InjectRepository(ThPersona)
    private readonly personaRepo: Repository<ThPersona>,
    @InjectRepository(ThParametroNomina)
    private readonly parametroRepo: Repository<ThParametroNomina>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly nominaService: NominaService,
    private readonly notifications: NotificationsService,
    private readonly pagos: PagosService,
  ) {}

  // ── La nómina del periodo ──

  private validarPeriodo(periodo: string): void {
    if (!PERIODO_RE.test(limpio(periodo))) {
      throw new BadRequestException("El periodo va como YYYY-MM.");
    }
  }

  /**
   * La nómina del periodo: la guardada si ya se generó, o la vista previa con los
   * parámetros del año. Mismo criterio que las solicitudes de pago — en la práctica se
   * revisa antes de cerrar el mes.
   */
  private async filasDelPeriodo(periodo: string): Promise<FilaNominaPreview[]> {
    const anio = Number(periodo.slice(0, 4));
    const parametros = await this.parametroRepo.findOne({ where: { anio } });
    if (!parametros) {
      throw new BadRequestException(
        `No hay parámetros cargados para ${anio}. Cárgalos en Talento Humano → Parámetros.`,
      );
    }
    const { filas } = await this.nominaService.getNomina(
      periodo,
      Number(parametros.smmlv),
      Number(parametros.auxilioTransporte),
    );
    return filas;
  }

  // ── Buscar a una persona ──

  /**
   * Busca por cédula dentro de la nómina del periodo.
   *
   * Devuelve una lista y no una sola persona porque una cédula puede tener varios
   * contratos activos —una misma persona liquidando en varias empresas del grupo—, y cada
   * uno se valida por separado. Devolver el primero escondería los demás.
   */
  async buscar(periodo: string, identificacion: string): Promise<PersonaValidacion[]> {
    this.validarPeriodo(periodo);
    const buscada = limpio(identificacion).replace(/\D/g, "");
    if (!buscada) throw new BadRequestException("Escribe el número de cédula.");

    const filas = await this.filasDelPeriodo(periodo);
    // Se comparan solo los dígitos: en la base hay identificaciones guardadas con comas.
    const suyas = filas.filter((f) => limpio(f.identificacion).replace(/\D/g, "") === buscada);
    if (suyas.length === 0) {
      throw new NotFoundException(
        `Ninguna persona con cédula ${identificacion} está en la nómina de ${periodo}.`,
      );
    }

    const personas = await this.personaRepo.find();
    const porId = new Map(personas.map((p) => [p.personaId, p]));
    const validaciones = await this.validacionRepo.find({ where: { periodo } });
    const porPersona = new Map(validaciones.map((v) => [v.personaId, v]));

    return suyas.map((fila) => this.armar(fila, porId.get(fila.personaId), porPersona.get(fila.personaId)));
  }

  private armar(
    fila: FilaNominaPreview,
    persona: ThPersona | undefined,
    validacion: ThValidacionNomina | undefined,
  ): PersonaValidacion {
    return {
      personaId: fila.personaId,
      identificacion: fila.identificacion,
      nombre: fila.nombre,
      cargo: fila.cargo,
      proyecto: fila.proyecto,
      estado: persona?.estado ?? null,
      banco: persona?.banco ?? null,
      cuenta: persona?.cuenta ?? null,
      tipoCuenta: persona?.tipoCuenta ?? null,
      fechaIngreso: persona?.fechaIngreso ?? null,
      fechaSalida: persona?.fechaSalida ?? null,
      salario: persona?.salario ?? null,
      liquidacion: fila,
      faltantes: persona ? faltantesDeFicha(persona) : ["la persona ya no está en la base de personal"],
      validacion: validacion ?? null,
      desactualizada: !!validacion && !this.mismaCifra(num(validacion.netoCalculado), fila.netoPagar),
    };
  }

  /** En pesos redondos: la nómina trabaja con decimales y nadie gira centavos. */
  private mismaCifra(a: number, b: number): boolean {
    return Math.round(a) === Math.round(b);
  }

  /**
   * Si lo que el revisor digitó cuadra con lo que el sistema calculó.
   *
   * Va aparte de `mismaCifra` a propósito. `mismaCifra` compara **el sistema consigo
   * mismo** —lo que se guardó al validar contra lo que da hoy la liquidación— y ahí un
   * peso de diferencia sí es un cambio real que debe volver a revisarse. Esto compara al
   * sistema con **una persona leyendo un soporte**, y ahí un peso es redondeo.
   */
  private cuadraConLoDigitado(digitado: number, calculado: number): boolean {
    return Math.abs(Math.round(digitado) - Math.round(calculado)) <= TOLERANCIA_PESOS;
  }

  // ── Dar el visto bueno ──

  async validar(
    periodo: string,
    personaId: number,
    netoDigitado: number,
    observaciones: string | null,
    userId?: number,
  ): Promise<PersonaValidacion> {
    this.validarPeriodo(periodo);
    if (await this.envioRepo.findOne({ where: { periodo } })) {
      throw new BadRequestException(
        `La nómina de ${periodo} ya se mandó a Financiera. Para corregirla hay que anular el envío.`,
      );
    }

    const fila = (await this.filasDelPeriodo(periodo)).find((f) => f.personaId === personaId);
    if (!fila) throw new NotFoundException("Esa persona no está en la nómina de este periodo.");

    const persona = await this.personaRepo.findOne({ where: { personaId } });
    if (!persona) throw new NotFoundException("Esa persona ya no está en la base de personal.");

    const faltantes = faltantesDeFicha(persona);
    if (faltantes.length > 0) {
      throw new BadRequestException(
        `A la ficha de ${persona.nombre} le falta: ${faltantes.join(", ")}. ` +
          "Complétala en Personal antes de dar el visto bueno.",
      );
    }

    if (!this.cuadraConLoDigitado(netoDigitado, fila.netoPagar)) {
      throw new BadRequestException(
        `El valor digitado (${cop(netoDigitado)}) no coincide con el neto a pagar ` +
          `(${cop(fila.netoPagar)}): hay ${cop(Math.abs(netoDigitado - fila.netoPagar))} de ` +
          `diferencia. Revisa la liquidación antes de dar el visto bueno.`,
      );
    }

    const user = userId ? await this.userRepo.findOne({ where: { userId } }) : null;
    const fila_ = await this.validacionRepo.findOne({ where: { periodo, personaId } })
      ?? this.validacionRepo.create({ periodo, personaId });
    fila_.identificacion = fila.identificacion;
    fila_.nombre = fila.nombre;
    fila_.netoCalculado = String(Math.round(fila.netoPagar));
    fila_.netoDigitado = String(Math.round(netoDigitado));
    fila_.validadoPor = user ? user.nombre || user.email : null;
    fila_.validadoEn = new Date();
    fila_.observaciones = limpio(observaciones) || null;
    const guardada = await this.validacionRepo.save(fila_);

    return this.armar(fila, persona, guardada);
  }

  /** Quita el visto bueno, para poder revisar de nuevo. */
  async quitarValidacion(periodo: string, personaId: number): Promise<{ borrado: boolean }> {
    this.validarPeriodo(periodo);
    if (await this.envioRepo.findOne({ where: { periodo } })) {
      throw new BadRequestException(
        `La nómina de ${periodo} ya se mandó. Anula el envío antes de tocar los vistos buenos.`,
      );
    }
    await this.validacionRepo.delete({ periodo, personaId });
    return { borrado: true };
  }

  // ── Cómo va el periodo ──

  async estado(periodo: string): Promise<EstadoPeriodo> {
    this.validarPeriodo(periodo);
    const filas = await this.filasDelPeriodo(periodo);
    const personas = await this.personaRepo.find();
    const porId = new Map(personas.map((p) => [p.personaId, p]));
    const validaciones = await this.validacionRepo.find({ where: { periodo } });
    const porPersona = new Map(validaciones.map((v) => [v.personaId, v]));
    const envio = await this.envioRepo.findOne({ where: { periodo } });

    const pendientes: EstadoPeriodo["pendientes"] = [];
    const todas: EstadoPeriodo["personas"] = [];
    let validadas = 0;
    let conFaltantes = 0;
    let desactualizadas = 0;

    for (const fila of filas) {
      const persona = porId.get(fila.personaId);
      const faltantes = persona ? faltantesDeFicha(persona) : ["no está en la base de personal"];
      const v = porPersona.get(fila.personaId);
      const vieja = !!v && !this.mismaCifra(num(v.netoCalculado), fila.netoPagar);

      if (faltantes.length > 0) conFaltantes += 1;
      if (vieja) desactualizadas += 1;

      // Un visto bueno solo cuenta si sigue siendo sobre la cifra de hoy y la ficha está
      // completa: si la nómina cambió después, lo que se revisó ya no es lo que se va a
      // pagar.
      const motivo = faltantes.length
        ? `le falta ${faltantes.join(", ")}`
        : vieja
          ? "la nómina cambió después de validarla"
          : "sin visto bueno";
      const validada = !!v && !vieja && faltantes.length === 0;

      todas.push({
        personaId: fila.personaId,
        identificacion: fila.identificacion,
        nombre: fila.nombre,
        cargo: fila.cargo ?? null,
        motivo: validada ? "con visto bueno" : motivo,
        validada,
      });

      if (validada) {
        validadas += 1;
        continue;
      }
      pendientes.push({
        personaId: fila.personaId,
        identificacion: fila.identificacion,
        nombre: fila.nombre,
        motivo,
      });
    }

    /*
     * Los bloqueos se cuentan sobre `pendientes`, que ya tiene una entrada por persona y
     * un solo motivo cada una. Contarlos por separado —faltantes por un lado, sin visto
     * bueno por otro— sumaría dos veces a quien tiene las dos cosas y diría que faltan
     * más personas de las que hay.
     */
    const bloqueos: string[] = [];
    if (filas.length === 0) bloqueos.push("La nómina de este periodo no tiene ninguna fila.");
    if (conFaltantes > 0) {
      bloqueos.push(
        `${conFaltantes} ${conFaltantes === 1 ? "persona tiene" : "personas tienen"} datos faltantes en su ficha.`,
      );
    }
    const soloSinVisto = pendientes.length - conFaltantes;
    if (soloSinVisto > 0) {
      bloqueos.push(
        `${soloSinVisto} ${soloSinVisto === 1 ? "persona está" : "personas están"} sin visto bueno.`,
      );
    }
    if (envio) {
      bloqueos.push(`Ya se mandó el ${envio.enviadoEn?.toISOString().slice(0, 10) ?? "—"}.`);
    }

    return {
      periodo,
      total: filas.length,
      validadas,
      conFaltantes,
      desactualizadas,
      bloqueos,
      envio: envio ?? null,
      destinatario: (await this.destinatarios()).map((u) => u.nombre || u.email).join("; ") || null,
      pendientes,
      personas: todas,
      cartera: null,
    };
  }

  // ── Mandar a Financiera ──

  /**
   * A quién le llega la liquidación.
   *
   * Se resuelve por rol y se afina por nombre porque hay **dos** personas con el rol de
   * Coordinación Financiera y la nómina es de una sola de ellas. Si el filtro por nombre
   * no encuentra a nadie —la renombraron, se fue, la cambiaron de rol— cae de vuelta a
   * todo el rol: es preferible que el correo le llegue de más a alguien del área a que
   * deje de salir sin que nadie se entere.
   */
  private async destinatarios(): Promise<User[]> {
    const activos = await this.userRepo.find({ where: { estado: true }, relations: ["role"] });
    const delRol = activos.filter(
      (u) => (u.role?.nombreRol ?? "").toLowerCase() === DESTINO_LIQUIDACION.rol.toLowerCase(),
    );
    const clave = DESTINO_LIQUIDACION.nombreContiene.toLowerCase();
    const afinado = delRol.filter((u) => (u.nombre ?? "").toLowerCase().includes(clave));
    return afinado.length > 0 ? afinado : delRol;
  }

  async enviar(periodo: string, userId?: number): Promise<EstadoPeriodo> {
    this.validarPeriodo(periodo);
    const estado = await this.estado(periodo);
    if (estado.bloqueos.length > 0) {
      throw new BadRequestException(
        `Todavía no se puede mandar la nómina de ${periodo}: ${estado.bloqueos.join(" ")}`,
      );
    }

    const filas = await this.filasDelPeriodo(periodo);
    const destinos = await this.destinatarios();
    if (destinos.length === 0) {
      throw new BadRequestException(
        `No hay ningún usuario activo con el rol «${DESTINO_LIQUIDACION.rol}» a quién mandársela.`,
      );
    }

    const user = userId ? await this.userRepo.findOne({ where: { userId } }) : null;
    const quien = user ? user.nombre || user.email : "Talento Humano";
    const correos = destinos.map((u) => u.emailNotificacion || u.email).filter(Boolean);

    /*
     * Mandar la liquidación es armar la solicitud de pago: eso es lo que Financiera
     * recibe, y el correo es apenas el aviso de que ya está.
     *
     * Va antes que la constancia y que el correo a propósito. Si la solicitud no se puede
     * armar, el envío entero falla y se ve por qué; al revés quedaría dicho que la nómina
     * se mandó y del otro lado no habría nada que pagar.
     */
    const solicitud = await this.pagos.crearDesdeLiquidacion(periodo, userId);

    /*
     * Y se le anotan a la cartera las cuotas de préstamo que esta nómina descontó.
     *
     * Va aquí porque este es el momento en que el descuento deja de ser un cálculo y pasa
     * a ser plata que no se le va a girar a la persona. Antes de esto la nómina se puede
     * reabrir y volver a generar; después ya no.
     *
     * A diferencia de la solicitud de pago, esto **no tumba el envío si algo no cuadra**.
     * Un préstamo cuya ficha cambió entre generar y mandar es un renglón que hay que
     * mirar a mano, no una razón para que sesenta personas se queden sin pago: lo que no
     * se pudo anotar vuelve en `cartera.avisos` y se muestra al terminar.
     */
    const cartera = await this.nominaService.registrarCuotasEnCartera(periodo);
    if (cartera.avisos.length > 0) {
      this.logger.warn(
        `Nómina ${periodo}: ${cartera.avisos.length} préstamos quedaron sin anotar en la ` +
          `cartera. ${cartera.avisos.join(" ")}`,
      );
    }

    /*
     * Las cifras del correo salen de la solicitud, no de la liquidación.
     *
     * No siempre coinciden: quien queda con el neto en cero —cuando la cuota del préstamo
     * se come el sueldo del mes— se revisa igual pero no se le gira nada, así que no
     * tiene línea. Contar las revisadas diría un número de personas y un total que no son
     * los del giro que va a hacer Financiera.
     */
    const empleados = solicitud.lineas.length;
    const total = solicitud.lineas.reduce((s, l) => s + Number(l.valor ?? 0), 0);

    // La constancia se guarda antes de mandar el correo y no después: si el correo falla,
    // hay que poder ver que el envío se intentó. Queda marcado si salió o no.
    const constancia = await this.envioRepo.save(
      this.envioRepo.create({
        periodo,
        destinatarios: correos.join("; "),
        empleados,
        totalNeto: String(Math.round(total)),
        enviadoPor: quien,
        enviadoEn: new Date(),
        correoEnviado: false,
      }),
    );

    let algunoSalio = false;
    for (const u of destinos) {
      const to = u.emailNotificacion || u.email;
      if (!to) continue;
      const ok = await this.notifications.sendEmail({
        to,
        subject: `Liquidación de nómina ${periodo} · lista para pago`,
        html: `
      <div style="font-family:Arial,sans-serif;color:#1f2937">
        <p>Hola ${u.nombre ?? ""},</p>
        <p>La liquidación de nómina de <b>${periodo}</b> quedó revisada y va para pago.</p>
        <table style="border-collapse:collapse;margin:12px 0">
          <tr><td style="padding:4px 12px 4px 0">Empleados</td><td style="padding:4px 0"><b>${empleados}</b></td></tr>
          <tr><td style="padding:4px 12px 4px 0">Neto a pagar</td><td style="padding:4px 0"><b>${cop(total)}</b></td></tr>
          <tr><td style="padding:4px 12px 4px 0">Revisó</td><td style="padding:4px 0">${quien}</td></tr>
        </table>
        <p>Cada persona fue revisada una por una: la ficha está completa y el neto a pagar
           se verificó digitándolo a mano contra lo que calculó el sistema.</p>
        <p>La <b>solicitud de pago</b> ya quedó armada con el archivo para el portal
           bancario: Talento Humano → Solicitudes de pago.
           ${filas.length !== empleados
             ? `<br><small>De las ${filas.length} personas revisadas, ${empleados} tienen giro;
                el resto quedó en cero este mes.</small>`
             : ""}</p>
        <p>El detalle de la liquidación está en Talento Humano → Nómina → Liquidación.</p>
      </div>`,
      }).catch((e) => {
        this.logger.error(`No se pudo avisar a ${to}: ${e?.message ?? e}`);
        return false;
      });
      algunoSalio = algunoSalio || ok;
    }

    if (algunoSalio) {
      await this.envioRepo.update(constancia.envioId, { correoEnviado: true });
    } else {
      this.logger.warn(
        `Nómina ${periodo}: la constancia quedó guardada pero ningún correo salió.`,
      );
    }
    return { ...(await this.estado(periodo)), cartera };
  }

  /** Anula el envío para poder volver a revisar y mandar. */
  async anularEnvio(periodo: string): Promise<EstadoPeriodo> {
    this.validarPeriodo(periodo);
    const envio = await this.envioRepo.findOne({ where: { periodo } });
    if (!envio) throw new NotFoundException("Esta nómina no se ha mandado.");
    await this.envioRepo.delete({ envioId: envio.envioId });
    return this.estado(periodo);
  }
}
