import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { GcSolicitud } from "../../database/entities/gc-solicitud.entity";
import { alcanceDe, gestionEsSoloPropia, veTodasLasSolicitudes } from "./visibilidad";
import { User } from "../../database/entities/user.entity";
import { Material } from "../../database/entities/material.entity";
import { OperationCenter } from "../../database/entities/operation-center.entity";
import { Authorization } from "../../database/entities/authorization.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { PurchasesService } from "../purchases/purchases.service";
import { TalentoHumanoService } from "../talento-humano/talento-humano.service";
import { ROLES_TALENTO_HUMANO } from "../talento-humano/talento-humano.roles";
import {
  ACCIONES_ANULACION,
  CAMPO_ANULACION,
  CAMPO_ESTADO_PREVIO,
  FORMATOS_ANULABLES,
  ROLES_ANULAN,
  esAccionDeAnulacion,
} from "./anulacion-workflow";
import { fechaTextoAIso } from "../../utils/fecha-local.util";
import { exigirCamposObligatorios } from "./campos-obligatorios";
import { CreateSolicitudDto, UpdateSolicitudDto } from "./dto";
import {
  JURIDICA_TRANSICIONES,
  JURIDICA_ESTADOS,
  NOTIFICAR_AL_LLEGAR,
  esRolPmo,
  estadoAlcanzo,
  JuridicaEstado,
} from "./juridica-workflow";
import {
  ANTICIPO_TRANSICIONES,
  ANTICIPO_ESTADOS,
  ANTICIPO_NOTIFICAR_AL_LLEGAR,
  // La categoría de Director de Área la comparten los dos flujos: en el anticipo decide
  // quién es su jefe y en la solicitud, si hay paso de autorización o no.
  CATEGORIA_DIRECTOR_AREA,
  ROL_GERENCIA,
  AnticipoEstado,
} from "./anticipo-workflow";
import {
  LEGALIZACION_TRANSICIONES,
  LEGALIZACION_ESTADOS,
  LEGALIZACION_NOTIFICAR_AL_LLEGAR,
  LEGALIZACION_CORTE_DIA_MES,
  LegalizacionEstado,
} from "./legalizacion-workflow";
import {
  CUENTAS_TRANSICIONES,
  CUENTAS_ESTADOS,
  CUENTAS_NOTIFICAR_AL_LLEGAR,
  CuentasEstado,
} from "./cuentas-companias-workflow";
import {
  CAJA_MENOR_TRANSICIONES,
  CAJA_MENOR_ESTADOS,
  CAJA_MENOR_NOTIFICAR_AL_LLEGAR,
  arqueoDeCajaMenor,
  CajaMenorEstado,
} from "./caja-menor-workflow";
import {
  PRESTAMO_TRANSICIONES,
  PRESTAMO_ESTADOS,
  PRESTAMO_NOTIFICAR_AL_LLEGAR,
  PRESTAMO_ENTERAR_AL_LLEGAR,
  PrestamoEstado,
} from "./prestamo-workflow";
import {
  PERMISO_TRANSICIONES,
  PERMISO_ESTADOS,
  FILAS_APROBACION_POR_ROL,
  PermisoEstado,
  ROL_ADMINISTRATIVA_PERMISO,
} from "./permiso-workflow";
import {
  HORAS_EXTRAS_TRANSICIONES,
  HORAS_EXTRAS_ESTADOS,
  HORAS_EXTRAS_NOTIFICAR_AL_LLEGAR,
  HORAS_EXTRAS_FIRMA_POR_ACCION,
  ROLES_DIRECTOR_PROYECTO,
  HorasExtrasEstado,
} from "./horas-extras-workflow";
import {
  VACACIONES_TRANSICIONES,
  VACACIONES_ESTADOS,
  VACACIONES_NOTIFICAR_AL_LLEGAR,
  VacacionesEstado,
} from "./vacaciones-workflow";
import {
  SIGLA_CONTRATO,
  SIGLA_SIN_TIPO,
  ACCION_ALERTA_VENCIMIENTO,
  ACCION_RQ_POLIZA,
  ACCION_NOTIFICACION_INICIO,
  DIAS_ALERTA_VENCIMIENTO,
  ESTADOS_CONTRATO_VIGENTE,
  esRequisicionDePersonal,
  formatearConsecutivo,
  mismoNombre,
  numeroDeConsecutivo,
  vencimientoDe,
} from "./juridica-contratos";
import { ROLES_ADMINISTRATIVA, ROLES_JURIDICA } from "./juridica-workflow";

/**
 * Los tipos de hora extra con su recargo, **espejo exacto** de `TIPOS_HORA` en
 * `HorasExtrasPage.tsx` (frontend). Hace falta acá para recalcular horas y liquidación
 * al aprobar la planilla: si un factor cambia en el papel, hay que cambiarlo en los dos
 * sitios o la liquidación que se guarda deja de cuadrar con la que se imprime.
 */
const TIPOS_HORA_EXTRA = [
  { key: "diurna", factor: 1.25 },
  { key: "recargoNocturno", factor: 0.35 },
  { key: "nocturna", factor: 1.75 },
  { key: "diurnaFestiva", factor: 2.15 },
  { key: "nocturnaFestiva", factor: 2.65 },
] as const;

/**
 * Divisor para el valor de la hora: salario mensual ÷ 210. El formato ya no pide el valor
 * hora a mano —la planilla solo registra horas, como el papel oficial—; el valor hora sale
 * del salario que la ficha de Personal tiene para la persona, al aprobar la planilla.
 */
const DIVISOR_HORA_EXTRA = 210;

/** Texto → número. Acepta la coma decimal, igual que `num()` en `HorasExtrasPage.tsx`. */
function numHorasExtras(v: unknown): number {
  const limpio = String(v ?? "").replace(/[^\d,.-]/g, "").replace(",", ".");
  const n = parseFloat(limpio);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Las casillas DÍA/MES/AÑO del formato de vacaciones, a fecha ISO. Null si falta
 * cualquiera de las tres o si no arma una fecha real (p. ej. 31 de febrero).
 */
function fechaISO(f: { dia?: string; mes?: string; anio?: string } | undefined | null): string | null {
  const dia = parseInt(String(f?.dia ?? ""), 10);
  const mes = parseInt(String(f?.mes ?? ""), 10);
  const anio = parseInt(String(f?.anio ?? ""), 10);
  if (!dia || !mes || !anio) return null;
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  if (d.getUTCFullYear() !== anio || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

@Injectable()
export class GestionConocimientoService implements OnModuleInit {
  private readonly logger = new Logger(GestionConocimientoService.name);

  constructor(
    @InjectRepository(GcSolicitud)
    private readonly solicitudRepo: Repository<GcSolicitud>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,
    @InjectRepository(OperationCenter)
    private readonly operationCenterRepo: Repository<OperationCenter>,
    @InjectRepository(Authorization)
    private readonly authorizationRepo: Repository<Authorization>,
    private readonly purchases: PurchasesService,
    private readonly notifications: NotificationsService,
    private readonly talentoHumano: TalentoHumanoService,
  ) {}

  /** Código del material "POLIZA / CERTIFICACIONES" en Gestión de Compras. */
  private static readonly MATERIAL_POLIZA_CODE = "4242";

  /** Formato de la Solicitud de Anticipo: usa su propia máquina de estados. */
  private static readonly FORMATO_ANTICIPO_FLUJO = "GF-005-F";

  /** Formato de la Legalización de anticipos: usa su propia máquina de estados. */
  private static readonly FORMATO_LEGALIZACION = "GCT-006-F";

  /** True si la solicitud es una Solicitud de Anticipo (usa el flujo de anticipos). */
  private esAnticipo(s: GcSolicitud): boolean {
    return (
      s.gestion === "contable" &&
      s.formato === GestionConocimientoService.FORMATO_ANTICIPO_FLUJO
    );
  }

  /** True si la solicitud es una Legalización de anticipo (GCT-006-F). */
  private esLegalizacion(s: GcSolicitud): boolean {
    return (
      s.gestion === "contable" &&
      s.formato === GestionConocimientoService.FORMATO_LEGALIZACION
    );
  }

  /** Formato de la Solicitud de Préstamo: usa su propia máquina de estados. */
  private static readonly FORMATO_PRESTAMO = "GTH-007-F";

  /**
   * Quién ve el salario al prellenar un formato: los mismos que ya ven la nómina.
   *
   * El prellenado está abierto a cualquiera con sesión —los formatos los diligencia todo
   * el mundo—, así que devolver el salario siempre convertiría la casilla de la cédula en
   * un consultor de sueldos ajenos. Para el resto la casilla llega vacía y se digita.
   */
  private static readonly ROLES_VEN_SALARIO: readonly string[] = [
    ...ROLES_TALENTO_HUMANO,
  ];

  /**
   * Lo que ya sabemos de una persona, para no volver a digitarlo en cada formato.
   *
   * El nombre, el documento, el cargo y el área están en su ficha de personal; volver a
   * escribirlos en cada solicitud es a la vez trabajo repetido y una fuente de errores
   * —la cédula bien y el nombre mal, o el cargo de hace dos ascensos—.
   */
  async fichaParaFormato(identificacion: string, userId?: number) {
    const user = userId
      ? await this.userRepo.findOne({ where: { userId }, relations: ["role"] })
      : null;
    const rol = (user?.role?.nombreRol ?? "").trim();
    const veSalario = GestionConocimientoService.ROLES_VEN_SALARIO.includes(rol);
    return this.talentoHumano.fichaParaFormato(identificacion, veSalario);
  }

  /** True si la solicitud es una Solicitud de Préstamo (GTH-007-F). */
  private esPrestamo(s: GcSolicitud): boolean {
    return (
      s.gestion === "talento-humano" &&
      s.formato === GestionConocimientoService.FORMATO_PRESTAMO
    );
  }

  /** Formato de la Solicitud de Permiso: la aprueba el jefe de área del solicitante. */
  private static readonly FORMATO_PERMISO = "GTH-009-F";

  /** True si la solicitud es una Solicitud de Permiso (GTH-009-F). */
  private esPermiso(s: GcSolicitud): boolean {
    return (
      s.gestion === "talento-humano" &&
      s.formato === GestionConocimientoService.FORMATO_PERMISO
    );
  }

  /** Planilla de Horas Extras: PQRS → Director de Proyecto → Proyectos → Administrativa. */
  private static readonly FORMATO_HORAS_EXTRAS = "GTH-016-F";

  /** True si la solicitud es una planilla de Horas Extras (GTH-016-F). */
  private esHorasExtras(s: GcSolicitud): boolean {
    return (
      s.gestion === "talento-humano" &&
      s.formato === GestionConocimientoService.FORMATO_HORAS_EXTRAS
    );
  }

  /** Formato de la Solicitud de Vacaciones: firma, Vo.Bo. jefe, Vo.Bo. TH y Gerencia. */
  private static readonly FORMATO_VACACIONES = "GTH-018-F";

  /** True si la solicitud es una Solicitud de Vacaciones (GTH-018-F). */
  private esVacaciones(s: GcSolicitud): boolean {
    return (
      s.gestion === "talento-humano" &&
      s.formato === GestionConocimientoService.FORMATO_VACACIONES
    );
  }

  /** Formato de Autorización de pago mediante cuentas entre compañías (uso excepcional). */
  private static readonly FORMATO_CUENTAS = "GF-004-F5";

  /** True si la solicitud es una Autorización de cuentas entre compañías (GF-004-F5). */
  private esCuentasCompanias(s: GcSolicitud): boolean {
    return (
      s.gestion === "contable" &&
      s.formato === GestionConocimientoService.FORMATO_CUENTAS
    );
  }

  /** Formato del Reembolso de Caja Menor (G. contable). */
  private static readonly FORMATO_CAJA_MENOR = "GF-007-F";

  /** True si la solicitud es un Reembolso de Caja Menor (GF-007-F). */
  private esCajaMenor(s: GcSolicitud): boolean {
    return (
      s.gestion === "contable" &&
      s.formato === GestionConocimientoService.FORMATO_CAJA_MENOR
    );
  }

  /** Formato de la Solicitud de Anticipo (G. contable): lleva consecutivo propio. */
  private static readonly FORMATO_ANTICIPO = "GF-005-F";

  /**
   * Siguiente consecutivo de la Solicitud de Anticipo, como "0001", "0002"…
   * Se calcula sobre las solicitudes existentes de ese formato (máximo + 1). Es el
   * código único que enlaza el anticipo con su Legalización (GCT-006-F).
   */
  private async nextConsecutivoAnticipo(): Promise<string> {
    const previas = await this.solicitudRepo.find({
      where: { gestion: "contable", formato: GestionConocimientoService.FORMATO_ANTICIPO },
    });
    let max = 0;
    for (const p of previas) {
      const n = parseInt(String(p.data?.consecutivo ?? "").replace(/\D/g, ""), 10);
      if (!isNaN(n) && n > max) max = n;
    }
    return String(max + 1).padStart(4, "0");
  }

  async create(dto: CreateSolicitudDto, userId: number): Promise<GcSolicitud> {
    // "Solicitado por" se toma automáticamente de quien crea la solicitud.
    const data: Record<string, any> = { ...(dto.data ?? {}) };
    const creador = userId
      ? await this.userRepo.findOne({ where: { userId } })
      : null;
    if (creador) {
      data.solicitadoNombre = data.solicitadoNombre || creador.nombre || "";
      data.solicitadoCargo = data.solicitadoCargo || creador.cargo || "";
    }

    // La Solicitud de Anticipo recibe un consecutivo único al crearse (no se
    // reasigna en ediciones posteriores porque solo se genera si aún no existe).
    if (
      dto.gestion === "contable" &&
      dto.formato === GestionConocimientoService.FORMATO_ANTICIPO &&
      !data.consecutivo
    ) {
      data.consecutivo = await this.nextConsecutivoAnticipo();
    }

    // El Reembolso de Caja Menor estampa quién lo elabora y con qué cargo. La hoja
    // dice «AUXILIAR ADMINISTRATIVO», pero el formato también lo diligencian PQRS y la
    // Coordinadora Financiera: el impreso debe decir el cargo real de quien firma, no
    // el que venía preimpreso. Se fija al crear y no se recalcula después, para que el
    // documento conserve el cargo que tenía la persona cuando lo elaboró.
    if (
      dto.gestion === "contable" &&
      dto.formato === GestionConocimientoService.FORMATO_CAJA_MENOR &&
      creador
    ) {
      data.elaboradoNombre = data.elaboradoNombre || creador.nombre || "";
      data.elaboradoCargo = data.elaboradoCargo || creador.cargo || "";
    }

    // Una legalización no se crea enlazada a un anticipo que aún no se ha pagado.
    if (
      dto.gestion === "contable" &&
      dto.formato === GestionConocimientoService.FORMATO_LEGALIZACION
    ) {
      await this.validarAnticipoPagadoSiEnlazado(data);
    }

    const solicitud = this.solicitudRepo.create({
      gestion: dto.gestion,
      formato: dto.formato ?? (null as unknown as string),
      estado: "borrador",
      estadoDesde: new Date(),
      historial: [],
      data,
      createdBy: userId ?? null,
    });
    return this.solicitudRepo.save(solicitud);
  }

  /**
   * Le pone su consecutivo a la solicitud la primera vez que deja de ser borrador.
   *
   * No se asigna al crearla porque crear es apenas abrir el formulario: cada borrador
   * abandonado se llevaría un número y el consecutivo avanzaría sin que exista el
   * documento. Se gasta cuando el trámite arranca de verdad.
   *
   * Va **por formato**: GTH-002-F y GF-005-F son documentos distintos, cada uno con su
   * propia numeración, aunque compartan tabla.
   *
   * Si dos solicitudes salieran de borrador en el mismo instante podrían pedir el mismo
   * número; el índice único de `(formato, numero)` hace que la segunda falle en vez de
   * quedar duplicada en silencio. Con el volumen real —unas pocas al mes— es una
   * salvaguarda, no un caso esperado.
   */
  private async asignarNumero(solicitud: GcSolicitud): Promise<void> {
    if (solicitud.numero != null || solicitud.estado === "borrador") return;

    const q = this.solicitudRepo
      .createQueryBuilder("s")
      .select("MAX(s.numero)", "max");
    // `formato` puede venir en nulo en filas viejas; `= NULL` no casa con nada y las
    // dejaría a todas pidiendo el número 1.
    if (solicitud.formato) q.where("s.formato = :formato", { formato: solicitud.formato });
    else q.where("s.formato IS NULL");

    const fila = await q.getRawOne<{ max: string | number | null }>();
    solicitud.numero = Number(fila?.max ?? 0) + 1;
  }

  async findAll(
    gestion?: string,
    mine?: boolean,
    userId?: number,
  ): Promise<GcSolicitud[]> {
    const where: Record<string, unknown> = {};
    if (gestion) where.gestion = gestion;
    // `mine` es un filtro que pide el usuario ("muéstrame solo las mías"), no la
    // restricción: esa la aplica `filtrarVisibles` más abajo y no se puede quitar desde
    // el navegador.
    if (mine && userId) where.createdBy = userId;
    const solicitudes = await this.solicitudRepo.find({
      where,
      order: { updatedAt: "DESC" },
    });
    if (!userId) return solicitudes;
    const anotadas = await this.anotarAccionesPendientes(solicitudes, userId);
    return this.filtrarVisibles(anotadas, userId);
  }

  /**
   * Deja solo las solicitudes que este usuario tiene por qué ver.
   *
   * Tres alcances, de más ancho a más angosto:
   *
   *  1. Las áreas que tramitan o firman —Jurídica, Administrativa, Financiera, Gerencia y
   *     el PMO— ven el listado completo.
   *  2. Los roles con alcance acotado ven además las de cierta gente: Gerencia de
   *     Proyectos ve las que piden los directores de proyecto y el director técnico, que
   *     es lo que le toca autorizar. Ver `ALCANCE_POR_ROL`.
   *  3. Los demás ven **las suyas**.
   *
   * Sobre esos tres, todo el mundo ve además aquellas en las que le toca actuar ahora y
   * aquellas en las que ya actuó. No es una excepción a la regla, es lo que la hace
   * viable: sin eso, una solicitud que espera la firma de alguien le llegaría a una
   * bandeja donde no aparece, y el trámite se quedaría quieto sin que nadie sepa por qué.
   * El jefe que ya autorizó la de alguien de su equipo tampoco tendría cómo volver a
   * mirarla.
   *
   * Se filtra **después** de anotar las acciones pendientes porque es justamente ese
   * cálculo —que ya resuelve rol y jerarquía— el que dice si le toca actuar.
   */
  private async filtrarVisibles(
    solicitudes: GcSolicitud[],
    userId: number,
  ): Promise<GcSolicitud[]> {
    if (solicitudes.length === 0) return solicitudes;

    const user = await this.userRepo.findOne({
      where: { userId },
      relations: ["role"],
    });
    const rol = user?.role?.nombreRol;
    // Ver todo depende del rol, pero se apaga en las gestiones «solo propias» (contable):
    // ahí ni siquiera las áreas que tramitan ven el listado ajeno, se evalúa por
    // solicitud más abajo según su gestión.
    const veTodo = veTodasLasSolicitudes(rol);
    if (veTodo && !solicitudes.some((s) => gestionEsSoloPropia(s.gestion))) {
      return solicitudes;
    }

    // Quiénes, de los que crearon algo en esta lista, caen dentro del alcance del rol.
    // Se resuelve sobre los creadores que hay y no sobre toda la tabla de usuarios: son
    // un puñado y así una sola consulta basta.
    const alcance = alcanceDe(rol);
    const enAlcance = new Set<number>();
    if (alcance) {
      const creadorIds = [
        ...new Set(solicitudes.map((s) => s.createdBy).filter(Boolean)),
      ] as number[];
      if (creadorIds.length > 0) {
        const creadores = await this.userRepo.find({
          where: { userId: In(creadorIds) },
          relations: ["role"],
        });
        for (const c of creadores) {
          if (alcance.includes((c.role?.nombreRol ?? "").trim())) enAlcance.add(c.userId);
        }
      }
    }

    // `accionesPendientes` lo pega `anotarAccionesPendientes` con Object.assign y no está
    // declarado en la entidad, así que hay que nombrarlo para leerlo.
    type ConAcciones = GcSolicitud & { accionesPendientes?: unknown[] };

    return (solicitudes as ConAcciones[]).filter(
      (s) =>
        (veTodo && !gestionEsSoloPropia(s.gestion)) ||
        s.createdBy === userId ||
        (s.createdBy != null && enAlcance.has(s.createdBy)) ||
        (s.accionesPendientes?.length ?? 0) > 0 ||
        (s.historial ?? []).some((h) => h?.userId === userId),
    );
  }

  /**
   * Agrega a cada solicitud el campo virtual `accionesPendientes`: las acciones del
   * flujo que **este** usuario puede ejecutar ahora mismo. Sirve para la bandeja
   * "pendientes de mi acción" sin que el frontend tenga que adivinar la jerarquía.
   */
  private async anotarAccionesPendientes(
    solicitudes: GcSolicitud[],
    userId: number,
  ): Promise<GcSolicitud[]> {
    if (solicitudes.length === 0) return solicitudes;

    const user = await this.userRepo.findOne({
      where: { userId },
      relations: ["role"],
    });
    const rol = user?.role?.nombreRol ?? "";
    const esPmo = esRolPmo(rol);

    // A quiénes autoriza este usuario (es su "jefe"), en una sola consulta.
    const rels = await this.authorizationRepo.find({
      where: { usuarioAutorizadorId: userId, esActivo: true },
    });
    const autorizados = new Set(rels.map((r) => r.usuarioAutorizadoId));

    // Creadores que son Directores de Área (para la red de seguridad del paso jefe),
    // y los que no tienen ningún autorizador, que si no se quedarían sin quién resuelva.
    const creadorIds = [
      ...new Set(solicitudes.map((s) => s.createdBy).filter(Boolean)),
    ] as number[];
    const directoresArea = new Set<number>();
    const sinAutorizador = new Set<number>(creadorIds);
    /*
     * Creadores que sí tienen un Director de Proyecto entre sus autorizadores. Los que
     * NO están acá los puede atender cualquier Director de Proyecto, que es lo que hace
     * `esDirectorDeProyectoACargo` al ejecutar la acción.
     *
     * Sin esta distinción la bandeja mentía: cuando un Director de Proyecto registra él
     * mismo una planilla —sus jefes son Gerencia y Dirección Técnica, ningún Director de
     * Proyecto—, el servidor lo dejaba revisarla pero la lista no le mostraba nada.
     */
    const conDirectorACargo = new Set<number>();
    /** Creadores que son ellos mismos Director de Proyecto: su planilla la revisan ellos. */
    const creadorEsDirectorProyecto = new Set<number>();
    if (creadorIds.length > 0) {
      const creadores = await this.userRepo.find({
        where: { userId: In(creadorIds) },
        relations: ["role"],
      });
      for (const c of creadores) {
        if (c.role?.category === CATEGORIA_DIRECTOR_AREA) directoresArea.add(c.userId);
        if (ROLES_DIRECTOR_PROYECTO.includes(c.role?.nombreRol ?? "")) {
          creadorEsDirectorProyecto.add(c.userId);
        }
      }
      const conJefe = await this.authorizationRepo.find({
        where: { usuarioAutorizadoId: In(creadorIds), esActivo: true },
        relations: ["usuarioAutorizador", "usuarioAutorizador.role"],
      });
      for (const r of conJefe) {
        sinAutorizador.delete(r.usuarioAutorizadoId);
        const jefe = r.usuarioAutorizador;
        if (
          jefe?.estado &&
          ROLES_DIRECTOR_PROYECTO.includes(jefe.role?.nombreRol ?? "")
        ) {
          conDirectorACargo.add(r.usuarioAutorizadoId);
        }
      }
    }

    const resuelveAnulaciones = esPmo || ROLES_ANULAN.includes(rol);

    return solicitudes.map((s) => {
      // Una anulación esperando respuesta SÍ es trabajo pendiente, y de Talento Humano.
      // Va antes que todo lo demás porque en ese estado el flujo normal está detenido:
      // no hay ningún paso del formato que atender hasta que se resuelva.
      if (s.estado === "pendiente_anulacion") {
        return Object.assign(s, {
          accionesPendientes: resuelveAnulaciones
            ? ["anular", "rechazar_anulacion"]
            : [],
        });
      }
      // Una anulada no espera nada de nadie.
      if (s.estado === "anulado") {
        return Object.assign(s, { accionesPendientes: [] as string[] });
      }

      // Cada formato con flujo propio aporta su tabla; el resto cae en Jurídica.
      // Es una lista y no una escalera de ternarios porque ya son ocho: con cada
      // formato nuevo la escalera se indentaba un nivel más y dejaba de leerse.
      const porFormato: Array<[boolean, Record<string, any>]> = [
        [this.esAnticipo(s), ANTICIPO_TRANSICIONES],
        [this.esLegalizacion(s), LEGALIZACION_TRANSICIONES],
        [this.esCajaMenor(s), CAJA_MENOR_TRANSICIONES],
        [this.esCuentasCompanias(s), CUENTAS_TRANSICIONES],
        [this.esPrestamo(s), PRESTAMO_TRANSICIONES],
        [this.esPermiso(s), PERMISO_TRANSICIONES],
        [this.esHorasExtras(s), HORAS_EXTRAS_TRANSICIONES],
      ];
      const transiciones =
        porFormato.find(([aplica]) => aplica)?.[1] ?? JURIDICA_TRANSICIONES;

      const acciones = Object.entries(transiciones)
        .filter(([, t]) => t.from === s.estado)
        .filter(([, t]) => {
          const anyT = t as {
            soloCreador?: boolean;
            jefeAutorizador?: boolean;
            correctiva?: boolean;
            roles: string[];
          };
          // Las acciones correctivas —devolver algo ya cerrado— no son trabajo
          // pendiente: existen siempre sobre el documento terminado. Contarlas dejaría
          // a quien las tiene con la bandeja llena de asuntos que nadie está esperando.
          if (anyT.correctiva) return false;
          if (esPmo) return true;
          if (anyT.soloCreador) return s.createdBy === userId;
          if (anyT.jefeAutorizador) {
            const tieneRol = anyT.roles.length === 0 || anyT.roles.includes(rol);
            // Paso que además nombra roles (horas extras): si el creador no tiene un
            // Director de Proyecto a cargo, lo atiende cualquiera de ellos. Es la misma
            // regla que aplica `esDirectorDeProyectoACargo` al ejecutar la acción.
            if (
              anyT.roles.length > 0 &&
              s.createdBy != null &&
              !conDirectorACargo.has(s.createdBy)
            ) {
              // Si quien la registró es él mismo Director de Proyecto, se revisa él y
              // nadie más; si no tiene jefe asignado, la atiende cualquiera.
              return creadorEsDirectorProyecto.has(s.createdBy)
                ? tieneRol && s.createdBy === userId
                : tieneRol;
            }
            const esJefe =
              (s.createdBy != null && autorizados.has(s.createdBy)) ||
              (rol === ROL_GERENCIA &&
                s.createdBy != null &&
                (directoresArea.has(s.createdBy) || sinAutorizador.has(s.createdBy)));
            return esJefe && tieneRol;
          }
          return anyT.roles.includes(rol);
        })
        .map(([accion]) => accion);

      return Object.assign(s, { accionesPendientes: acciones });
    });
  }

  /**
   * Una solicitud, y —si se sabe quién pregunta— qué puede hacer con ella.
   *
   * `accionesPendientes` viaja también acá y no solo en el listado porque la pantalla
   * de detalle es donde están los botones. Sin esto el frontend tenía que deducir la
   * jerarquía por su cuenta, y deducía distinto: a un Director de Proyecto que
   * registraba él mismo una planilla el servidor lo dejaba revisarla, pero la pantalla
   * no le pintaba el botón. Quién puede hacer qué se responde en un solo sitio.
   */
  async findOne(id: number, userId?: number): Promise<GcSolicitud> {
    const solicitud = await this.solicitudRepo.findOne({ where: { solicitudId: id } });
    if (!solicitud) throw new NotFoundException("Solicitud no encontrada");
    const conNombre = await this.conNombreDelCreador(solicitud);
    if (!userId) return conNombre;
    const [anotada] = await this.anotarAccionesPendientes([conNombre], userId);
    return anotada;
  }

  /**
   * Añade el nombre de quien creó la solicitud.
   *
   * El historial guarda `userName` en cada entrada, pero la creación no deja
   * entrada —la solicitud nace con el historial vacío—, así que la primera línea
   * de la bitácora no tenía a quién nombrar. `created_by` es un id plano, sin
   * relación, para no tocar otras tablas; se resuelve acá.
   *
   * Va como campo suelto y no como columna: TypeORM ignora al guardar lo que no
   * está mapeado, así que las mutaciones que pasan por `findOne` no lo escriben.
   */
  private async conNombreDelCreador(s: GcSolicitud): Promise<GcSolicitud> {
    if (!s.createdBy) return s;
    const creador = await this.userRepo.findOne({
      where: { userId: s.createdBy },
      select: { userId: true, nombre: true },
    });
    (s as GcSolicitud & { creadorNombre?: string | null }).creadorNombre =
      creador?.nombre ?? null;
    return s;
  }

  /** Edita el cuerpo del formato. Solo mientras está en borrador. */
  async update(id: number, dto: UpdateSolicitudDto): Promise<GcSolicitud> {
    const solicitud = await this.findOne(id);
    if (solicitud.estado !== "borrador") {
      throw new BadRequestException(
        "Solo se puede editar la solicitud mientras está en borrador",
      );
    }
    // Se mezcla para no perder la lista de chequeo (que vive en data.checklist).
    if (dto.data !== undefined) {
      solicitud.data = { ...(solicitud.data ?? {}), ...dto.data };
    }
    // Una legalización no se guarda enlazada a un anticipo que aún no se ha pagado.
    if (this.esLegalizacion(solicitud)) {
      await this.validarAnticipoPagadoSiEnlazado(solicitud.data);
    }
    return this.solicitudRepo.save(solicitud);
  }

  /**
   * Guarda la Lista de Chequeo de Documentos (GA-25-F) de la solicitud. La diligencian
   * Jurídica y Administrativa durante el trámite; se almacena en data.checklist.
   */
  async saveChecklist(
    id: number,
    checklist: Record<string, any>,
    userId: number,
  ): Promise<GcSolicitud> {
    const solicitud = await this.findOne(id);
    const user = await this.userRepo.findOne({
      where: { userId },
      relations: ["role"],
    });
    const nombreRol = user?.role?.nombreRol ?? "";
    const rol = nombreRol.toLowerCase();
    const esPmo = esRolPmo(nombreRol);
    const esJuridica = rol.includes("juríd") || rol.includes("jurid");
    const esAdmin = rol.includes("administrativ");
    if (!esPmo && !esJuridica && !esAdmin) {
      throw new ForbiddenException(
        "Solo Jurídica o Administrativa pueden diligenciar la lista de chequeo",
      );
    }

    const previo = (solicitud.data?.checklist ?? {}) as Record<string, any>;
    const firmadaAdmin = !!previo.revAdminNombre;
    const firmadaJur = !!previo.revJurNombre;
    const etapa = GestionConocimientoService.ladoChecklist(solicitud.estado);

    // Qué lado escribe lo dice el **rol**, no la etapa. Cuando lo decidía la etapa,
    // Jurídica escribía en la cabecera —que es de Administrativa— y ese texto se
    // descartaba al fusionar, sin que nada lo dijera. El PMO es comodín y escribe el
    // lado que esté abierto.
    const lado: "admin" | "juridica" | null = esPmo
      ? etapa
      : esAdmin
        ? "admin"
        : "juridica";

    // La lista sigue siendo secuencial —Administrativa verifica que los documentos
    // estén y solo después Jurídica los revisa—, pero cada lado se cierra **al
    // firmar**, no al avanzar la etapa. Cerrarlo al avanzar dejaba sin salida a la
    // solicitud que pasó a Jurídica con la Etapa previa a medias: el contrato exige
    // las dos firmas y la que faltaba ya no se podía dar.
    let abierto = false;
    if (lado === "admin") {
      abierto =
        estadoAlcanzo(solicitud.estado, "en_tramite_administrativa") &&
        (etapa === "admin" || !firmadaAdmin);
    } else if (lado === "juridica") {
      abierto =
        estadoAlcanzo(solicitud.estado, "contrato_en_elaboracion") &&
        (etapa === "juridica" || !firmadaJur);
    }
    // `!lado` es redundante —sin lado nunca hay `abierto`— pero deja el tipo cerrado
    // para lo que sigue: la fusión necesita saber de qué lado escribe.
    if (!lado || !abierto) {
      throw new BadRequestException(
        GestionConocimientoService.porQueCerrada(
          lado,
          solicitud.estado,
          previo,
        ),
      );
    }

    // Cada lado escribe solo sus columnas: lo que manda el cliente no puede pisar
    // lo que ya verificó el otro.
    const cl = GestionConocimientoService.fusionarChecklist(
      previo,
      checklist,
      lado,
    );

    // Firma automática de la revisión del lado que guarda, sin sobrescribir lo ya
    // firmado. Sale del servidor: el cliente no la puede fabricar.
    const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    if (lado === "admin" && !cl.revAdminNombre) {
      cl.revAdminNombre = user?.nombre ?? "";
      cl.revAdminCargo = user?.cargo ?? "";
      cl.revAdminFecha = cl.revAdminFecha || hoy;
    }
    if (lado === "juridica" && !cl.revJurNombre) {
      cl.revJurNombre = user?.nombre ?? "";
      cl.revJurCargo = user?.cargo ?? "";
      cl.revJurFecha = cl.revJurFecha || hoy;
    }

    solicitud.data = { ...(solicitud.data ?? {}), checklist: cl };
    return this.solicitudRepo.save(solicitud);
  }

  /** Columnas del GA-25-F que le corresponden a cada lado. */
  private static readonly CAMPOS_ADMIN = ["presentaSi", "presentaNo", "obsAdm"];
  private static readonly CAMPOS_JUR = ["revSi", "revNo", "obsJur"];
  /** Cabecera del formato: la diligencia Administrativa junto con su columna. */
  private static readonly CAMPOS_CABECERA = [
    "contratante",
    "contratista",
    "supervisor",
    "docsUrl",
  ];

  /**
   * Por qué la lista no admite este guardado. Se separa del control de acceso para
   * poder decir qué pasó: "no puedes" sin motivo obliga a adivinar entre tres causas
   * distintas —el lado ya firmó, la etapa no ha llegado, o el rol no participa—.
   */
  private static porQueCerrada(
    lado: "admin" | "juridica" | null,
    estado: string,
    previo: Record<string, any>,
  ): string {
    if (!lado) {
      return "La lista de chequeo solo se diligencia en trámite (Administrativa) y en revisión del contrato (Jurídica).";
    }
    if (lado === "admin") {
      if (!estadoAlcanzo(estado, "en_tramite_administrativa")) {
        return "La Etapa previa se abre cuando la solicitud llega a trámite (Administrativa).";
      }
      return `La Etapa previa ya está firmada por ${previo.revAdminNombre}: es un registro del trámite, no un borrador.`;
    }
    if (!estadoAlcanzo(estado, "contrato_en_elaboracion")) {
      return "La Etapa contractual se abre cuando la solicitud pasa a revisión del contrato (Jurídica).";
    }
    return `La Etapa contractual ya está firmada por ${previo.revJurNombre}: es un registro del trámite, no un borrador.`;
  }

  /** Qué lado de la lista está abierto, según la etapa de la solicitud. */
  private static ladoChecklist(estado: string): "admin" | "juridica" | null {
    if (estado === "en_tramite_administrativa") return "admin";
    if (estado === "contrato_en_elaboracion") return "juridica";
    return null;
  }

  /**
   * Mezcla lo que llega con lo guardado dejando que el lado que edita pise
   * **solo** sus columnas. Las firmas vienen siempre de lo guardado: las estampa
   * el servidor más abajo.
   */
  private static fusionarChecklist(
    previo: Record<string, any>,
    entrante: Record<string, any>,
    lado: "admin" | "juridica",
  ): Record<string, any> {
    const base: Record<string, any> = { ...previo };
    if (lado === "admin") {
      for (const c of GestionConocimientoService.CAMPOS_CABECERA) {
        base[c] = entrante[c] ?? previo[c] ?? "";
      }
    }

    const mios =
      lado === "admin"
        ? GestionConocimientoService.CAMPOS_ADMIN
        : GestionConocimientoService.CAMPOS_JUR;
    const itemsPrevios = (previo.items ?? {}) as Record<string, any>;
    const itemsEntrantes = (entrante.items ?? {}) as Record<string, any>;
    const claves = Array.from(
      new Set([...Object.keys(itemsPrevios), ...Object.keys(itemsEntrantes)]),
    );
    const items: Record<string, any> = {};
    for (const clave of claves) {
      const fila = { ...(itemsPrevios[clave] ?? {}) };
      const nueva = (itemsEntrantes[clave] ?? {}) as Record<string, any>;
      for (const c of mios) if (c in nueva) fila[c] = nueva[c];
      items[clave] = fila;
    }
    base.items = items;
    return base;
  }

  /** Las dos revisiones firmadas: Administrativa verificó y Jurídica revisó. */
  private static checklistCompleto(solicitud: GcSolicitud): boolean {
    const cl = (solicitud.data?.checklist ?? {}) as Record<string, any>;
    return !!cl.revAdminNombre && !!cl.revJurNombre;
  }

  /** Documentos que viven en data[key]. */
  private static readonly DOC_KEYS = [
    "designacionSupervisor",
    "actaInicio",
    "contrato",
    // Lista de verificación de garantías + matriz resumen de riesgo contractual.
    "verificacionGarantias",
    // Acta de Aprobación de Garantías: la conclusión de la verificación —los datos de
    // cada póliza y su CUMPLE / NO CUMPLE—, que es lo que se firma y se archiva.
    "aprobacionGarantias",
    // Solicitud de Requisición de Personal (GTH-001-F).
    "requisicionPersonal",
    // Los otrosíes del contrato. A diferencia de los demás no es un documento sino una
    // colección —{ lista: [...] }—: un mismo contrato puede prorrogarse o adicionarse
    // varias veces, y cada otrosí numera y cita a los anteriores.
    "otrosies",
  ];

  /**
   * Documentos que **no** son de Jurídica.
   *
   * La requisición de personal la diligencia el área que pide la vacante, con 15 días
   * de anticipación, para que Gestión Humana alcance a hacer la selección: exigir que
   * la escriba Jurídica invertiría el orden real del trámite. Por eso aquí también
   * pueden el creador de la solicitud y Administrativa, además de Jurídica y el PMO.
   */
  private static readonly DOCS_DEL_SOLICITANTE = new Set(["requisicionPersonal"]);

  /**
   * Documentos que al guardarse avisan por correo a la Dirección Administrativa.
   *
   * Los dos cierran la fase de Jurídica y abren trabajo de Administrativa, que hoy se
   * entera por fuera del sistema: sin el supervisor no hay con quién coordinar el
   * seguimiento, y sin el acta no se sabe desde cuándo corre el plazo —de ahí cuelgan
   * el anticipo y su legalización—.
   */
  private static readonly DOCS_AVISAN_ADMINISTRATIVA: Record<
    string,
    { nombre: string; formato: string; porque: string }
  > = {
    designacionSupervisor: {
      nombre: "Designación de supervisor",
      formato: "GJ-003-F",
      porque:
        "el supervisor designado es con quien se coordina el seguimiento del contrato y los informes para pagos",
    },
    actaInicio: {
      nombre: "Acta de inicio",
      formato: "GJ-006-F",
      porque:
        "con el acta arranca el plazo de ejecución, y sobre él van el anticipo y su legalización",
    },
  };

  /**
   * Guarda un documento de fase 2 (designación de supervisor, acta de inicio) en
   * data[key]. Los diligencia Jurídica (o el PMO como comodín).
   */
  async saveDocumento(
    id: number,
    key: string,
    docData: Record<string, any>,
    userId: number,
  ): Promise<GcSolicitud> {
    if (!GestionConocimientoService.DOC_KEYS.includes(key)) {
      throw new BadRequestException("Documento no válido");
    }
    const solicitud = await this.findOne(id);
    const user = await this.userRepo.findOne({
      where: { userId },
      relations: ["role"],
    });
    // El comodín es el grupo PMO completo, no un nombre suelto: tenía escrito
    // "analista pmo" a mano, y con eso el Director PMO —mismo alcance— quedaba
    // por fuera de los documentos de fase 2 sin ninguna razón.
    const nombreRol = user?.role?.nombreRol ?? "";
    const rol = nombreRol.toLowerCase();
    const esJuridica = rol.includes("juríd") || rol.includes("jurid");
    let permitido = esRolPmo(nombreRol) || esJuridica;
    if (!permitido && GestionConocimientoService.DOCS_DEL_SOLICITANTE.has(key)) {
      permitido =
        solicitud.createdBy === userId || rol.includes("administrativ");
    }
    if (!permitido) {
      throw new ForbiddenException(
        GestionConocimientoService.DOCS_DEL_SOLICITANTE.has(key)
          ? "Este documento lo diligencia quien pide la vacante, Administrativa o Jurídica"
          : "Solo Jurídica puede diligenciar este documento",
      );
    }

    // El contrato no se redacta hasta que la lista de chequeo esté revisada por los
    // dos lados: es lo que garantiza que los documentos estén completos y verificados.
    // Solo se exige en la etapa donde se redacta; más adelante el contrato ya existe
    // y bloquear su edición no protegería nada.
    if (
      key === "contrato" &&
      solicitud.estado === "contrato_en_elaboracion" &&
      !GestionConocimientoService.checklistCompleto(solicitud)
    ) {
      throw new BadRequestException(
        "La lista de chequeo debe estar revisada por la Dirección Administrativa y por la Dirección Jurídica antes de generar el contrato.",
      );
    }

    let cuerpo = docData;

    // La constancia de quién verificó la garantía la estampa el servidor, igual que
    // las revisiones de la lista de chequeo: es el respaldo de que alguien reviso la
    // póliza, y un campo escribible sería una constancia que cualquiera puede poner a
    // nombre de otro. Se pone una sola vez —no la pisa un guardado posterior— y lo que
    // mande el cliente en esos tres campos se ignora.
    if (key === "verificacionGarantias") {
      const previo = (solicitud.data?.[key] ?? {}) as Record<string, any>;
      cuerpo = {
        ...docData,
        verificoNombre: previo.verificoNombre || user?.nombre || "",
        verificoCargo: previo.verificoCargo || user?.cargo || "",
        verificoFecha:
          previo.verificoFecha || new Date().toISOString().slice(0, 10),
      };
    }

    const data: Record<string, any> = { ...(solicitud.data ?? {}), [key]: cuerpo };

    // El contrato recibe su consecutivo la primera vez que se guarda, y no se
    // vuelve a tocar: el número sale a firma y a archivo, así que reasignarlo
    // rompería la referencia de un documento que ya circuló.
    if (key === "contrato" && !data.consecutivoContrato) {
      data.consecutivoContrato = await this.nextConsecutivoContrato(
        String(data.tipoContrato ?? ""),
      );
    }

    solicitud.data = data;
    const guardada = await this.solicitudRepo.save(solicitud);

    // El aviso no bloquea el guardado: si el correo falla, el documento ya quedó
    // guardado y lo que se pierde es la notificación, que se registra en el log.
    const aviso = GestionConocimientoService.DOCS_AVISAN_ADMINISTRATIVA[key];
    if (aviso) {
      this.notificarDocumentoAdministrativa(guardada, aviso, user).catch((e) =>
        this.logger.warn(
          `No se pudo avisar a Administrativa de ${aviso.nombre} (solicitud ${guardada.solicitudId}): ${e.message}`,
        ),
      );
    }

    return guardada;
  }

  /**
   * Avisa a la Dirección Administrativa que Jurídica guardó uno de sus documentos.
   *
   * Sale en cada guardado, no solo en el primero: una designación corregida o un acta
   * con otra fecha de inicio cambian lo que Administrativa tiene que hacer, y un aviso
   * único dejaría la corrección sin contar.
   */
  private async notificarDocumentoAdministrativa(
    solicitud: GcSolicitud,
    doc: { nombre: string; formato: string; porque: string },
    autor?: User | null,
  ): Promise<void> {
    const activos = await this.userRepo.find({
      where: { estado: true },
      relations: ["role"],
    });
    const objetivo = ROLES_ADMINISTRATIVA.map((r) => r.toLowerCase());
    const usuarios = activos.filter((u) =>
      objetivo.includes(u.role?.nombreRol?.toLowerCase() ?? ""),
    );
    if (usuarios.length === 0) {
      // Sin destinatarios el aviso no falla, pero tampoco puede pasar por enviado.
      this.logger.warn(
        `No hay usuarios activos de la Dirección Administrativa: ${doc.nombre} de la solicitud ${solicitud.solicitudId} no se avisó a nadie.`,
      );
      return;
    }

    const data: Record<string, any> = solicitud.data ?? {};
    const nro =
      String(data.consecutivoContrato ?? "").trim() ||
      `N.º ${solicitud.solicitudId}`;
    const contratista = String(data.contratista ?? "").trim();
    const objeto = String(data.objetoProyecto ?? "").trim();
    // El supervisor y la fecha de inicio son justamente el dato accionable de cada
    // documento: se ponen en el cuerpo para no obligar a entrar a leerlos.
    const supervisor = String(
      data.designacionSupervisor?.supervisorNombre ?? "",
    ).trim();
    const inicio = String(data.actaInicio?.fechaInicio ?? "").trim();
    const final = String(data.actaInicio?.fechaFinal ?? "").trim();

    const enviados: string[] = [];
    for (const u of usuarios) {
      const to = u.emailNotificacion || u.email;
      if (!to || enviados.includes(to.toLowerCase())) continue;
      enviados.push(to.toLowerCase());
      await this.notifications.sendEmail({
        to,
        subject: `${doc.nombre} · contrato ${nro}${contratista ? ` · ${contratista}` : ""}`,
        html: `
      <div style="font-family:Arial,sans-serif;color:#1f2937">
        <p>Hola ${u.nombre ?? ""},</p>
        <p>Jurídica guardó la <b>${doc.nombre}</b> (${doc.formato}) del contrato
           <b>${nro}</b>${contratista ? ` con <b>${contratista}</b>` : ""}.</p>
        ${objeto ? `<p><b>Objeto:</b> ${objeto}</p>` : ""}
        ${supervisor ? `<p><b>Supervisor designado:</b> ${supervisor}</p>` : ""}
        ${inicio ? `<p><b>Fecha de inicio:</b> ${inicio}${final ? ` · <b>termina:</b> ${final}` : ""}</p>` : ""}
        <p>Te llega porque ${doc.porque}.</p>
        <p style="color:#6b7280;font-size:12px">
          ${autor?.nombre ? `Guardada por ${autor.nombre}${autor.cargo ? ` · ${autor.cargo}` : ""} · ` : ""}
          Gestión del conocimiento · G. Jurídica
        </p>
      </div>`,
      });
    }
  }

  /**
   * Siguiente consecutivo del contrato para su tipología: "PS - 0001".
   *
   * Cada tipo cuenta aparte, así que solo se miran los consecutivos que ya llevan
   * su sigla. Se calcula sobre lo emitido (máximo + 1) igual que el consecutivo de
   * la Solicitud de Anticipo: sin tabla de secuencias, que con `synchronize: true`
   * es una estructura menos que mantener.
   */
  private async nextConsecutivoContrato(tipo: string): Promise<string> {
    const sigla = SIGLA_CONTRATO[tipo] ?? SIGLA_SIN_TIPO;
    const previas = await this.solicitudRepo.find({ where: { gestion: "juridica" } });
    let max = 0;
    for (const p of previas) {
      const n = numeroDeConsecutivo(p.data?.consecutivoContrato, sigla);
      if (n !== null && n > max) max = n;
    }
    return formatearConsecutivo(sigla, max + 1);
  }

  async remove(id: number): Promise<void> {
    const solicitud = await this.findOne(id);
    // Una vez enviada, la solicitud tiene historial y firmas: se conserva para
    // trazabilidad (igual que una requisición anulada en Compras).
    if (solicitud.estado !== "borrador") {
      throw new BadRequestException(
        "Solo se puede eliminar mientras está en borrador; una vez enviada se conserva para trazabilidad.",
      );
    }
    await this.solicitudRepo.remove(solicitud);
  }

  /**
   * Aplica una transición del flujo: valida estado de origen y rol, exige motivo en
   * las devoluciones, deja la transición en la bitácora y notifica al siguiente actor.
   */
  async transition(
    id: number,
    accion: string,
    userId: number,
    motivo?: string,
    payload?: Record<string, any>,
  ): Promise<GcSolicitud> {
    const solicitud = await this.findOne(id);

    // La anulación es transversal: se toma desde cualquier estado de cualquiera de los
    // cuatro formatos de Talento Humano, así que se resuelve antes del reparto por
    // formato. Si no, cada máquina de estados tendría que repetir las mismas tres
    // acciones para cada uno de sus estados.
    if (esAccionDeAnulacion(accion) && FORMATOS_ANULABLES.includes(solicitud.formato)) {
      return this.transitionAnulacion(solicitud, accion, userId, motivo);
    }

    // Una solicitud anulada no admite nada más: es el final del camino.
    if (solicitud.estado === "anulado") {
      throw new BadRequestException(
        "La solicitud está anulada y no admite más acciones.",
      );
    }

    // El anticipo (GF-005-F) usa su propia máquina de estados.
    if (this.esAnticipo(solicitud)) {
      return this.transitionAnticipo(solicitud, accion, userId, motivo, payload);
    }

    // La legalización (GCT-006-F) también tiene la suya.
    if (this.esLegalizacion(solicitud)) {
      return this.transitionLegalizacion(solicitud, accion, userId, motivo, payload);
    }

    // Y las cuentas entre compañías (GF-004-F5), que solo custodian y concilian.
    if (this.esCuentasCompanias(solicitud)) {
      return this.transitionCuentas(solicitud, accion, userId, motivo, payload);
    }

    // El Reembolso de Caja Menor (GF-007-F) recorre las tres firmas de su pie.
    if (this.esCajaMenor(solicitud)) {
      return this.transitionCajaMenor(solicitud, accion, userId, motivo);
    }

    // La Solicitud de Préstamo (GTH-007-F) recorre las firmas de su propio formato.
    if (this.esPrestamo(solicitud)) {
      return this.transitionPrestamo(solicitud, accion, userId, motivo, payload);
    }

    // La Solicitud de Permiso (GTH-009-F) la resuelve el jefe de área del solicitante.
    if (this.esPermiso(solicitud)) {
      return this.transitionPermiso(solicitud, accion, userId, motivo, payload);
    }

    // La planilla de Horas Extras (GTH-016-F) pasa por cuatro manos.
    if (this.esHorasExtras(solicitud)) {
      return this.transitionHorasExtras(solicitud, accion, userId, motivo);
    }

    // La Solicitud de Vacaciones (GTH-018-F) recorre los cuatro recuadros del papel.
    if (this.esVacaciones(solicitud)) {
      return this.transitionVacaciones(solicitud, accion, userId, motivo);
    }

    const t = JURIDICA_TRANSICIONES[accion];
    if (!t) throw new BadRequestException(`Acción "${accion}" no válida`);

    if (solicitud.estado !== t.from) {
      throw new BadRequestException(
        `La solicitud está en "${solicitud.estado}" y no admite la acción "${accion}"`,
      );
    }

    // "Pólizas solicitadas" ya no es un paso manual: el flujo avanza al aprobar la
    // requisición de la póliza (Dirección Administrativa y Financiera). Se bloquea
    // mientras esa requisición siga pendiente de aprobación.
    if (accion === "polizas_solicitadas") {
      const rp = solicitud.data?.requisicionPoliza;
      if (rp?.requisitionId && !rp.estado && !rp.error) {
        throw new BadRequestException(
          "Primero debe aprobarse la requisición de la póliza (Dirección Administrativa y Financiera).",
        );
      }
    }

    const user = await this.userRepo.findOne({
      where: { userId },
      relations: ["role"],
    });
    const rol = user?.role?.nombreRol ?? "";

    // Autorización: el PMO siempre puede; si no, se valida el rol o el creador.
    const esPmo = esRolPmo(rol);
    const rolPermitido = t.roles.includes(rol);
    const esCreador = solicitud.createdBy === userId;
    const autorizado = esPmo || rolPermitido || (t.soloCreador && esCreador);
    if (!autorizado) {
      throw new ForbiddenException("No tienes permiso para ejecutar esta acción");
    }

    if (t.requiereMotivo && (!motivo || !motivo.trim())) {
      throw new BadRequestException("Debe indicar el motivo");
    }

    /*
     * Quién firma la solicitud depende de quién la monta, igual que en Compras.
     *
     * Si la monta un Director de Área no hay a quién pedirle autorización por encima:
     * su jefe es la Gerencia. La solicitud salta el paso de Gerencia de Proyectos
     * (Lorena) y va directo a la firma de la Dra. Gloria, y en el formato solo se
     * firman «Solicitado por» y «Aprobado por». Cualquier otro rol —PQR, coordinación,
     * analistas— sigue el orden completo: autoriza Lorena y aprueba Gerencia.
     *
     * Se deja constancia en `autorizacionGpOmitida` en vez de deducirlo después de que
     * «Autorizado por» esté vacío: vacío también está mientras la autorización sigue
     * pendiente, y el recuadro impreso no puede depender de en qué momento se mire.
     */
    let destino: JuridicaEstado = t.to;
    let omitirAutorizacion = false;
    if (accion === "enviar") {
      const creador = solicitud.createdBy
        ? await this.userRepo.findOne({
            where: { userId: solicitud.createdBy },
            relations: ["role"],
          })
        : null;
      omitirAutorizacion = creador?.role?.category === CATEGORIA_DIRECTOR_AREA;
      if (omitirAutorizacion) destino = "pendiente_firma_gerencia";
    }

    /*
     * Una requisición de personal termina al firmarse el contrato.
     *
     * Lo que sigue en el flujo —pólizas, verificación y aprobación de garantías,
     * designación de supervisor y acta de inicio— es del contrato con un tercero: a un
     * empleado no se le exige póliza ni se le designa supervisor de contrato. Dejarla
     * seguir por ahí obligaba a Jurídica a atravesar seis etapas que no le aplican para
     * poder cerrar el trámite.
     *
     * Se cambia el destino y no se bloquean las acciones siguientes: las requisiciones de
     * personal que ya venían corriendo por pólizas cuando esto se cerró siguen en esos
     * estados, y quitarles la salida las dejaría trancadas para siempre.
     */
    if (accion === "firmar_contrato" && esRequisicionDePersonal(solicitud.data)) {
      destino = "finalizado";
    }

    const ahora = new Date();
    const entrada = {
      estado: destino,
      accion,
      fecha: ahora.toISOString(),
      userId,
      userName: user?.nombre ?? null,
      motivo: motivo?.trim() || undefined,
    };
    solicitud.estado = destino;
    solicitud.estadoDesde = ahora;
    await this.asignarNumero(solicitud);
    solicitud.historial = [...(solicitud.historial ?? []), entrada];

    // Firmas automáticas del recuadro AUTORIZACIONES del formato:
    //  - la autorización de Gerencia de Proyectos llena "Autorizado por";
    //  - la firma de la solicitud por Gerencia (Dra. Gloria) llena "Aprobado por".
    // (La firma del contrato va en el formato del contrato, no en este recuadro.)
    const data: Record<string, any> = { ...(solicitud.data ?? {}) };
    if (omitirAutorizacion) data.autorizacionGpOmitida = true;
    if (accion === "autorizar_gp") {
      data.autorizadoNombre = user?.nombre ?? "";
      data.autorizadoCargo = user?.cargo ?? "";
    } else if (accion === "aprobar_gerencia") {
      data.aprobadoNombre = user?.nombre ?? "";
      data.aprobadoCargo = user?.cargo ?? "";
    } else if (accion === "pagar_polizas") {
      // El pago de la póliza deja constancia, no solo un cambio de estado: la
      // verificación de garantías que sigue coteja número y vigencias, y sin
      // ellos no tiene contra qué verificar.
      const numero = String(payload?.polizaNumero ?? "").trim();
      const fecha = String(payload?.pagoFecha ?? "").trim();
      if (!numero || !fecha) {
        throw new BadRequestException(
          "Para registrar el pago hacen falta el número de la póliza y la fecha de pago.",
        );
      }
      data.poliza = {
        ...(data.poliza ?? {}),
        numero,
        vigenciaDesde: String(payload?.polizaVigenciaDesde ?? "").trim(),
        vigenciaHasta: String(payload?.polizaVigenciaHasta ?? "").trim(),
        pagoFecha: fecha,
        pagoValor: String(payload?.pagoValor ?? "").trim(),
        registradoPor: user?.nombre ?? "",
        registradoEn: ahora.toISOString(),
      };
    }
    solicitud.data = data;

    const guardada = await this.solicitudRepo.save(solicitud);

    // Al iniciar la solicitud de pólizas se crea automáticamente la requisición
    // de la póliza (ítem POLIZA) en Gestión de Compras. No debe bloquear la
    // transición jurídica si Compras falla: se registra el resultado en la data.
    if (accion === "solicitar_polizas") {
      this.crearRequisicionPoliza(guardada, userId).catch((e) =>
        this.logger.warn(
          `No se pudo crear la requisición de la póliza: ${e.message}`,
        ),
      );
    }

    // Con el acta de inicio firmada el contrato arranca: se avisa a quienes tienen
    // que actuar desde el día uno. Va aparte de `notificar` porque no es el aviso
    // "te toca el siguiente paso" del flujo —el flujo terminó— y porque uno de los
    // destinatarios es el contratista, que está fuera de la empresa.
    if (accion === "acta_inicio_lista") {
      this.notificarInicioContrato(guardada.solicitudId, userId).catch((e) =>
        this.logger.warn(
          `No se pudo notificar el inicio del contrato: ${e.message}`,
        ),
      );
    }

    this.notificar(guardada, t.to as JuridicaEstado, motivo).catch((e) =>
      this.logger.warn(`No se pudo notificar la transición: ${e.message}`),
    );

    return guardada;
  }

  /**
   * Crea automáticamente la requisición de la póliza en Gestión de Compras cuando
   * la solicitud jurídica entra a "Solicitud de pólizas". La empresa y el proyecto se
   * resuelven a partir del centro de costo (centro de operación) elegido en el formato;
   * el ítem es el material POLIZA (código 4242). El resultado se guarda en
   * data.requisicionPoliza para enlazarlo y evitar duplicados.
   */
  private async crearRequisicionPoliza(
    solicitud: GcSolicitud,
    userId: number,
  ): Promise<void> {
    const data: Record<string, any> = { ...(solicitud.data ?? {}) };

    // Idempotencia: si ya se creó (p. ej. tras un rechazo/reintento), no duplicar.
    if (data.requisicionPoliza?.requisitionId) return;

    const centroCosto = String(data.centroCosto ?? "").trim();
    if (!centroCosto) {
      await this.registrarResultadoPoliza(solicitud.solicitudId, {
        error: "La solicitud no tiene centro de costo para resolver la empresa/proyecto.",
        fecha: new Date().toISOString(),
      });
      return;
    }

    // El centro de operación enlaza empresa y proyecto (companyId + projectId).
    const oc = await this.operationCenterRepo.findOne({
      where: { code: centroCosto },
    });
    if (!oc) {
      await this.registrarResultadoPoliza(solicitud.solicitudId, {
        error: `No se encontró el centro de operación con código "${centroCosto}".`,
        fecha: new Date().toISOString(),
      });
      return;
    }

    const material = await this.materialRepo.findOne({
      where: { code: GestionConocimientoService.MATERIAL_POLIZA_CODE },
    });
    if (!material) {
      await this.registrarResultadoPoliza(solicitud.solicitudId, {
        error: `No se encontró el material POLIZA (código ${GestionConocimientoService.MATERIAL_POLIZA_CODE}).`,
        fecha: new Date().toISOString(),
      });
      return;
    }

    const objeto = String(data.objetoProyecto ?? "").trim();
    // La observación la lee Compras, que no sabe de solicitudes jurídicas: lo que
    // les sirve es el número del contrato. Los contratos anteriores al consecutivo
    // no tienen uno, y para ésos se conserva el número de solicitud en vez de
    // dejar la póliza sin referencia.
    const nroContrato = String(data.consecutivoContrato ?? "").trim();
    const referencia = nroContrato || `Solicitud jurídica N.º ${solicitud.solicitudId}`;
    const observacion =
      `Póliza del contrato ${referencia}` + (objeto ? ` — ${objeto}` : "");

    try {
      const requisicion: any = await this.purchases.createRequisition(
        userId,
        {
          companyId: oc.companyId,
          projectId: oc.projectId ?? undefined,
          priority: "normal",
          items: [
            {
              materialId: material.materialId,
              quantity: 1,
              observation: observacion,
            },
          ],
        },
        // Requisición generada por el sistema al iniciar las pólizas: no depende del
        // permiso de crear de Compras (skipCreatePermission) y se marca como póliza
        // del proceso jurídico (polizaJuridica) para que la apruebe la Dirección
        // Administrativa y Financiera, no Gerencia.
        { skipCreatePermission: true, polizaJuridica: true },
      );

      await this.registrarResultadoPoliza(solicitud.solicitudId, {
        requisitionId: requisicion?.requisitionId ?? null,
        requisitionNumber: requisicion?.requisitionNumber ?? null,
        fecha: new Date().toISOString(),
        // Nace en la bandeja de Compras, sin aprobación previa. Marcarla resuelta
        // desde el arranque es lo que quita de la pantalla los botones de aprobar
        // y rechazar, que ya no tienen a quién esperar.
        estado: "en_cotizacion",
      });
    } catch (e: any) {
      await this.registrarResultadoPoliza(solicitud.solicitudId, {
        error: e?.message ?? "No se pudo crear la requisición en Compras.",
        fecha: new Date().toISOString(),
      });
      throw e;
    }
  }

  /**
   * Crea la requisición de la póliza a pedido, sin mover el flujo.
   *
   * La rama de pólizas se recorre normalmente desde "Contrato firmado", pero hay
   * contratos que ya pasaron de ahí sin RQ: los que se firmaron antes de que la rama
   * existiera, y aquellos donde la póliza se exige más tarde. Para ésos la transición
   * `solicitar_polizas` ya no está disponible y quedaban sin forma de pedirla.
   *
   * Esta acción no cambia el estado a propósito: un contrato con acta de inicio
   * firmada no debería retroceder a "Solicitud de pólizas" solo para emitir una
   * requisición. Queda registrada en la bitácora, que es donde se audita.
   */
  async solicitarRequisicionPoliza(
    id: number,
    userId: number,
  ): Promise<GcSolicitud> {
    const solicitud = await this.findOne(id);

    if (!ESTADOS_CONTRATO_VIGENTE.has(solicitud.estado)) {
      throw new BadRequestException(
        "La póliza se solicita sobre un contrato ya firmado.",
      );
    }

    const user = await this.userRepo.findOne({
      where: { userId },
      relations: ["role"],
    });
    const rol = user?.role?.nombreRol ?? "";
    const permitido =
      esRolPmo(rol) ||
      [...ROLES_ADMINISTRATIVA, ...ROLES_JURIDICA].includes(rol);
    if (!permitido) {
      throw new ForbiddenException(
        "Solo la Dirección Administrativa o Jurídica puede solicitar la póliza.",
      );
    }

    const previa = solicitud.data?.requisicionPoliza;
    if (previa?.requisitionId) {
      throw new BadRequestException(
        `Esta solicitud ya tiene la requisición de póliza ${previa.requisitionNumber ?? previa.requisitionId}.`,
      );
    }

    await this.crearRequisicionPoliza(solicitud, userId);

    // crearRequisicionPoliza deja el motivo en data cuando no puede crearla (sin
    // centro de costo, sin centro de operación, sin el material POLIZA) y no
    // levanta excepción. Se relee para poder devolver ese motivo a la pantalla en
    // vez de un "listo" que no creó nada.
    const actualizada = await this.findOne(id);
    const rp = actualizada.data?.requisicionPoliza;
    if (!rp?.requisitionId) {
      throw new BadRequestException(
        rp?.error ?? "No se pudo crear la requisición de la póliza.",
      );
    }

    actualizada.historial = [
      ...(actualizada.historial ?? []),
      {
        estado: actualizada.estado,
        accion: ACCION_RQ_POLIZA,
        fecha: new Date().toISOString(),
        userId,
        userName: user?.nombre ?? null,
        requisicion: rp.requisitionNumber ?? String(rp.requisitionId),
        motivo: "Requisición de póliza solicitada fuera del flujo automático.",
      },
    ];
    return this.solicitudRepo.save(actualizada);
  }

  /** Guarda en data.requisicionPoliza el resultado (éxito o error) de la creación. */
  private async registrarResultadoPoliza(
    solicitudId: number,
    resultado: Record<string, any>,
  ): Promise<void> {
    const actual = await this.solicitudRepo.findOne({ where: { solicitudId } });
    if (!actual) return;
    actual.data = { ...(actual.data ?? {}), requisicionPoliza: resultado };
    await this.solicitudRepo.save(actual);
  }

  /**
   * Aprueba o rechaza la requisición de la póliza enlazada a la solicitud jurídica,
   * desde el propio flujo de G. Jurídica. La autorización (solo la Dirección
   * Administrativa y Financiera; Gerencia no participa) la valida el servicio de
   * Compras al aprobar/rechazar la requisición con ítem POLIZA.
   */
  async resolverPolizaRequisicion(
    id: number,
    userId: number,
    decision: "aprobar" | "rechazar",
    comentario?: string,
  ): Promise<GcSolicitud> {
    if (decision !== "aprobar" && decision !== "rechazar") {
      throw new BadRequestException("Decisión no válida");
    }
    const solicitud = await this.findOne(id);
    const data: Record<string, any> = { ...(solicitud.data ?? {}) };
    const info = data.requisicionPoliza;
    const reqId = info?.requisitionId;
    if (!reqId) {
      throw new BadRequestException(
        "Esta solicitud no tiene una requisición de póliza creada.",
      );
    }
    if (info?.estado === "en_cotizacion") {
      // Las nuevas nacen en Compras: aprobarlas aquí no tendría efecto (Compras
      // rechazaría el cambio de estado) y el mensaje genérico confundiría.
      throw new BadRequestException(
        "Esta requisición de póliza ya está en Compras para cotización: no requiere aprobación.",
      );
    }
    if (info?.estado === "aprobada" || info?.estado === "rechazada") {
      throw new BadRequestException("La requisición de la póliza ya fue resuelta.");
    }
    if (decision === "rechazar" && (!comentario || !comentario.trim())) {
      throw new BadRequestException("Debe indicar el motivo del rechazo.");
    }

    const user = await this.userRepo.findOne({
      where: { userId },
      relations: ["role"],
    });

    // La bandera juridicaPoliza indica a Compras que esta requisición proviene del
    // proceso jurídico: la resuelve SOLO la Dirección Administrativa y Financiera
    // (Daniela) y Gerencia no participa. Fuera de este proceso no se activa nunca.
    if (decision === "aprobar") {
      await this.purchases.approveRequisition(
        reqId,
        userId,
        { comments: comentario?.trim() || "Póliza aprobada" },
        { juridicaPoliza: true },
      );
    } else {
      await this.purchases.rejectRequisitionByManager(
        reqId,
        userId,
        { comments: comentario!.trim() },
        { juridicaPoliza: true },
      );
    }

    data.requisicionPoliza = {
      ...info,
      estado: decision === "aprobar" ? "aprobada" : "rechazada",
      resueltaPor: user?.nombre ?? null,
      resueltaFecha: new Date().toISOString(),
      motivo: decision === "rechazar" ? comentario!.trim() : undefined,
    };
    solicitud.data = data;
    const guardada = await this.solicitudRepo.save(solicitud);

    // Al aprobar la requisición de la póliza, el flujo jurídico avanza solo del
    // paso "Solicitud de pólizas" al de "Aprobación de pólizas (Jurídica)". El
    // rechazo solo se registra (no avanza). El avance ya no es un botón manual.
    if (decision === "aprobar" && guardada.estado === "en_solicitud_polizas") {
      return this.transition(id, "polizas_solicitadas", userId);
    }
    return guardada;
  }

  /** Notifica por correo al actor que sigue (o al creador cuando el flujo vuelve/termina). */
  private async notificar(
    solicitud: GcSolicitud,
    estado: JuridicaEstado,
    motivo?: string,
  ): Promise<void> {
    const destino = NOTIFICAR_AL_LLEGAR[estado];
    let usuarios: User[] = [];

    if (destino === "creador") {
      if (solicitud.createdBy) {
        const creador = await this.userRepo.findOne({
          where: { userId: solicitud.createdBy },
        });
        if (creador) usuarios = [creador];
      }
    } else {
      // Igual que surveys: se traen los activos con su rol y se filtra en memoria.
      const activos = await this.userRepo.find({
        where: { estado: true },
        relations: ["role"],
      });
      const objetivo = destino.map((r) => r.toLowerCase());
      usuarios = activos.filter((u) =>
        objetivo.includes(u.role?.nombreRol?.toLowerCase() ?? ""),
      );
    }

    const label = JURIDICA_ESTADOS[estado].label;
    const nro = solicitud.solicitudId;
    const objeto = (solicitud.data?.objetoProyecto || "").toString().trim();

    const enviados = new Set<string>();
    for (const u of usuarios) {
      const to = u.emailNotificacion || u.email;
      if (!to || enviados.has(to.toLowerCase())) continue;
      enviados.add(to.toLowerCase());
      await this.notifications.sendEmail({
        to,
        subject: `Solicitud jurídica N.º ${nro} · ${label}`,
        html: this.buildHtml(u.nombre ?? "", nro, label, objeto, motivo),
      });
    }
  }

  private buildHtml(
    nombre: string,
    nro: number,
    label: string,
    objeto: string,
    motivo?: string,
  ): string {
    return `
      <div style="font-family:Arial,sans-serif;color:#1f2937">
        <p>Hola ${nombre || ""},</p>
        <p>La solicitud jurídica <b>N.º ${nro}</b> (formato GTH-002-F) pasó al estado
           <b>${label}</b>${objeto ? ` — <i>${objeto}</i>` : ""}.</p>
        ${motivo ? `<p><b>Motivo:</b> ${motivo}</p>` : ""}
        <p>Ingresa al sistema para continuar con el trámite.</p>
        <p style="color:#6b7280;font-size:12px">Sistema de Gestión · Gestión del conocimiento</p>
      </div>`;
  }

  // ============================================
  // Inicio del contrato (G. Jurídica)
  // ============================================

  /**
   * Avisa que el contrato arrancó, al firmarse el acta de inicio.
   *
   * Tres destinatarios y cada uno por una razón distinta: el **supervisor**, porque
   * el seguimiento empieza el día uno; la **Dirección Administrativa**, porque de
   * ahí cuelgan el anticipo y su legalización; y el **contratista**, que es el
   * único correo que sale de la empresa y por eso lleva un texto propio, sin datos
   * internos del trámite.
   *
   * El supervisor se guarda como texto en la designación, no como usuario, así que
   * se empareja por nombre. Si no aparece, se deja constancia en la bitácora en vez
   * de dar por enviado un aviso que nadie recibió.
   */
  private async notificarInicioContrato(
    solicitudId: number,
    userId: number,
  ): Promise<void> {
    const solicitud = await this.findOne(solicitudId);
    const data: Record<string, any> = solicitud.data ?? {};
    const des = data.designacionSupervisor ?? {};
    const acta = data.actaInicio ?? {};
    const contrato = data.contrato ?? {};

    const nro = String(data.consecutivoContrato ?? "").trim() || `N.º ${solicitudId}`;
    const contratista = String(data.contratista ?? acta.contratista ?? "").trim();
    const objeto = String(data.objetoProyecto ?? "").trim();
    const inicio = String(acta.fechaInicio ?? contrato.inicio ?? "").trim();
    const fin = String(contrato.terminacion ?? acta.fechaFinal ?? "").trim();
    const supervisorNombre = String(
      des.supervisorNombre ?? acta.supervisorNombre ?? "",
    ).trim();

    const activos = await this.userRepo.find({
      where: { estado: true },
      relations: ["role"],
    });

    const objetivo = ROLES_ADMINISTRATIVA.map((r) => r.toLowerCase());
    const internos = activos.filter((u) =>
      objetivo.includes(u.role?.nombreRol?.toLowerCase() ?? ""),
    );

    const pendientes: string[] = [];
    const supervisor = supervisorNombre
      ? activos.find((u) => mismoNombre(supervisorNombre, u.nombre ?? ""))
      : undefined;
    if (supervisorNombre && !supervisor) {
      pendientes.push(`supervisor "${supervisorNombre}" sin usuario en el sistema`);
    }
    if (supervisor) internos.push(supervisor);

    const enviados: string[] = [];
    for (const u of internos) {
      const to = u.emailNotificacion || u.email;
      if (!to || enviados.includes(to.toLowerCase())) continue;
      enviados.push(to.toLowerCase());
      const esSupervisor = supervisor && u.userId === supervisor.userId;
      await this.notifications.sendEmail({
        to,
        subject: `Inicio de contrato ${nro}${contratista ? ` · ${contratista}` : ""}`,
        html: `
      <div style="font-family:Arial,sans-serif;color:#1f2937">
        <p>Hola ${u.nombre ?? ""},</p>
        <p>El contrato <b>${nro}</b>${contratista ? ` con <b>${contratista}</b>` : ""}
           inició${inicio ? ` el <b>${inicio}</b>` : ""}: el acta de inicio quedó firmada.</p>
        ${objeto ? `<p><b>Objeto:</b> ${objeto}</p>` : ""}
        ${fin ? `<p><b>Terminación pactada:</b> ${fin}</p>` : ""}
        ${supervisorNombre ? `<p><b>Supervisor:</b> ${supervisorNombre}</p>` : ""}
        ${esSupervisor
          ? "<p>Como supervisor designado, el seguimiento del contrato empieza desde esta fecha.</p>"
          : "<p>Desde aquí siguen, cuando apliquen, la solicitud de anticipo y su legalización.</p>"}
        <p style="color:#6b7280;font-size:12px">
          Aviso automático · Gestión del conocimiento · G. Jurídica
        </p>
      </div>`,
      });
    }

    // El contratista va aparte: es un correo externo y no debe llevar el detalle
    // interno del trámite.
    const correoContratista = String(
      contrato.contratistaCorreo ?? acta.correo ?? data.contratistaCorreo ?? "",
    ).trim();
    if (correoContratista && !enviados.includes(correoContratista.toLowerCase())) {
      enviados.push(correoContratista.toLowerCase());
      await this.notifications.sendEmail({
        to: correoContratista,
        subject: `Inicio del contrato ${nro}`,
        html: `
      <div style="font-family:Arial,sans-serif;color:#1f2937">
        <p>Cordial saludo${contratista ? ` , ${contratista}` : ""},</p>
        <p>Le informamos que el contrato <b>${nro}</b> suscrito con nuestra compañía
           inició${inicio ? ` el <b>${inicio}</b>` : ""}, con la firma del acta de inicio.</p>
        ${objeto ? `<p><b>Objeto:</b> ${objeto}</p>` : ""}
        ${fin ? `<p><b>Fecha de terminación pactada:</b> ${fin}</p>` : ""}
        ${supervisorNombre
          ? `<p>La supervisión del contrato está a cargo de <b>${supervisorNombre}</b>, con quien podrá coordinar la ejecución.</p>`
          : ""}
        <p style="color:#6b7280;font-size:12px">
          Canales y Contactos S.A.S · Este mensaje se generó automáticamente.
        </p>
      </div>`,
      });
    } else if (!correoContratista) {
      pendientes.push("el contratista no tiene correo registrado en el contrato");
    }

    // La constancia se agrega releyendo la solicitud: la transición ya la guardó y
    // este aviso corre después, así que escribir sobre la copia vieja la pisaría.
    const actual = await this.findOne(solicitudId);
    actual.historial = [
      ...(actual.historial ?? []),
      {
        estado: actual.estado,
        accion: ACCION_NOTIFICACION_INICIO,
        fecha: new Date().toISOString(),
        userId,
        userName: "Sistema",
        notificados: enviados,
        pendientes: pendientes.length > 0 ? pendientes : undefined,
        motivo: `Aviso de inicio del contrato ${nro}.`,
      },
    ];
    await this.solicitudRepo.save(actual);
  }

  // ============================================
  // Vencimiento de contratos (G. Jurídica)
  // ============================================

  /** Evita que dos revisiones se pisen si una se demora más de lo previsto. */
  private revisandoVencimientos = false;

  /**
   * Arranca la vigilancia diaria de vencimientos.
   *
   * Es un temporizador propio y no `@nestjs/schedule` a propósito: la única tarea
   * programada del sistema es ésta, y agregar la dependencia obliga a mover
   * `node_modules`, que en este repo va versionado. La primera pasada se retrasa un
   * minuto para no competir con el arranque de la aplicación.
   */
  onModuleInit(): void {
    const UN_DIA = 24 * 60 * 60 * 1000;
    setTimeout(() => {
      void this.revisarVencimientos();
      setInterval(() => void this.revisarVencimientos(), UN_DIA);
    }, 60_000);
  }

  /**
   * Revisa los contratos vigentes y avisa a la Dirección Administrativa de los que
   * vencen dentro de los próximos 15 días.
   *
   * Se avisa **una sola vez por fecha de terminación**: la alerta queda en el
   * historial de la solicitud y ésa es la que impide repetirla, así que da igual
   * cuántas veces corra la revisión. Si el contrato se prorroga y la terminación
   * cambia, es una fecha nueva y vuelve a avisar, que es justo lo que se espera.
   *
   * Un contrato que ya se venció sin que nadie avisara también se reporta: llegar
   * tarde es mejor que no llegar.
   */
  async revisarVencimientos(): Promise<{
    revisados: number;
    alertados: number;
    sinLeer: number;
  }> {
    if (this.revisandoVencimientos) {
      return { revisados: 0, alertados: 0, sinLeer: 0 };
    }
    this.revisandoVencimientos = true;
    try {
      const solicitudes = await this.solicitudRepo.find({
        where: { gestion: "juridica" },
      });
      let revisados = 0;
      let alertados = 0;
      let sinLeer = 0;

      for (const s of solicitudes) {
        const v = vencimientoDe(s.estado, s.data);
        if (!v) continue;
        revisados++;

        // La fecha está escrita pero no se entiende: no se adivina. Se cuenta
        // para poder decirlo en pantalla y que alguien la corrija.
        if (!v.fecha || v.dias === null) {
          sinLeer++;
          continue;
        }
        if (!v.enVentana) continue;

        const yaAvisado = (s.historial ?? []).some(
          (h) => h.accion === ACCION_ALERTA_VENCIMIENTO && h.vence === v.texto,
        );
        if (yaAvisado) continue;

        const destinatarios = await this.notificarVencimiento(s, v.texto, v.dias);
        s.historial = [
          ...(s.historial ?? []),
          {
            estado: s.estado,
            accion: ACCION_ALERTA_VENCIMIENTO,
            fecha: new Date().toISOString(),
            userId: null,
            userName: "Sistema",
            vence: v.texto,
            diasRestantes: v.dias,
            notificados: destinatarios,
            motivo:
              v.dias >= 0
                ? `El contrato vence en ${v.dias} día(s) (${v.texto}).`
                : `El contrato venció hace ${Math.abs(v.dias)} día(s) (${v.texto}).`,
          },
        ];
        await this.solicitudRepo.save(s);
        alertados++;
      }

      if (alertados > 0 || sinLeer > 0) {
        this.logger.log(
          `Vencimientos: ${revisados} contrato(s) vigente(s), ${alertados} alerta(s) enviada(s), ${sinLeer} con fecha ilegible.`,
        );
      }
      return { revisados, alertados, sinLeer };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`No se pudo revisar los vencimientos: ${msg}`);
      return { revisados: 0, alertados: 0, sinLeer: 0 };
    } finally {
      this.revisandoVencimientos = false;
    }
  }

  /** Avisa a la Dirección Administrativa. Devuelve a quiénes se les envió. */
  private async notificarVencimiento(
    solicitud: GcSolicitud,
    vence: string,
    dias: number,
  ): Promise<string[]> {
    const activos = await this.userRepo.find({
      where: { estado: true },
      relations: ["role"],
    });
    const objetivo = ROLES_ADMINISTRATIVA.map((r) => r.toLowerCase());
    const usuarios = activos.filter((u) =>
      objetivo.includes(u.role?.nombreRol?.toLowerCase() ?? ""),
    );

    const nro = solicitud.data?.consecutivoContrato || `N.º ${solicitud.solicitudId}`;
    const contratista = String(solicitud.data?.contratista ?? "").trim();
    const objeto = String(solicitud.data?.objetoProyecto ?? "").trim();
    const titulo =
      dias >= 0
        ? `vence en ${dias} día(s)`
        : `venció hace ${Math.abs(dias)} día(s)`;

    const enviados: string[] = [];
    for (const u of usuarios) {
      const to = u.emailNotificacion || u.email;
      if (!to || enviados.includes(to.toLowerCase())) continue;
      enviados.push(to.toLowerCase());
      await this.notifications.sendEmail({
        to,
        subject: `Contrato ${nro} · ${titulo} (${vence})`,
        html: `
      <div style="font-family:Arial,sans-serif;color:#1f2937">
        <p>Hola ${u.nombre ?? ""},</p>
        <p>El contrato <b>${nro}</b>${contratista ? ` con <b>${contratista}</b>` : ""}
           <b>${titulo}</b>: la terminación pactada es el <b>${vence}</b>.</p>
        ${objeto ? `<p><b>Objeto:</b> ${objeto}</p>` : ""}
        <p>Conviene definir si se prorroga, se liquida o se deja terminar.</p>
        <p style="color:#6b7280;font-size:12px">
          Aviso automático con ${DIAS_ALERTA_VENCIMIENTO} días de anticipación ·
          Gestión del conocimiento · G. Jurídica
        </p>
      </div>`,
      });
    }
    return enviados;
  }

  // ============================================
  // Flujo de la Solicitud de Anticipo (GF-005-F)
  // ============================================

  /**
   * Aplica una transición del flujo del anticipo. El paso "Aprueba Jefe" lo hace el
   * autorizador del creador (su jefe, como en Compras); los demás pasos van por rol.
   * En "Registrar pago" (Tesorería) se guardan los datos del pago (fecha, recibido por).
   */
  private async transitionAnticipo(
    solicitud: GcSolicitud,
    accion: string,
    userId: number,
    motivo?: string,
    payload?: Record<string, any>,
  ): Promise<GcSolicitud> {
    const t = ANTICIPO_TRANSICIONES[accion];
    if (!t) throw new BadRequestException(`Acción "${accion}" no válida`);

    if (solicitud.estado !== t.from) {
      throw new BadRequestException(
        `El anticipo está en "${solicitud.estado}" y no admite la acción "${accion}"`,
      );
    }

    const user = await this.userRepo.findOne({
      where: { userId },
      relations: ["role"],
    });
    const rol = user?.role?.nombreRol ?? "";
    const esPmo = esRolPmo(rol);

    // Autorización según el tipo de paso.
    let autorizado = esPmo;
    if (!autorizado) {
      if (t.jefeAutorizador) {
        // El "jefe" es el autorizador del creador (tabla de autorizaciones, como
        // Compras); si el creador es Director de Área, aprueba la Gerencia.
        autorizado = await this.puedeAprobarComoJefe(solicitud, userId, rol);
      } else if (t.soloCreador) {
        autorizado = solicitud.createdBy === userId;
      } else {
        autorizado = t.roles.includes(rol);
      }
    }
    if (!autorizado) {
      throw new ForbiddenException("No tienes permiso para ejecutar esta acción");
    }

    if (t.requiereMotivo && (!motivo || !motivo.trim())) {
      throw new BadRequestException("Debe indicar el motivo");
    }

    const ahora = new Date();
    const hoy = ahora.toISOString().slice(0, 10);
    const data: Record<string, any> = { ...(solicitud.data ?? {}) };

    // Regla (igual que en Compras, donde los roles de alto nivel saltan la revisión
    // y van directo a Gerencia): si quien solicita es un Director de Área, el
    // anticipo salta el paso del jefe y el de Gerencia de Proyectos, y va directo a
    // la aprobación de Gerencia (Dra. Gloria). Se registra la auto-aprobación del
    // jefe, como Compras registra `reviewedBy` = el propio creador.
    let destino: AnticipoEstado = t.to;
    if (accion === "enviar" && (await this.creadorEsDirectorArea(solicitud))) {
      destino = "pendiente_aprobacion_gerencia";
      data.firmaJefe = data.firmaJefe || user?.nombre || "";
      data.fechaFirmaJefe = hoy;
      data.jefeAutoAprobado = true;
    }

    const entrada = {
      estado: destino,
      accion,
      fecha: ahora.toISOString(),
      userId,
      userName: user?.nombre ?? null,
      motivo: motivo?.trim() || undefined,
    };
    solicitud.estado = destino;
    solicitud.estadoDesde = ahora;
    await this.asignarNumero(solicitud);
    solicitud.historial = [...(solicitud.historial ?? []), entrada];

    // Firmas automáticas del recuadro del formato y registro del pago. La fecha de cada
    // firma es SIEMPRE la de la acción (el día en que se aprobó): no la envía el cliente,
    // no se puede cambiar a mano y se estampa aquí sin `|| hoy`.
    if (accion === "enviar") {
      // El solicitante firma al enviar a aprobación.
      data.firmaSolicitante = data.firmaSolicitante || user?.nombre || "";
      data.fechaFirmaSolicitante = hoy;
    } else if (accion === "aprobar_jefe") {
      data.firmaJefe = user?.nombre ?? "";
      data.fechaFirmaJefe = hoy;
    } else if (accion === "aprobar_gp") {
      data.firmaGerenteProy = user?.nombre ?? "";
      data.fechaFirmaGerenteProy = hoy;
    } else if (accion === "aprobar_gerencia") {
      data.firmaGerenciaGral = user?.nombre ?? "";
      data.fechaFirmaGerenciaGral = hoy;
    } else if (accion === "registrar_pago") {
      // Tesorería (Aurora) registra el pago: quién recibe/paga y cuándo.
      data.entregaRecibidoPor =
        (payload?.entregaRecibidoPor as string) || data.entregaRecibidoPor || user?.nombre || "";
      data.fechaPagoRealizado =
        (payload?.fechaPagoRealizado as string) || data.fechaPagoRealizado || hoy;
      data.pagoRealizado = "si";
    }
    solicitud.data = data;

    const guardada = await this.solicitudRepo.save(solicitud);

    this.notificarAnticipo(guardada, destino, motivo).catch((e) =>
      this.logger.warn(`No se pudo notificar el anticipo: ${e.message}`),
    );

    return guardada;
  }

  /**
   * Flujo de la Legalización de anticipos (GCT-006-F):
   *   borrador → pendiente_aprobacion_jefe → pendiente_contabilidad → causada
   * El "jefe" es el autorizador del creador, igual que en el anticipo.
   */
  private async transitionLegalizacion(
    solicitud: GcSolicitud,
    accion: string,
    userId: number,
    motivo?: string,
    payload?: Record<string, any>,
  ): Promise<GcSolicitud> {
    const t = LEGALIZACION_TRANSICIONES[accion];
    if (!t) throw new BadRequestException(`Acción "${accion}" no válida`);

    if (solicitud.estado !== t.from) {
      throw new BadRequestException(
        `La legalización está en "${solicitud.estado}" y no admite la acción "${accion}"`,
      );
    }

    // No se legaliza un anticipo que aún no se ha pagado.
    if (accion === "enviar") {
      await this.validarAnticipoPagado(solicitud);
    }

    const user = await this.userRepo.findOne({
      where: { userId },
      relations: ["role"],
    });
    const rol = user?.role?.nombreRol ?? "";
    const esPmo = esRolPmo(rol);

    let autorizado = esPmo;
    if (!autorizado) {
      if (t.jefeAutorizador) {
        // Misma regla que el anticipo: si el creador es Director de Área, la
        // aprobación del "jefe" la da la Gerencia.
        autorizado = await this.puedeAprobarComoJefe(solicitud, userId, rol);
      } else if (t.soloCreador) {
        autorizado = solicitud.createdBy === userId;
      } else {
        autorizado = t.roles.includes(rol);
      }
    }
    if (!autorizado) {
      throw new ForbiddenException("No tienes permiso para ejecutar esta acción");
    }

    if (t.requiereMotivo && (!motivo || !motivo.trim())) {
      throw new BadRequestException("Debe indicar el motivo");
    }

    const ahora = new Date();
    const hoy = ahora.toISOString().slice(0, 10);
    const data: Record<string, any> = { ...(solicitud.data ?? {}) };

    // Misma regla que el anticipo (y que Compras): si quien legaliza es un Director
    // de Área, salta el paso del jefe y la legalización va directo a Contabilidad.
    let destino: LegalizacionEstado = t.to;
    if (accion === "enviar" && (await this.creadorEsDirectorArea(solicitud))) {
      destino = "pendiente_contabilidad";
      data.firmaReviso = data.firmaReviso || user?.nombre || "";
      data.fechaReviso = data.fechaReviso || hoy;
      data.recibosValidados = "si";
      data.jefeAutoAprobado = true;
    }

    const entrada = {
      estado: destino,
      accion,
      fecha: ahora.toISOString(),
      userId,
      userName: user?.nombre ?? null,
      motivo: motivo?.trim() || undefined,
    };
    solicitud.estado = destino;
    solicitud.estadoDesde = ahora;
    await this.asignarNumero(solicitud);
    solicitud.historial = [...(solicitud.historial ?? []), entrada];

    // Firmas automáticas del recuadro "REVISIÓN Y APROBACIÓN" del formato.
    if (accion === "enviar") {
      data.firmaElaboro = data.firmaElaboro || user?.nombre || "";
      data.fechaElaboro = data.fechaElaboro || hoy;
      // Aviso del corte de caja: se recibe dentro de los 5 primeros días del mes.
      data.fueraDeCorte = ahora.getDate() > LEGALIZACION_CORTE_DIA_MES;
    } else if (accion === "aprobar_jefe") {
      data.firmaReviso = user?.nombre ?? "";
      data.fechaReviso = data.fechaReviso || hoy;
      data.recibosValidados = "si";
    } else if (accion === "causar") {
      data.firmaCauso = user?.nombre ?? "";
      data.fechaCauso = data.fechaCauso || hoy;
      // Reclasificación del concepto entre anticipo y legalización (la registra
      // Contabilidad al causar).
      if (payload?.reclasificacionConcepto !== undefined) {
        data.reclasificacionConcepto = payload.reclasificacionConcepto;
      }
      if (payload?.reclasificacionObs !== undefined) {
        data.reclasificacionObs = payload.reclasificacionObs;
      }
      if (payload?.numConsignacion) data.numConsignacion = payload.numConsignacion;
    }
    solicitud.data = data;

    const guardada = await this.solicitudRepo.save(solicitud);

    this.notificarLegalizacion(guardada, destino, motivo).catch((e) =>
      this.logger.warn(`No se pudo notificar la legalización: ${e.message}`),
    );

    return guardada;
  }

  /**
   * Exige que el anticipo enlazado (por consecutivo) exista y esté `pagado`.
   * Si la legalización no trae consecutivo, no se puede enviar.
   */
  private async validarAnticipoPagado(solicitud: GcSolicitud): Promise<void> {
    const code = String(solicitud.data?.anticipoConsecutivo ?? "").trim();
    if (!code) {
      throw new BadRequestException(
        "La legalización debe estar enlazada a un anticipo (GF-005-F) por su consecutivo.",
      );
    }
    await this.verificarAnticipoPagado(code);
  }

  /**
   * Al guardar una legalización, si ya trae enlazado un anticipo, ese anticipo debe estar
   * pagado. Se valida acá —no solo al enviar— para que la regla no dependa del navegador:
   * ni siquiera se puede persistir el enlace a un anticipo que Tesorería no ha pagado.
   *
   * No obliga a que haya enlace (eso lo exige el paso "enviar"): un borrador sin anticipo
   * todavía puede guardarse; lo que no se admite es un enlace a un anticipo sin pagar.
   */
  private async validarAnticipoPagadoSiEnlazado(
    data: Record<string, any> | null | undefined,
  ): Promise<void> {
    const code = String(data?.anticipoConsecutivo ?? "").trim();
    if (!code) return;
    await this.verificarAnticipoPagado(code);
  }

  /** El anticipo del consecutivo dado existe y está pagado; si no, lanza. */
  private async verificarAnticipoPagado(code: string): Promise<void> {
    const norm = (s: any) =>
      String(s ?? "").replace(/\D/g, "").replace(/^0+/, "") || "0";
    const anticipos = await this.solicitudRepo.find({
      where: {
        gestion: "contable",
        formato: GestionConocimientoService.FORMATO_ANTICIPO_FLUJO,
      },
    });
    const anticipo = anticipos.find(
      (a) => norm(a.data?.consecutivo) === norm(code),
    );
    if (!anticipo) {
      throw new BadRequestException(`No existe el anticipo N.º ${code}.`);
    }
    if (anticipo.estado !== "pagado") {
      throw new BadRequestException(
        `El anticipo N.º ${code} aún no ha sido pagado (está en "${anticipo.estado}"). Solo se legaliza un anticipo pagado.`,
      );
    }
  }

  /** Notifica por correo al actor que sigue en el flujo de la legalización. */
  private async notificarLegalizacion(
    solicitud: GcSolicitud,
    estado: LegalizacionEstado,
    motivo?: string,
  ): Promise<void> {
    const destino = LEGALIZACION_NOTIFICAR_AL_LLEGAR[estado];
    let usuarios: User[] = [];

    if (destino === "creador") {
      if (solicitud.createdBy) {
        const creador = await this.userRepo.findOne({
          where: { userId: solicitud.createdBy },
        });
        if (creador) usuarios = [creador];
      }
    } else if (destino === "jefe") {
      usuarios = await this.destinatariosJefe(solicitud);
    } else {
      const activos = await this.userRepo.find({
        where: { estado: true },
        relations: ["role"],
      });
      const objetivo = destino.map((r) => r.toLowerCase());
      usuarios = activos.filter((u) =>
        objetivo.includes(u.role?.nombreRol?.toLowerCase() ?? ""),
      );
    }

    const label = LEGALIZACION_ESTADOS[estado].label;
    const nro = (solicitud.data?.anticipoConsecutivo || solicitud.solicitudId).toString();

    const enviados = new Set<string>();
    for (const u of usuarios) {
      const to = u.emailNotificacion || u.email;
      if (!to || enviados.has(to.toLowerCase())) continue;
      enviados.add(to.toLowerCase());
      await this.notifications.sendEmail({
        to,
        subject: `Legalización del anticipo N.º ${nro} · ${label}`,
        html: this.buildHtmlLegalizacion(u.nombre ?? "", nro, label, motivo),
      });
    }
  }

  private buildHtmlLegalizacion(
    nombre: string,
    nro: string,
    label: string,
    motivo?: string,
  ): string {
    return `
      <div style="font-family:Arial,sans-serif;color:#1f2937">
        <p>Hola ${nombre || ""},</p>
        <p>La legalización del anticipo <b>N.º ${nro}</b> (formato GCT-006-F) pasó al estado
           <b>${label}</b>.</p>
        ${motivo ? `<p><b>Motivo:</b> ${motivo}</p>` : ""}
        <p>Ingresa al sistema para continuar con el trámite.</p>
        <p style="color:#6b7280;font-size:12px">Sistema de Gestión · Gestión del conocimiento</p>
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // Flujo de Autorización de pago mediante cuentas entre compañías (GF-004-F5)
  // ---------------------------------------------------------------------------

  /**
   * Flujo del GF-004-F5: borrador → pendiente_conciliacion → conciliado.
   *
   * No hay pasos de aprobación: la autorización previa de las dos Gerencias Generales
   * se firma en papel (sección 2 del formato). El sistema custodia el documento y
   * exige el control posterior — la conciliación mensual de la sección 3, que
   * diligencia Contabilidad al cerrar y llega en el payload.
   */
  private async transitionCuentas(
    solicitud: GcSolicitud,
    accion: string,
    userId: number,
    motivo?: string,
    payload?: Record<string, any>,
  ): Promise<GcSolicitud> {
    const t = CUENTAS_TRANSICIONES[accion];
    if (!t) throw new BadRequestException(`Acción "${accion}" no válida`);

    if (solicitud.estado !== t.from) {
      throw new BadRequestException(
        `El formato está en "${solicitud.estado}" y no admite la acción "${accion}"`,
      );
    }

    const user = await this.userRepo.findOne({
      where: { userId },
      relations: ["role"],
    });
    const rol = user?.role?.nombreRol ?? "";

    let autorizado = esRolPmo(rol);
    if (!autorizado) {
      autorizado = t.soloCreador
        ? solicitud.createdBy === userId
        : t.roles.includes(rol);
    }
    if (!autorizado) {
      throw new ForbiddenException("No tienes permiso para ejecutar esta acción");
    }

    if (t.requiereMotivo && (!motivo || !motivo.trim())) {
      throw new BadRequestException("Debe indicar el motivo");
    }

    // Sin las dos compañías y el valor, el formato no dice nada: no se envía.
    if (accion === "enviar") {
      const d = solicitud.data ?? {};
      const falta = !String(d.companiaGasto ?? "").trim()
        || !String(d.companiaPaga ?? "").trim()
        || !String(d.valorOperacion ?? "").trim();
      if (falta) {
        throw new BadRequestException(
          "Indica la compañía que registró el gasto, la que efectúa el pago y el valor de la operación.",
        );
      }
    }

    const ahora = new Date();
    const hoy = ahora.toISOString().slice(0, 10);
    const data: Record<string, any> = { ...(solicitud.data ?? {}) };

    if (accion === "conciliar") {
      // Sección 3: control posterior. La firma la estampa el servidor.
      for (const k of ["mesConciliacion", "saldoCuenta", "fechaConciliacion"]) {
        if (payload?.[k] !== undefined) data[k] = payload[k];
      }
      data.conciliadoPor = user?.nombre ?? "";
      data.fechaConciliacion = data.fechaConciliacion || hoy;
    }

    const entrada = {
      estado: t.to,
      accion,
      fecha: ahora.toISOString(),
      userId,
      userName: user?.nombre ?? null,
      motivo: motivo?.trim() || undefined,
    };
    solicitud.estado = t.to;
    solicitud.estadoDesde = ahora;
    await this.asignarNumero(solicitud);
    solicitud.historial = [...(solicitud.historial ?? []), entrada];
    solicitud.data = data;

    const guardada = await this.solicitudRepo.save(solicitud);

    this.notificarCuentas(guardada, t.to, motivo).catch((e) =>
      this.logger.warn(`No se pudo notificar las cuentas entre compañías: ${e.message}`),
    );

    return guardada;
  }

  private async notificarCuentas(
    solicitud: GcSolicitud,
    estado: CuentasEstado,
    motivo?: string,
  ): Promise<void> {
    const destino = CUENTAS_NOTIFICAR_AL_LLEGAR[estado];
    let usuarios: User[] = [];

    if (destino === "creador") {
      if (solicitud.createdBy) {
        const creador = await this.userRepo.findOne({
          where: { userId: solicitud.createdBy },
        });
        if (creador) usuarios = [creador];
      }
    } else {
      const activos = await this.userRepo.find({
        where: { estado: true },
        relations: ["role"],
      });
      const objetivo = destino.map((r) => r.toLowerCase());
      usuarios = activos.filter((u) =>
        objetivo.includes(u.role?.nombreRol?.toLowerCase() ?? ""),
      );
    }

    const label = CUENTAS_ESTADOS[estado].label;
    const nro = String(solicitud.solicitudId);

    const enviados = new Set<string>();
    for (const u of usuarios) {
      const to = u.emailNotificacion || u.email;
      if (!to || enviados.has(to.toLowerCase())) continue;
      enviados.add(to.toLowerCase());
      await this.notifications.sendEmail({
        to,
        subject: `Cuentas entre compañías N.º ${nro} · ${label}`,
        html: `
      <div style="font-family:Arial,sans-serif;color:#1f2937">
        <p>Hola ${u.nombre ?? ""},</p>
        <p>La autorización de pago mediante cuentas entre compañías <b>N.º ${nro}</b>
           (formato GF-004-F5) pasó al estado <b>${label}</b>.</p>
        ${motivo ? `<p><b>Motivo:</b> ${motivo}</p>` : ""}
        <p>Ingresa al sistema para continuar con el trámite.</p>
        <p style="color:#6b7280;font-size:12px">Sistema de Gestión · Gestión del conocimiento</p>
      </div>`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Flujo del Reembolso de Caja Menor (GF-007-F)
  // ---------------------------------------------------------------------------

  /**
   * Recorre las tres firmas del pie del formato, lo causa Contabilidad y lo paga
   * Tesorería (rol Compras, igual que en el anticipo):
   * borrador → pendiente_director → pendiente_gerente → pendiente_contabilidad
   * → pendiente_pago → pagado.
   */
  private async transitionCajaMenor(
    solicitud: GcSolicitud,
    accion: string,
    userId: number,
    motivo?: string,
  ): Promise<GcSolicitud> {
    const t = CAJA_MENOR_TRANSICIONES[accion];
    if (!t) throw new BadRequestException(`Acción "${accion}" no válida`);

    if (solicitud.estado !== t.from) {
      throw new BadRequestException(
        `El reembolso está en "${solicitud.estado}" y no admite la acción "${accion}"`,
      );
    }

    const user = await this.userRepo.findOne({
      where: { userId },
      relations: ["role"],
    });
    const rol = user?.role?.nombreRol ?? "";

    let autorizado = esRolPmo(rol);
    if (!autorizado) {
      autorizado = t.soloCreador
        ? solicitud.createdBy === userId
        : t.roles.includes(rol);
    }
    if (!autorizado) {
      throw new ForbiddenException("No tienes permiso para ejecutar esta acción");
    }

    if (t.requiereMotivo && (!motivo || !motivo.trim())) {
      throw new BadRequestException("Debe indicar el motivo");
    }

    if (accion === "enviar") {
      const d = solicitud.data ?? {};
      if (!String(d.proyecto ?? "").trim() || !String(d.responsable ?? "").trim()) {
        throw new BadRequestException(
          "Indica el proyecto y el responsable de la caja menor.",
        );
      }
      // Lo único que se exige es que haya algo que reembolsar. El saldo en efectivo
      // puede quedar negativo —se gastó por encima del monto fijo, que ocurre— y eso
      // no frena el trámite: es un dato del reembolso, no una regla.
      if (arqueoDeCajaMenor(d).facturas <= 0) {
        throw new BadRequestException(
          "El reembolso no tiene facturas ni recibos: agrega al menos un registro con valor.",
        );
      }
    }

    const ahora = new Date();
    const entrada = {
      estado: t.to,
      accion,
      fecha: ahora.toISOString(),
      userId,
      userName: user?.nombre ?? null,
      motivo: motivo?.trim() || undefined,
    };

    const data: Record<string, any> = { ...(solicitud.data ?? {}) };
    // Cada firma queda estampada con quién y cuándo, para que el impreso muestre las
    // mismas personas que aprobaron en el sistema y no un nombre escrito a mano.
    const CAMPO_FIRMA: Record<string, string> = {
      aprobar_director: "firmaDirector",
      aprobar_gerente: "firmaGerente",
      causar: "firmaContabilidad",
      registrar_pago: "firmaPago",
    };
    const campo = CAMPO_FIRMA[accion];
    if (campo) {
      data[`${campo}Nombre`] = user?.nombre ?? "";
      data[`${campo}Fecha`] = ahora.toISOString().slice(0, 10);
    }

    solicitud.estado = t.to;
    solicitud.estadoDesde = ahora;
    await this.asignarNumero(solicitud);
    solicitud.historial = [...(solicitud.historial ?? []), entrada];
    solicitud.data = data;

    const guardada = await this.solicitudRepo.save(solicitud);

    this.notificarCajaMenor(guardada, t.to, motivo).catch((e) =>
      this.logger.warn(`No se pudo notificar el reembolso de caja menor: ${e.message}`),
    );

    return guardada;
  }

  private async notificarCajaMenor(
    solicitud: GcSolicitud,
    estado: CajaMenorEstado,
    motivo?: string,
  ): Promise<void> {
    const destino = CAJA_MENOR_NOTIFICAR_AL_LLEGAR[estado];
    let usuarios: User[] = [];

    if (destino === "creador") {
      if (solicitud.createdBy) {
        const creador = await this.userRepo.findOne({
          where: { userId: solicitud.createdBy },
        });
        if (creador) usuarios = [creador];
      }
    } else {
      const activos = await this.userRepo.find({
        where: { estado: true },
        relations: ["role"],
      });
      const objetivo = destino.map((r) => r.toLowerCase());
      usuarios = activos.filter((u) =>
        objetivo.includes(u.role?.nombreRol?.toLowerCase() ?? ""),
      );
    }

    const label = CAJA_MENOR_ESTADOS[estado].label;
    const nro = solicitud.numero
      ? String(solicitud.numero).padStart(4, "0")
      : String(solicitud.solicitudId);
    const proyecto = String(solicitud.data?.proyecto ?? "").trim();

    const enviados = new Set<string>();
    for (const u of usuarios) {
      const to = u.emailNotificacion || u.email;
      if (!to || enviados.has(to.toLowerCase())) continue;
      enviados.add(to.toLowerCase());
      await this.notifications.sendEmail({
        to,
        subject: `Reembolso de caja menor N.º ${nro} · ${label}`,
        html: `
      <div style="font-family:Arial,sans-serif;color:#1f2937">
        <p>Hola ${u.nombre ?? ""},</p>
        <p>El reembolso de caja menor <b>N.º ${nro}</b>${proyecto ? ` del proyecto <b>${proyecto}</b>` : ""}
           (formato GF-007-F) pasó al estado <b>${label}</b>.</p>
        ${motivo ? `<p><b>Motivo:</b> ${motivo}</p>` : ""}
        <p>Ingresa al sistema para continuar con el trámite.</p>
        <p style="color:#6b7280;font-size:12px">Sistema de Gestión · Gestión del conocimiento</p>
      </div>`,
      });
    }
  }

  // ============================================
  // Flujo de la Solicitud de Préstamo (GTH-007-F)
  // ============================================

  /**
   * Aplica una transición del flujo del préstamo. Todos los pasos van por rol: el
   * empleado envía, Dirección Administrativa firma y Gerencia aprueba.
   *
   * Cada paso estampa la firma que le corresponde en el formato —el servidor pone el
   * nombre y la fecha, no un campo que se pueda escribir a mano— y la aprobación de
   * Gerencia guarda además el valor aprobado del bloque 3, que llega en el payload.
   */
  /**
   * Anula uno de los cuatro formatos de Talento Humano, o resuelve la solicitud de
   * anulación de otro.
   *
   * Vive aparte de las cuatro máquinas de estados porque no es un paso de ninguna: se
   * puede tomar desde cualquier estado, incluido el aprobado.
   *
   * @see anulacion-workflow — el reparto de quién anula y quién solicita.
   */
  private async transitionAnulacion(
    solicitud: GcSolicitud,
    accion: string,
    userId: number,
    motivo?: string,
  ): Promise<GcSolicitud> {
    if (solicitud.estado === "anulado") {
      throw new BadRequestException("La solicitud ya está anulada.");
    }
    // El motivo no es opcional en ninguna de las tres acciones: una anulación sin razón
    // escrita deja un documento muerto que nadie sabe explicar seis meses después.
    if (!motivo || !motivo.trim()) {
      throw new BadRequestException("Debe indicar el motivo");
    }

    const user = await this.userRepo.findOne({
      where: { userId },
      relations: ["role"],
    });
    const rol = user?.role?.nombreRol ?? "";
    const resuelve = esRolPmo(rol) || ROLES_ANULAN.includes(rol);

    const ahora = new Date();
    const hoy = ahora.toISOString().slice(0, 10);
    const data: Record<string, any> = { ...(solicitud.data ?? {}) };
    let destino: string;

    if (accion === "solicitar_anulacion") {
      if (solicitud.estado === "pendiente_anulacion") {
        throw new BadRequestException("Ya hay una anulación pendiente de resolver.");
      }
      // La pide quien la hizo o su jefe. Talento Humano no necesita pedirla —anula
      // directo—, pero se le deja el camino por si prefiere dejar constancia del pedido.
      const esCreador = solicitud.createdBy === userId;
      const esJefe = await this.esAutorizadorDe(userId, solicitud.createdBy);
      if (!resuelve && !esCreador && !esJefe) {
        throw new ForbiddenException(
          "Solo quien hizo la solicitud, su jefe o Talento Humano pueden pedir la anulación",
        );
      }
      data[CAMPO_ESTADO_PREVIO] = solicitud.estado;
      data[CAMPO_ANULACION.solicitadaPor] = user?.nombre ?? "";
      data[CAMPO_ANULACION.solicitadaFecha] = hoy;
      data[CAMPO_ANULACION.motivo] = motivo.trim();
      destino = "pendiente_anulacion";
    } else if (accion === "anular") {
      if (!resuelve) {
        throw new ForbiddenException("Solo Talento Humano o el PMO pueden anular");
      }
      if (solicitud.estado !== "pendiente_anulacion") {
        data[CAMPO_ESTADO_PREVIO] = solicitud.estado;
      }
      data[CAMPO_ANULACION.anuladaPor] = user?.nombre ?? "";
      data[CAMPO_ANULACION.anuladaFecha] = hoy;
      data[CAMPO_ANULACION.motivo] = motivo.trim();

      // Se deshace lo que el formato dejó en nómina ANTES de marcarlo anulado. Si esto
      // falla, la solicitud sigue viva y su registro también: dos cosas que concuerdan.
      // Al revés quedaría anulada con la nómina todavía pagándola, que es justo el
      // error que esta función existe para evitar.
      const borrados = await this.talentoHumano.borrarDerivadosDeSolicitud(
        solicitud.solicitudId,
        solicitud.formato,
      );
      if (borrados > 0) data.anulacionRegistrosBorrados = borrados;
      destino = "anulado";
    } else {
      if (!resuelve) {
        throw new ForbiddenException(
          "Solo Talento Humano o el PMO pueden resolver la anulación",
        );
      }
      if (solicitud.estado !== "pendiente_anulacion") {
        throw new BadRequestException("No hay una anulación pendiente que rechazar.");
      }
      // Vuelve exactamente a donde estaba, no al borrador: la solicitud no tuvo ningún
      // problema, solo se pidió anularla y se negó. Mandarla al borrador la obligaría a
      // recorrer otra vez unos avales que siguen siendo válidos.
      destino = String(data[CAMPO_ESTADO_PREVIO] ?? "borrador");
      data[CAMPO_ESTADO_PREVIO] = "";
      data[CAMPO_ANULACION.solicitadaPor] = "";
      data[CAMPO_ANULACION.solicitadaFecha] = "";
    }

    solicitud.estado = destino;
    solicitud.estadoDesde = ahora;
    solicitud.historial = [
      ...(solicitud.historial ?? []),
      {
        estado: destino,
        accion,
        fecha: ahora.toISOString(),
        userId,
        userName: user?.nombre ?? null,
        motivo: motivo.trim(),
      },
    ];
    solicitud.data = data;

    const guardada = await this.solicitudRepo.save(solicitud);

    this.notificarAnulacion(guardada, accion, motivo.trim()).catch((e) =>
      this.logger.warn(`No se pudo notificar la anulación: ${e.message}`),
    );

    return guardada;
  }

  /**
   * Avisa de la anulación. Al pedirla se le escribe a Talento Humano, que es quien la
   * resuelve; al anularla o rechazarla, a quien hizo la solicitud, que es el que se
   * queda esperando.
   */
  private async notificarAnulacion(
    solicitud: GcSolicitud,
    accion: string,
    motivo: string,
  ): Promise<void> {
    const destinatarios: User[] =
      accion === "solicitar_anulacion"
        ? await this.usuariosPorRol([...ROLES_ANULAN])
        : solicitud.createdBy
          ? await this.userRepo.find({ where: { userId: solicitud.createdBy } })
          : [];

    const titulo =
      accion === "solicitar_anulacion"
        ? "Solicitud de anulación"
        : accion === "anular"
          ? "Solicitud anulada"
          : "Anulación rechazada";

    const enviados = new Set<string>();
    for (const u of destinatarios) {
      const to = u.emailNotificacion || u.email;
      if (!to || enviados.has(to.toLowerCase())) continue;
      enviados.add(to.toLowerCase());
      await this.notifications.sendEmail({
        to,
        subject: `${solicitud.formato} N.º ${solicitud.numero ?? solicitud.solicitudId} · ${titulo}`,
        html: `<p>${titulo} del formato <b>${solicitud.formato}</b> N.º ${
          solicitud.numero ?? solicitud.solicitudId
        }.</p><p><b>Motivo:</b> ${motivo}</p>`,
      });
    }
  }

  private async transitionPrestamo(
    solicitud: GcSolicitud,
    accion: string,
    userId: number,
    motivo?: string,
    payload?: Record<string, any>,
  ): Promise<GcSolicitud> {
    const t = PRESTAMO_TRANSICIONES[accion];
    if (!t) throw new BadRequestException(`Acción "${accion}" no válida`);

    if (solicitud.estado !== t.from) {
      throw new BadRequestException(
        `La solicitud está en "${solicitud.estado}" y no admite la acción "${accion}"`,
      );
    }

    const user = await this.userRepo.findOne({
      where: { userId },
      relations: ["role"],
    });
    const rol = user?.role?.nombreRol ?? "";

    let autorizado = esRolPmo(rol);
    if (!autorizado) {
      autorizado = t.soloCreador
        ? solicitud.createdBy === userId
        : t.roles.includes(rol);
    }
    if (!autorizado) {
      throw new ForbiddenException("No tienes permiso para ejecutar esta acción");
    }

    if (t.requiereMotivo && (!motivo || !motivo.trim())) {
      throw new BadRequestException("Debe indicar el motivo");
    }

    const ahora = new Date();
    const hoy = ahora.toISOString().slice(0, 10);
    const data: Record<string, any> = { ...(solicitud.data ?? {}) };

    // Sin nombre, cédula y valor el formato no dice a quién ni cuánto: no se envía.
    // El formato se envía completo. La comprobación nombra de una vez todo lo que falta
    // —no la primera casilla vacía—, y lo mismo en los pasos de Gerencia y Dirección
    // Administrativa, que llenan sus propios recuadros.
    exigirCamposObligatorios(solicitud.formato, accion, data);

    if (accion === "enviar") {
      const nombre = [data.primerNombre, data.segundoNombre, data.primerApellido, data.segundoApellido]
        .map((s: unknown) => String(s ?? "").trim())
        .filter(Boolean)
        .join(" ");
      data.nombreCompleto = nombre;
      data.firmaEmpleado = nombre;
      data.fechaFirmaEmpleado = data.fechaFirmaEmpleado || hoy;
    } else if (accion === "aprobar_administrativa") {
      // Las condiciones del préstamo las fija Dirección Administrativa al firmar: son
      // suyas, no del empleado, y por eso llegan con la acción y no con el «Guardar»
      // del formulario, que fuera del borrador ya está cerrado.
      for (const k of ["fechaDesembolso", "numeroCuotas", "valorCuota"]) {
        if (payload?.[k] !== undefined) data[k] = payload[k];
      }
      data.firmaAdministrativa = user?.nombre ?? "";
      data.fechaFirmaAdministrativa = data.fechaFirmaAdministrativa || hoy;

      /*
       * Con esta firma se cierra el recorrido, y es aquí donde el préstamo nace en la
       * cartera real.
       *
       * No al autorizar Gerencia, aunque sea quien decide el valor: en ese momento no
       * existen todavía la fecha de desembolso, el número de cuotas ni la cuota, que
       * son de este paso. Creado antes, el préstamo entraba a la cartera en blanco y
       * la cuota había que digitarla otra vez a mano.
       *
       * Va antes de guardar la solicitud para no dejarla marcada «aprobado» sin que el
       * préstamo exista de verdad si esto falla.
       */
      await this.talentoHumano.createPrestamo({
        // Deja amarrado el formato que lo originó, para poder deshacerlo si se anula.
        solicitudId: solicitud.solicitudId,
        nombre: data.nombreCompleto || "",
        identificacion: data.numero || null,
        mesInicio: data.fechaDesembolso || null,
        numeroCuotas: data.numeroCuotas ? Number(data.numeroCuotas) : null,
        valorPrestamo: data.valorAprobado || null,
        valorCuota: data.valorCuota || null,
        valorCancelado: "0",
        saldo: data.valorAprobado || null,
        observaciones: `Generado al aprobar la solicitud GTH-007-F N.º ${solicitud.solicitudId}.`,
      });
    } else if (accion === "aprobar_gerencia") {
      // El valor aprobado es de Gerencia: puede ser menor que el solicitado. Si no lo
      // manda, se toma el solicitado, que es lo que dice el papel cuando se aprueba tal cual.
      data.valorAprobado =
        (payload?.valorAprobado as string) || data.valorAprobado || data.valorSolicitado || "";
      data.firmaGerencia = user?.nombre ?? "";
      data.fechaFirmaGerencia = data.fechaFirmaGerencia || hoy;
    }

    // Al devolver al borrador se borran las firmas y las condiciones pactadas: el
    // recorrido vuelve a empezar y dejarlas diría que alguien firmó algo que ya no
    // existe, o que hay un desembolso acordado sobre un préstamo que nadie aprobó.
    if (t.to === "borrador") {
      data.firmaAdministrativa = "";
      data.fechaFirmaAdministrativa = "";
      data.firmaGerencia = "";
      data.fechaFirmaGerencia = "";
      data.valorAprobado = "";
      data.fechaDesembolso = "";
      data.numeroCuotas = "";
      data.valorCuota = "";
    }

    const entrada = {
      estado: t.to,
      accion,
      fecha: ahora.toISOString(),
      userId,
      userName: user?.nombre ?? null,
      motivo: motivo?.trim() || undefined,
    };
    solicitud.estado = t.to;
    solicitud.estadoDesde = ahora;
    await this.asignarNumero(solicitud);
    solicitud.historial = [...(solicitud.historial ?? []), entrada];
    solicitud.data = data;

    const guardada = await this.solicitudRepo.save(solicitud);

    this.notificarPrestamo(guardada, t.to, motivo).catch((e) =>
      this.logger.warn(`No se pudo notificar el préstamo: ${e.message}`),
    );

    return guardada;
  }

  /** Los usuarios activos que tienen alguno de estos roles. */
  private async usuariosPorRol(roles: string[]): Promise<User[]> {
    if (roles.length === 0) return [];
    const activos = await this.userRepo.find({
      where: { estado: true },
      relations: ["role"],
    });
    const objetivo = roles.map((r) => r.toLowerCase());
    return activos.filter((u) =>
      objetivo.includes(u.role?.nombreRol?.toLowerCase() ?? ""),
    );
  }

  /**
   * Avisa por correo del movimiento del préstamo.
   *
   * Salen dos correos distintos: el de **quien debe actuar**, que lo manda a entrar a
   * continuar el trámite, y el de **quien solo se entera** —Gerencia cuando la solicitud
   * apenas sale del empleado—, que dice explícitamente que todavía no tiene que hacer
   * nada. Mandarle a alguien el primero cuando aún no le toca es enviarlo a una pantalla
   * donde no hay botón.
   *
   * Quien ya está en la lista de los que deben actuar no recibe además la copia.
   */
  private async notificarPrestamo(
    solicitud: GcSolicitud,
    estado: PrestamoEstado,
    motivo?: string,
  ): Promise<void> {
    const destino = PRESTAMO_NOTIFICAR_AL_LLEGAR[estado];
    let deben: User[] = [];

    if (destino === "creador") {
      if (solicitud.createdBy) {
        const creador = await this.userRepo.findOne({
          where: { userId: solicitud.createdBy },
        });
        if (creador) deben = [creador];
      }
    } else {
      deben = await this.usuariosPorRol(destino);
    }
    const seEnteran = await this.usuariosPorRol(PRESTAMO_ENTERAR_AL_LLEGAR[estado]);

    const label = PRESTAMO_ESTADOS[estado].label;
    const nro = String(solicitud.solicitudId);
    const empleado = String(solicitud.data?.nombreCompleto ?? "").trim();
    const valor = String(solicitud.data?.valorSolicitado ?? "").trim();
    const pie =
      '<p style="color:#6b7280;font-size:12px">Sistema de Gestión · Gestión del conocimiento</p>';
    const encabezado = `La solicitud de préstamo <b>N.º ${nro}</b> (formato GTH-007-F)${
      empleado ? ` de <b>${empleado}</b>` : ""
    }`;

    const enviados = new Set<string>();
    const enviar = async (u: User, subject: string, cuerpo: string) => {
      const to = u.emailNotificacion || u.email;
      if (!to || enviados.has(to.toLowerCase())) return;
      enviados.add(to.toLowerCase());
      await this.notifications.sendEmail({
        to,
        subject,
        html: `
      <div style="font-family:Arial,sans-serif;color:#1f2937">
        <p>Hola ${u.nombre ?? ""},</p>
        ${cuerpo}
        ${motivo ? `<p><b>Motivo:</b> ${motivo}</p>` : ""}
        ${pie}
      </div>`,
      });
    };

    // Primero los que deben actuar: así, si alguien está en las dos listas, le llega el
    // correo que le pide hacer algo y no el informativo.
    for (const u of deben) {
      await enviar(
        u,
        `Solicitud de préstamo N.º ${nro} · ${label}`,
        `<p>${encabezado} pasó al estado <b>${label}</b>.</p>
         <p>Ingresa al sistema para continuar con el trámite.</p>`,
      );
    }

    for (const u of seEnteran) {
      await enviar(
        u,
        `Para tu información · Solicitud de préstamo N.º ${nro}`,
        `<p>${encabezado}${valor ? ` por <b>${valor}</b>` : ""} entró al trámite y está en
         <b>${label}</b>.</p>
         <p>Es solo para que la tengas presente: <b>todavía no hay nada que aprobar</b>.
         Cuando Dirección Administrativa firme, te llega el aviso para decidir.</p>`,
      );
    }
  }

  // ============================================
  // Flujo de la Solicitud de Permiso (GTH-009-F)
  // ============================================

  /**
   * Aplica una transición del flujo del permiso.
   *
   * Aprobar y negar los hace **el jefe del solicitante**, resuelto con la tabla de
   * autorizaciones: al Analista PMO lo aprueba el Director PMO, al Analista Comercial
   * la Directora Comercial, y así por área. No hay una lista de roles aprobadores
   * porque la jerarquía ya está en la base y duplicarla aquí la haría envejecer.
   *
   * El cuadro «Aprobación interna» del formato lo diligencia el jefe, y solo mientras
   * la solicitud está en su bandeja: llega en el payload junto con la decisión, no por
   * el «Guardar» del formulario, que es del solicitante. Además se marca sola la fila
   * de la dirección de quien aprueba, cuando su rol tiene fila en el papel.
   */
  /**
   * Crea el ausentismo real del permiso concedido.
   *
   * Se llama desde los dos caminos que conceden un permiso: la aprobación del jefe
   * y la revisión de la Dirección Administrativa cuando ella misma es el jefe del
   * solicitante. Estaba escrito dentro del primero, y dejarlo ahí habría hecho que
   * por el segundo camino el permiso quedara aprobado sin entrar nunca a nómina.
   */
  private async crearAusentismoDePermiso(
    solicitud: GcSolicitud,
    data: Record<string, any>,
  ): Promise<void> {
    // El jefe acaba de conceder el permiso: nace en el registro real de
    // ausentismos. Va antes de guardar la solicitud para no dejarla marcada
    // "aprobado" sin que el ausentismo exista de verdad si esto falla.
    // Campos del formato v2, con respaldo a las claves viejas para permisos
    // creados antes del rediseño (fechaPermiso/motivo/horario/tipoPermiso).
    const desde = data.desde || data.fechaPermiso || null;
    const hasta = data.hasta || data.desde || data.fechaPermiso || null;
    const descripcion = data.descripcionMotivo || data.motivo || "";
    const horario =
      data.horaDesde || data.horaHasta
        ? [data.horaDesde, data.horaHasta].filter(Boolean).join(" a ")
        : data.horario || "";
    const remuneracionEtiqueta =
      data.remuneracion === "no-remunerado"
        ? "Permiso no remunerado"
        : data.remuneracion === "remunerado"
          ? "Permiso remunerado"
          : null;

    // Días y horas del permiso, para que la nómina pueda descontarlos (solo los no
    // remunerados). Si va de varios días, se guardan días completos; si es dentro de
    // un día con hora de inicio y fin, las horas —la nómina las pasa a fracción de día
    // con la jornada de ese día—.
    let diasPermiso: number | null = null;
    let horasAusencia: number | null = null;
    if (desde && hasta && desde !== hasta) {
      const d0 = new Date(`${desde}T00:00:00Z`).getTime();
      const d1 = new Date(`${hasta}T00:00:00Z`).getTime();
      const dias = Math.round((d1 - d0) / 86_400_000) + 1;
      if (dias > 0) diasPermiso = dias;
    } else if (data.horaDesde && data.horaHasta) {
      const aMin = (t: string) => {
        const [h, m] = String(t).split(":").map(Number);
        return (h || 0) * 60 + (m || 0);
      };
      const mins = aMin(data.horaHasta) - aMin(data.horaDesde);
      if (mins > 0) horasAusencia = Math.round((mins / 60) * 100) / 100;
    }

    await this.talentoHumano.createAusentismo({
      // Deja amarrado el formato que lo originó, para poder deshacerlo si se anula.
      solicitudId: solicitud.solicitudId,
      identificacion: data.identificacion,
      nombre: data.nombre || "",
      cargo: data.cargo || null,
      fechaInicio: desde,
      fechaFin: hasta,
      diasPermiso,
      horasAusencia: horasAusencia != null ? String(horasAusencia) : null,
      motivo: data.tipoPermiso || remuneracionEtiqueta || "Permiso",
      observaciones: [
        descripcion ? `Motivo: ${descripcion}` : null,
        horario ? `Horario: ${horario}` : null,
        data.anexaSoporte === "si" && data.tipoSoporte ? `Soporte: ${data.tipoSoporte}` : null,
        `Generado al aprobar la solicitud GTH-009-F N.º ${solicitud.solicitudId}.`,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }
  private async transitionPermiso(
    solicitud: GcSolicitud,
    accion: string,
    userId: number,
    motivo?: string,
    payload?: Record<string, any>,
  ): Promise<GcSolicitud> {
    const t = PERMISO_TRANSICIONES[accion];
    if (!t) throw new BadRequestException(`Acción "${accion}" no válida`);

    if (solicitud.estado !== t.from) {
      throw new BadRequestException(
        `El permiso está en "${solicitud.estado}" y no admite la acción "${accion}"`,
      );
    }

    const user = await this.userRepo.findOne({
      where: { userId },
      relations: ["role"],
    });
    const rol = user?.role?.nombreRol ?? "";
    const esPmo = esRolPmo(rol);

    let autorizado = esPmo;
    if (!autorizado) {
      if (t.jefeAutorizador) {
        autorizado = await this.puedeAprobarComoJefe(solicitud, userId, rol);
      } else if (t.soloCreador) {
        autorizado = solicitud.createdBy === userId;
      } else {
        autorizado = t.roles.includes(rol);
      }
    }
    if (!autorizado) {
      throw new ForbiddenException("No tienes permiso para ejecutar esta acción");
    }

    if (t.requiereMotivo && (!motivo || !motivo.trim())) {
      throw new BadRequestException("Debe indicar el motivo");
    }

    const ahora = new Date();
    const hoy = ahora.toISOString().slice(0, 10);
    const data: Record<string, any> = { ...(solicitud.data ?? {}) };

    /*
     * A dónde va el permiso. Normalmente al `to` de la transición, con una excepción:
     * cuando quien revisa —la Dirección Administrativa y Financiera— es además el jefe
     * inmediato del solicitante, los dos pasos son la misma persona y se unen en uno.
     * Mandárselo a sí misma para que se apruebe sería pedirle dos clics para la misma
     * decisión.
     */
    let destino: PermisoEstado = t.to;
    let concede = accion === "aprobar_jefe";
    if (accion === "revisar_administrativa") {
      data.revisadoPor = user?.nombre ?? "";
      data.fechaRevision = String(data.fechaRevision ?? "").trim() || hoy;
      if (await this.esAutorizadorDe(userId, solicitud.createdBy)) {
        destino = "aprobado";
        concede = true;
        data.fechaAprobacion = String(data.fechaAprobacion ?? "").trim() || hoy;
        data.aprobadoPor = user?.nombre ?? "";
      }
    }

    // Sin nombre, identificación y fecha del permiso, el papel no dice quién falta ni
    // cuándo. La identificación no está en el modelo impreso, pero sin ella el permiso
    // aprobado no se puede registrar en la base real de ausentismos (th_ausentismos),
    // que la exige.
    if (accion === "enviar") {
      // `desde` es del formato v2; `fechaPermiso` es la clave vieja, que se sigue
      // aceptando para no bloquear permisos que nacieron con el formato anterior.
      // Los permisos que nacieron con el formato anterior traen la fecha en
      // `fechaPermiso`; se acepta como equivalente de «Desde» para no trabarlos.
      if (!String(data.desde ?? "").trim() && String(data.fechaPermiso ?? "").trim()) {
        data.desde = data.fechaPermiso;
      }
      exigirCamposObligatorios(solicitud.formato, accion, data);
      data.nombreSolicitante = String(data.nombreSolicitante ?? "").trim() || data.nombre;
      data.fechaSolicitud = String(data.fechaSolicitud ?? "").trim() || hoy;
    }

    if (t.jefeAutorizador) {
      // Lo que el jefe marcó en el cuadro de aprobación interna.
      const marcadas = (payload?.aprobaciones ?? {}) as Record<string, string>;
      const previas = (data.aprobaciones ?? {}) as Record<string, string>;
      const aprobaciones: Record<string, string> = { ...previas, ...marcadas };

      // Las filas de quien decide se marcan solas, si su rol tiene fila en el papel.
      const filas = FILAS_APROBACION_POR_ROL[user?.role?.rolId ?? -1] ?? [];
      const marca = accion === "aprobar_jefe" ? "si" : "no";
      for (const fila of filas) aprobaciones[fila] = marca;

      data.aprobaciones = aprobaciones;
      if (payload?.observaciones !== undefined) data.observaciones = payload.observaciones;
      if (accion === "aprobar_jefe") {
        data.fechaAprobacion = String(data.fechaAprobacion ?? "").trim() || hoy;
        data.aprobadoPor = user?.nombre ?? "";

        // Nace en el registro real de ausentismos. Va antes de guardar la solicitud
        // para no dejarla marcada "aprobado" sin que el ausentismo exista de verdad.
        await this.crearAusentismoDePermiso(solicitud, data);
      }
    }

    // El atajo de arriba concede el permiso sin pasar por `aprobar_jefe`, así que el
    // ausentismo se crea también aquí. Sin esto el permiso quedaría aprobado en el papel
    // y la nómina no se enteraría nunca.
    if (concede && accion === "revisar_administrativa") {
      await this.crearAusentismoDePermiso(solicitud, data);
    }

    // Al negarlo vuelve al borrador: se limpia lo que el jefe había marcado para que un
    // reenvío no arrastre la decisión anterior. El motivo queda en la bitácora.
    if (destino === "borrador") {
      data.aprobaciones = {};
      data.fechaAprobacion = "";
      data.aprobadoPor = "";
      data.revisadoPor = "";
      data.fechaRevision = "";
    }

    const entrada = {
      estado: destino,
      accion,
      fecha: ahora.toISOString(),
      userId,
      userName: user?.nombre ?? null,
      motivo: motivo?.trim() || undefined,
    };
    solicitud.estado = destino;
    solicitud.estadoDesde = ahora;
    await this.asignarNumero(solicitud);
    solicitud.historial = [...(solicitud.historial ?? []), entrada];
    solicitud.data = data;

    const guardada = await this.solicitudRepo.save(solicitud);

    this.notificarPermiso(guardada, destino, motivo).catch((e) =>
      this.logger.warn(`No se pudo notificar el permiso: ${e.message}`),
    );

    return guardada;
  }

  /**
   * Notifica el permiso a quien sigue: al jefe cuando entra a su bandeja, al
   * solicitante cuando se resuelve.
   *
   * Al jefe se le avisa a **todos** sus autorizadores menos la Gerencia, que autoriza a
   * toda la empresa y recibiría el permiso de cada persona. Si el solicitante no tiene
   * ningún otro autorizador —hoy Gerencia y Contabilidad—, ahí sí va a la Gerencia,
   * porque si no el permiso quedaría sin nadie a quien avisarle.
   */
  private async notificarPermiso(
    solicitud: GcSolicitud,
    estado: PermisoEstado,
    motivo?: string,
  ): Promise<void> {
    let usuarios: User[] = [];

    if (estado === "pendiente_administrativa") {
      // El paso nuevo va a un rol fijo, no al autorizador del solicitante: lo revisa la
      // Dirección Administrativa y Financiera sea quien sea el jefe de quien lo pide.
      usuarios = await this.usuariosPorRol([ROL_ADMINISTRATIVA_PERMISO]);
    } else if (estado === "pendiente_jefe") {
      usuarios = await this.jefesDelCreador(solicitud);
    } else if (solicitud.createdBy) {
      const creador = await this.userRepo.findOne({
        where: { userId: solicitud.createdBy },
      });
      if (creador) usuarios = [creador];
    }

    const label = PERMISO_ESTADOS[estado].label;
    const nro = String(solicitud.solicitudId);
    const quien = String(solicitud.data?.nombre ?? "").trim();
    const cuando = String(solicitud.data?.fechaPermiso ?? "").trim();

    const enviados = new Set<string>();
    for (const u of usuarios) {
      const to = u.emailNotificacion || u.email;
      if (!to || enviados.has(to.toLowerCase())) continue;
      enviados.add(to.toLowerCase());
      await this.notifications.sendEmail({
        to,
        subject: `Solicitud de permiso N.º ${nro} · ${label}`,
        html: `
      <div style="font-family:Arial,sans-serif;color:#1f2937">
        <p>Hola ${u.nombre ?? ""},</p>
        <p>La solicitud de permiso <b>N.º ${nro}</b> (formato GTH-009-F)${
          quien ? ` de <b>${quien}</b>` : ""
        }${cuando ? ` para el <b>${cuando}</b>` : ""} pasó al estado <b>${label}</b>.</p>
        ${motivo ? `<p><b>Motivo:</b> ${motivo}</p>` : ""}
        <p>Ingresa al sistema para continuar con el trámite.</p>
        <p style="color:#6b7280;font-size:12px">Sistema de Gestión · Gestión del conocimiento</p>
      </div>`,
      });
    }
  }

  // ============================================
  // Flujo de la planilla de Horas Extras (GTH-016-F)
  // ============================================

  /**
   * Aplica una transición del flujo de horas extras. Todos los pasos van por rol: la
   * registra quien atiende el municipio, la revisa un Director de Proyecto, la avala
   * Gerencia de Proyectos y la cierra Dirección Administrativa.
   *
   * Cada paso deja estampado quién lo hizo y cuándo, porque la planilla termina en
   * nómina y hay que poder responder quién avaló cada liquidación.
   */
  private async transitionHorasExtras(
    solicitud: GcSolicitud,
    accion: string,
    userId: number,
    motivo?: string,
  ): Promise<GcSolicitud> {
    const t = HORAS_EXTRAS_TRANSICIONES[accion];
    if (!t) throw new BadRequestException(`Acción "${accion}" no válida`);

    if (solicitud.estado !== t.from) {
      throw new BadRequestException(
        `La planilla está en "${solicitud.estado}" y no admite la acción "${accion}"`,
      );
    }

    const user = await this.userRepo.findOne({
      where: { userId },
      relations: ["role"],
    });
    const rol = user?.role?.nombreRol ?? "";

    let autorizado = esRolPmo(rol);
    if (!autorizado && t.soloCreador) {
      autorizado = solicitud.createdBy === userId;
    } else if (!autorizado) {
      // El rol es condición necesaria en todos los pasos. El de revisión añade la
      // jerarquía: hay que ser el Director de Proyecto **de esa** persona.
      autorizado = t.roles.includes(rol);
      if (autorizado && t.jefeAutorizador) {
        autorizado = await this.esDirectorDeProyectoACargo(solicitud, userId);
      }
    }
    if (!autorizado) {
      throw new ForbiddenException("No tienes permiso para ejecutar esta acción");
    }

    if (t.requiereMotivo && (!motivo || !motivo.trim())) {
      throw new BadRequestException("Debe indicar el motivo");
    }

    // A dónde va la planilla. Casi siempre es el `to` de la transición, pero al enviarla
    // hay una excepción: si quien la reportó no tiene un Director de Proyecto que la
    // revise, ese paso no lo puede atender nadie con criterio sobre esas horas y se salta
    // derecho a Dirección Técnica. Antes se le ofrecía a los cuatro directores por igual,
    // lo que era pedirle a alguien que avale el trabajo de una persona que no tiene a
    // cargo: una firma sin fundamento y un paso más en el camino.
    const destino: HorasExtrasEstado =
      accion === "enviar" && !(await this.hayQuienRevisePorProyecto(solicitud))
        ? "pendiente_direccion_tecnica"
        : t.to;

    const ahora = new Date();
    const hoy = ahora.toISOString().slice(0, 10);
    const data: Record<string, any> = { ...(solicitud.data ?? {}) };

    // Una planilla sin trabajador, sin valor hora o sin renglones no se puede revisar:
    // no hay nada que liquidar y el error se descubriría tres pasos más adelante.
    if (accion === "enviar") {
      const filas = Array.isArray(data.filas) ? data.filas : [];
      // El valor hora ya no se teclea: sale del salario de la ficha al aprobar. Lo que no
      // puede faltar es la cédula (con ella se ubica ese salario) y el periodo (con él la
      // nómina ubica el mes de la planilla).
      if (!String(data.periodo ?? "").trim()) {
        throw new BadRequestException(
          "Falta el mes y el año de la planilla: con ellos la nómina la ubica en su periodo.",
        );
      }
      // El resto —encabezado y renglón por renglón— lo revisa la tabla de obligatorios.
      exigirCamposObligatorios(solicitud.formato, accion, data);
    }

    const firma = HORAS_EXTRAS_FIRMA_POR_ACCION[accion];
    if (firma) {
      data[firma.nombre] = user?.nombre ?? "";
      data[firma.fecha] = data[firma.fecha] || hoy;
    }

    // Devolver la planilla borra las firmas: vuelve a recorrer el camino completo y
    // dejarlas diría que alguien avaló unas horas que después cambiaron.
    if (destino === "borrador") {
      for (const f of Object.values(HORAS_EXTRAS_FIRMA_POR_ACCION)) {
        data[f.nombre] = "";
        data[f.fecha] = "";
      }
    }

    // Gerencia de Proyectos acaba de aprobar: la planilla nace en la base real, lista
    // para que Dirección Administrativa la lleve a nómina. Va antes de guardar la
    // solicitud para no dejarla marcada "aprobado" sin que la planilla exista de
    // verdad si esto falla.
    if (accion === "aprobar_gp") {
      // El valor hora se deriva del salario que la ficha de Personal tiene para la cédula,
      // dividido entre 210. La planilla ya no lo trae tecleado.
      const ficha = await this.talentoHumano.fichaParaFormato(String(data.cedula ?? ""), true);
      const salarioFicha = numHorasExtras(ficha?.salario ?? "");
      const valorHora = salarioFicha > 0 ? salarioFicha / DIVISOR_HORA_EXTRA : 0;
      const filas: Record<string, any>[] = Array.isArray(data.filas) ? data.filas : [];
      const detalle = filas.map((fl) => {
        const horas = (fl.horas ?? {}) as Record<string, string>;
        const liquidacion = TIPOS_HORA_EXTRA.reduce(
          (s, tp) => s + numHorasExtras(horas[tp.key]) * tp.factor,
          0,
        );
        return {
          // La planilla guarda la fecha como se teclea («01/07/2026») y la columna es
          // `date`: sin convertirla, Postgres rechaza el renglón. El error salía como un
          // 400 con un mensaje genérico y dejaba la cabecera ya insertada, así que cada
          // intento de aprobar creaba una planilla huérfana sin renglones.
          fecha: fechaTextoAIso(fl.fecha),
          proyecto: fl.proyecto || null,
          region: fl.region || null,
          horaEntrada: fl.horaEntrada || null,
          horaSalida: fl.horaSalida || null,
          almuerzo: fl.almuerzo || null,
          codigoLabor: fl.codigoLabor || null,
          labor: fl.labor || null,
          diurna: horas.diurna || null,
          recargoNocturno: horas.recargoNocturno || null,
          nocturna: horas.nocturna || null,
          diurnaFestiva: horas.diurnaFestiva || null,
          nocturnaFestiva: horas.nocturnaFestiva || null,
          liquidacion: valorHora ? String(liquidacion * valorHora) : null,
        };
      });
      const totalHoras = filas.reduce(
        (s, fl) => s + TIPOS_HORA_EXTRA.reduce((ss, tp) => ss + numHorasExtras((fl.horas ?? {})[tp.key]), 0),
        0,
      );
      const totalLiquidacion = filas.reduce((s, fl) => {
        const horas = (fl.horas ?? {}) as Record<string, string>;
        return (
          s + valorHora * TIPOS_HORA_EXTRA.reduce((ss, tp) => ss + numHorasExtras(horas[tp.key]) * tp.factor, 0)
        );
      }, 0);

      await this.talentoHumano.registrarPlanilla(
        {
          // Deja amarrado el formato que lo originó, para poder deshacerlo si se anula.
          solicitudId: solicitud.solicitudId,
          nombre: data.nombre || "",
          identificacion: data.cedula || null,
          cargo: data.cargo || null,
          salario: ficha?.salario ?? null,
          periodo: data.periodo || null,
          valorHora: valorHora ? String(valorHora) : null,
          totalHoras: totalHoras ? String(totalHoras) : null,
          totalLiquidacion: totalLiquidacion ? String(totalLiquidacion) : null,
          observaciones: `Generada al aprobar la solicitud GTH-016-F N.º ${solicitud.solicitudId}.`,
        },
        detalle,
      );
    }

    const entrada = {
      estado: destino,
      accion,
      fecha: ahora.toISOString(),
      userId,
      userName: user?.nombre ?? null,
      motivo: motivo?.trim() || undefined,
    };
    solicitud.estado = destino;
    solicitud.estadoDesde = ahora;
    await this.asignarNumero(solicitud);
    solicitud.historial = [...(solicitud.historial ?? []), entrada];
    solicitud.data = data;

    const guardada = await this.solicitudRepo.save(solicitud);

    this.notificarHorasExtras(guardada, destino, motivo).catch((e) =>
      this.logger.warn(`No se pudo notificar la planilla de horas extras: ${e.message}`),
    );

    return guardada;
  }

  /** Notifica por correo al actor que sigue en el flujo de horas extras. */
  private async notificarHorasExtras(
    solicitud: GcSolicitud,
    estado: HorasExtrasEstado,
    motivo?: string,
  ): Promise<void> {
    const destinos = HORAS_EXTRAS_NOTIFICAR_AL_LLEGAR[estado];
    const usuarios: User[] = [];

    if (destinos.includes("creador") && solicitud.createdBy) {
      const creador = await this.userRepo.findOne({
        where: { userId: solicitud.createdBy },
      });
      if (creador) usuarios.push(creador);
    }
    if (destinos.includes("director-a-cargo")) {
      // Solo su Director de Proyecto, no los cuatro: al de Antioquia no le importan
      // las horas de Putumayo y el correo dejaría de leerse.
      usuarios.push(...(await this.directoresDeProyectoDelCreador(solicitud)));
    }
    const roles = destinos.filter(
      (d) => d !== "creador" && d !== "director-a-cargo",
    );
    if (roles.length > 0) {
      const activos = await this.userRepo.find({
        where: { estado: true },
        relations: ["role"],
      });
      const objetivo = roles.map((r) => r.toLowerCase());
      usuarios.push(
        ...activos.filter((u) =>
          objetivo.includes(u.role?.nombreRol?.toLowerCase() ?? ""),
        ),
      );
    }

    const label = HORAS_EXTRAS_ESTADOS[estado].label;
    const nro = String(solicitud.solicitudId);
    const trabajador = String(solicitud.data?.nombre ?? "").trim();
    const periodo = String(solicitud.data?.periodo ?? "").trim();

    const enviados = new Set<string>();
    for (const u of usuarios) {
      const to = u.emailNotificacion || u.email;
      if (!to || enviados.has(to.toLowerCase())) continue;
      enviados.add(to.toLowerCase());
      await this.notifications.sendEmail({
        to,
        subject: `Horas extras N.º ${nro} · ${label}`,
        html: `
      <div style="font-family:Arial,sans-serif;color:#1f2937">
        <p>Hola ${u.nombre ?? ""},</p>
        <p>La planilla de horas extras <b>N.º ${nro}</b> (formato GTH-016-F)${
          trabajador ? ` de <b>${trabajador}</b>` : ""
        }${periodo ? ` · periodo <b>${periodo}</b>` : ""} pasó al estado <b>${label}</b>.</p>
        ${motivo ? `<p><b>Motivo:</b> ${motivo}</p>` : ""}
        <p>${
          estado === "aprobado"
            ? "Ya recorrió las tres revisiones y queda lista para liquidar en nómina."
            : "Ingresa al sistema para continuar con el trámite."
        }</p>
        <p style="color:#6b7280;font-size:12px">Sistema de Gestión · Gestión del conocimiento</p>
      </div>`,
      });
    }
  }

  // ============================================
  // Flujo de la Solicitud de Vacaciones (GTH-018-F)
  // ============================================

  /**
   * Aplica una transición del flujo de vacaciones: los cuatro recuadros de
   * "APROBACIÓN" del papel, en orden — firma del empleado, Vo.Bo. del jefe inmediato,
   * Vo.Bo. de Talento Humano y fecha de aprobación de Gerencia.
   *
   * El paso del jefe usa la misma tabla de autorizaciones que el permiso y el
   * anticipo: no hay una lista de roles aprobadores porque la jerarquía ya está en la
   * base y duplicarla aquí la haría envejecer.
   */
  private async transitionVacaciones(
    solicitud: GcSolicitud,
    accion: string,
    userId: number,
    motivo?: string,
  ): Promise<GcSolicitud> {
    const t = VACACIONES_TRANSICIONES[accion];
    if (!t) throw new BadRequestException(`Acción "${accion}" no válida`);

    if (solicitud.estado !== t.from) {
      throw new BadRequestException(
        `La solicitud está en "${solicitud.estado}" y no admite la acción "${accion}"`,
      );
    }

    const user = await this.userRepo.findOne({
      where: { userId },
      relations: ["role"],
    });
    const rol = user?.role?.nombreRol ?? "";
    const esPmo = esRolPmo(rol);

    let autorizado = esPmo;
    if (!autorizado) {
      if (t.jefeAutorizador) {
        autorizado = await this.puedeAprobarComoJefe(solicitud, userId, rol);
      } else if (t.soloCreador) {
        autorizado = solicitud.createdBy === userId;
      } else {
        autorizado = t.roles.includes(rol);
      }
    }
    if (!autorizado) {
      throw new ForbiddenException("No tienes permiso para ejecutar esta acción");
    }

    if (t.requiereMotivo && (!motivo || !motivo.trim())) {
      throw new BadRequestException("Debe indicar el motivo");
    }

    const ahora = new Date();
    const hoy = ahora.toISOString().slice(0, 10);
    const data: Record<string, any> = { ...(solicitud.data ?? {}) };

    // Sin nombre y sin documento, el papel no dice de quién son las vacaciones.
    if (accion === "enviar") {
      exigirCamposObligatorios(solicitud.formato, accion, data);
      data.enviadoPor = user?.nombre ?? "";
    } else if (accion === "aprobar_jefe") {
      data.voBoJefeNombre = user?.nombre ?? "";
      data.voBoJefeFecha = data.voBoJefeFecha || hoy;
    } else if (accion === "aprobar_th") {
      data.voBoTalentoHumanoNombre = user?.nombre ?? "";
      data.voBoTalentoHumanoFecha = data.voBoTalentoHumanoFecha || hoy;
    } else if (accion === "aprobar_gerencia") {
      data.aprobadoPorGerencia = user?.nombre ?? "";
      // Las casillas día/mes/año del papel: se llenan solo si nadie las llenó antes.
      if (!String(data.fechaAprobacion?.dia ?? "").trim()) {
        data.fechaAprobacion = {
          dia: String(ahora.getDate()).padStart(2, "0"),
          mes: String(ahora.getMonth() + 1).padStart(2, "0"),
          anio: String(ahora.getFullYear()),
        };
      }

      // Gerencia acaba de aprobar: las vacaciones nacen en la base real, con los días
      // y valores que confirmó Recursos Humanos (bloque "USO EXCLUSIVO ÁREA RECURSOS
      // HUMANOS"), que son los que de verdad se conceden y pueden no ser los mismos
      // que pidió el empleado arriba. Va antes de guardar la solicitud para no dejarla
      // marcada "aprobado" sin que el registro exista de verdad si esto falla.
      const ladoPeriodo = (p: { mes?: string; anio?: string }) =>
        [p?.mes, p?.anio].filter((v) => String(v ?? "").trim()).join("/");
      const periodoCausado = [ladoPeriodo(data.periodoDe ?? {}), ladoPeriodo(data.periodoA ?? {})]
        .filter(Boolean)
        .join(" a ");
      const diasDisfrutar = data.rhDiasDisfrutar || data.diasDisfrutar;
      const diasCompensar = data.rhDiasCompensar || data.diasCompensar;

      await this.talentoHumano.createVacacion({
        // Deja amarrado el formato que lo originó, para poder deshacerlo si se anula.
        solicitudId: solicitud.solicitudId,
        identificacion: data.documento || "",
        nombre: data.nombres || "",
        cargo: data.cargo || null,
        area: data.areaCargo || null,
        fechaIngreso: fechaISO(data.fechaIngreso),
        periodoCausado: periodoCausado || null,
        fechaInicio: fechaISO(data.rhFechaInicio) || fechaISO(data.fechaInicio),
        fechaFinal: fechaISO(data.rhFechaFinal) || fechaISO(data.fechaFinal),
        diasDisfrutar: diasDisfrutar ? Number(diasDisfrutar) : null,
        diasCompensar: diasCompensar ? Number(diasCompensar) : null,
        diasPendientes: data.rhDiasPendientes ? Number(data.rhDiasPendientes) : null,
        valorPrima: data.valorPrima || null,
        valorAnticipo: data.valorAnticipo || null,
        fechaPago: fechaISO(data.fechaPago),
        fechaAprobacion: fechaISO(data.fechaAprobacion),
        observaciones: `Generadas al aprobar la solicitud GTH-018-F N.º ${solicitud.solicitudId}.`,
      });
    }

    // Al devolver al borrador se borran los Vo.Bo. dados: el recorrido vuelve a
    // empezar y dejarlos diría que alguien avaló unas fechas que ya no son las mismas.
    if (t.to === "borrador") {
      data.enviadoPor = "";
      data.voBoJefeNombre = "";
      data.voBoJefeFecha = "";
      data.voBoTalentoHumanoNombre = "";
      data.voBoTalentoHumanoFecha = "";
      data.aprobadoPorGerencia = "";
      data.fechaAprobacion = { dia: "", mes: "", anio: "" };
    }

    const entrada = {
      estado: t.to,
      accion,
      fecha: ahora.toISOString(),
      userId,
      userName: user?.nombre ?? null,
      motivo: motivo?.trim() || undefined,
    };
    solicitud.estado = t.to;
    solicitud.estadoDesde = ahora;
    await this.asignarNumero(solicitud);
    solicitud.historial = [...(solicitud.historial ?? []), entrada];
    solicitud.data = data;

    const guardada = await this.solicitudRepo.save(solicitud);

    this.notificarVacaciones(guardada, t.to, motivo).catch((e) =>
      this.logger.warn(`No se pudo notificar la solicitud de vacaciones: ${e.message}`),
    );

    return guardada;
  }

  /** Notifica por correo al actor que sigue en el flujo de vacaciones. */
  private async notificarVacaciones(
    solicitud: GcSolicitud,
    estado: VacacionesEstado,
    motivo?: string,
  ): Promise<void> {
    const destino = VACACIONES_NOTIFICAR_AL_LLEGAR[estado];
    let usuarios: User[] = [];

    if (destino === "creador") {
      if (solicitud.createdBy) {
        const creador = await this.userRepo.findOne({
          where: { userId: solicitud.createdBy },
        });
        if (creador) usuarios = [creador];
      }
    } else if (destino === "jefe") {
      usuarios = await this.jefesDelCreador(solicitud);
    } else {
      const activos = await this.userRepo.find({
        where: { estado: true },
        relations: ["role"],
      });
      const objetivo = destino.map((r) => r.toLowerCase());
      usuarios = activos.filter((u) =>
        objetivo.includes(u.role?.nombreRol?.toLowerCase() ?? ""),
      );
    }

    const label = VACACIONES_ESTADOS[estado].label;
    const nro = String(solicitud.solicitudId);
    const quien = String(solicitud.data?.nombres ?? "").trim();

    const enviados = new Set<string>();
    for (const u of usuarios) {
      const to = u.emailNotificacion || u.email;
      if (!to || enviados.has(to.toLowerCase())) continue;
      enviados.add(to.toLowerCase());
      await this.notifications.sendEmail({
        to,
        subject: `Solicitud de vacaciones N.º ${nro} · ${label}`,
        html: `
      <div style="font-family:Arial,sans-serif;color:#1f2937">
        <p>Hola ${u.nombre ?? ""},</p>
        <p>La solicitud de vacaciones <b>N.º ${nro}</b> (formato GTH-018-F)${
          quien ? ` de <b>${quien}</b>` : ""
        } pasó al estado <b>${label}</b>.</p>
        ${motivo ? `<p><b>Motivo:</b> ${motivo}</p>` : ""}
        <p>Ingresa al sistema para continuar con el trámite.</p>
        <p style="color:#6b7280;font-size:12px">Sistema de Gestión · Gestión del conocimiento</p>
      </div>`,
      });
    }
  }

  /**
   * Los Directores de Proyecto que tienen a cargo a quien registró la planilla, según
   * la tabla de autorizaciones. Vacío si no tiene ninguno.
   */
  /**
   * ¿Hay un Director de Proyecto con criterio para revisar esta planilla?
   *
   * Sí cuando quien la reportó tiene alguno asignado, y también cuando quien la reportó
   * **es** un Director de Proyecto: en ese caso se revisa a sí mismo y la manda a
   * Dirección Técnica, que fue lo acordado.
   *
   * No cuando la reporta alguien de otra área sin director asignado —Talento Humano,
   * PQRS, coordinación—. Ahí el paso sobra y la planilla arranca en Dirección Técnica.
   */
  private async hayQuienRevisePorProyecto(solicitud: GcSolicitud): Promise<boolean> {
    const aCargo = await this.directoresDeProyectoDelCreador(solicitud);
    if (aCargo.length > 0) return true;
    if (!solicitud.createdBy) return false;
    const creador = await this.userRepo.findOne({
      where: { userId: solicitud.createdBy },
      relations: ["role"],
    });
    return ROLES_DIRECTOR_PROYECTO.includes(creador?.role?.nombreRol ?? "");
  }

  private async directoresDeProyectoDelCreador(
    solicitud: GcSolicitud,
  ): Promise<User[]> {
    if (!solicitud.createdBy) return [];
    const rels = await this.authorizationRepo.find({
      where: { usuarioAutorizadoId: solicitud.createdBy, esActivo: true },
      relations: ["usuarioAutorizador", "usuarioAutorizador.role"],
    });
    const vistos = new Set<number>();
    return rels
      .map((r) => r.usuarioAutorizador)
      .filter((u): u is User => {
        if (!u || !u.estado) return false;
        if (!ROLES_DIRECTOR_PROYECTO.includes(u.role?.nombreRol ?? "")) return false;
        if (vistos.has(u.userId)) return false;
        vistos.add(u.userId);
        return true;
      });
  }

  /**
   * True si `userId` es el Director de Proyecto a cargo de quien registró la planilla.
   *
   * Si el creador no tiene **ningún** Director de Proyecto asignado —alguien de otra
   * área que registre una planilla—, se acepta a cualquiera de ellos: dejarla sin nadie
   * que pueda revisarla la trabaría para siempre.
   */
  private async esDirectorDeProyectoACargo(
    solicitud: GcSolicitud,
    userId: number,
  ): Promise<boolean> {
    const aCargo = await this.directoresDeProyectoDelCreador(solicitud);
    if (aCargo.length > 0) return aCargo.some((u) => u.userId === userId);

    /*
     * Nadie por encima con rol de Director de Proyecto. Pasa en dos situaciones muy
     * distintas y no se resuelven igual:
     *
     *  - La registró un Director de Proyecto (sus jefes son Gerencia y Dirección
     *    Técnica). Entonces la revisa ÉL MISMO. Dejársela a cualquiera de los cuatro
     *    permitiría que el de Antioquia avalara las horas del Valle, que es justo lo
     *    que la jerarquía existe para impedir.
     *  - La registró alguien sin jefe asignado. Ahí sí la atiende cualquiera de los
     *    cuatro: es preferible eso a que la planilla quede sin nadie que la mueva.
     */
    if (!solicitud.createdBy) return true;
    const creador = await this.userRepo.findOne({
      where: { userId: solicitud.createdBy },
      relations: ["role"],
    });
    if (ROLES_DIRECTOR_PROYECTO.includes(creador?.role?.nombreRol ?? "")) {
      return solicitud.createdBy === userId;
    }
    return true;
  }

  /** Los jefes de quien creó la solicitud, con la Gerencia solo como último recurso. */
  private async jefesDelCreador(solicitud: GcSolicitud): Promise<User[]> {
    if (!solicitud.createdBy) return [];
    const rels = await this.authorizationRepo.find({
      where: { usuarioAutorizadoId: solicitud.createdBy, esActivo: true },
      relations: ["usuarioAutorizador"],
    });
    const jefes = rels
      .map((r) => r.usuarioAutorizador)
      .filter((u): u is User => !!u && u.estado);

    const propios = jefes.filter(
      (u) => u.role?.nombreRol?.toLowerCase() !== ROL_GERENCIA.toLowerCase(),
    );
    if (propios.length > 0) return propios;
    if (jefes.length > 0) return jefes;

    const activos = await this.userRepo.find({
      where: { estado: true },
      relations: ["role"],
    });
    return activos.filter(
      (u) => u.role?.nombreRol?.toLowerCase() === ROL_GERENCIA.toLowerCase(),
    );
  }

  /** True si el creador no tiene ningún autorizador activo: nadie por encima que resuelva. */
  private async creadorSinAutorizador(solicitud: GcSolicitud): Promise<boolean> {
    if (!solicitud.createdBy) return false;
    const rel = await this.authorizationRepo.findOne({
      where: { usuarioAutorizadoId: solicitud.createdBy, esActivo: true },
    });
    return !rel;
  }

  /**
   * True si el creador de la solicitud es un **Director de Área**.
   * Regla de negocio (igual que en Compras, donde los roles de alto nivel saltan la
   * revisión): su anticipo se salta el paso del jefe y va directo a la Gerencia
   * (Dra. Gloria); su legalización se salta el jefe y va directo a Contabilidad.
   */
  private async creadorEsDirectorArea(solicitud: GcSolicitud): Promise<boolean> {
    if (!solicitud.createdBy) return false;
    const creador = await this.userRepo.findOne({
      where: { userId: solicitud.createdBy },
      relations: ["role"],
    });
    return creador?.role?.category === CATEGORIA_DIRECTOR_AREA;
  }

  /**
   * Resuelve si `userId` puede ejecutar un paso marcado `jefeAutorizador`:
   * es el autorizador del creador o, si el creador es Director de Área, la Gerencia.
   *
   * En el flujo normal un Director de Área nunca llega a este paso (lo salta al
   * enviar); esto queda como red de seguridad para desatascar una solicitud que sí
   * haya quedado ahí.
   */
  private async puedeAprobarComoJefe(
    solicitud: GcSolicitud,
    userId: number,
    rol: string,
  ): Promise<boolean> {
    if (await this.esAutorizadorDe(userId, solicitud.createdBy)) return true;
    if (rol === ROL_GERENCIA && (await this.creadorEsDirectorArea(solicitud))) {
      return true;
    }
    // Quien no tiene autorizador —hoy Gerencia y Contabilidad— no tiene quién le
    // apruebe: sin esto su solicitud se queda trabada para siempre. Solo amplía quién
    // puede actuar, y solo cuando no hay nadie más.
    if (rol === ROL_GERENCIA && (await this.creadorSinAutorizador(solicitud))) {
      return true;
    }
    return false;
  }

  /**
   * A quién se le avisa en el paso del "jefe": su autorizador en la tabla de
   * autorizaciones o, si el creador es Director de Área, la Gerencia (Dra. Gloria).
   */
  private async destinatariosJefe(solicitud: GcSolicitud): Promise<User[]> {
    if (!solicitud.createdBy) return [];
    const rel = await this.authorizationRepo.findOne({
      where: { usuarioAutorizadoId: solicitud.createdBy, esActivo: true },
      relations: ["usuarioAutorizador"],
    });
    if (rel?.usuarioAutorizador) return [rel.usuarioAutorizador];

    if (await this.creadorEsDirectorArea(solicitud)) {
      const activos = await this.userRepo.find({
        where: { estado: true },
        relations: ["role"],
      });
      return activos.filter(
        (u) => u.role?.nombreRol?.toLowerCase() === ROL_GERENCIA.toLowerCase(),
      );
    }
    return [];
  }

  /** True si `autorizadorId` es el autorizador activo de `autorizadoId` (su jefe). */
  private async esAutorizadorDe(
    autorizadorId: number,
    autorizadoId: number | null,
  ): Promise<boolean> {
    if (!autorizadoId) return false;
    const rel = await this.authorizationRepo.findOne({
      where: {
        usuarioAutorizadorId: autorizadorId,
        usuarioAutorizadoId: autorizadoId,
        esActivo: true,
      },
    });
    return !!rel;
  }

  /** Notifica por correo al actor que sigue en el flujo del anticipo. */
  private async notificarAnticipo(
    solicitud: GcSolicitud,
    estado: AnticipoEstado,
    motivo?: string,
  ): Promise<void> {
    const destino = ANTICIPO_NOTIFICAR_AL_LLEGAR[estado];
    let usuarios: User[] = [];

    if (destino === "creador") {
      if (solicitud.createdBy) {
        const creador = await this.userRepo.findOne({
          where: { userId: solicitud.createdBy },
        });
        if (creador) usuarios = [creador];
      }
    } else if (destino === "jefe") {
      // El jefe es el autorizador del creador; si es Director de Área, la Gerencia.
      usuarios = await this.destinatariosJefe(solicitud);
    } else {
      const activos = await this.userRepo.find({
        where: { estado: true },
        relations: ["role"],
      });
      const objetivo = destino.map((r) => r.toLowerCase());
      usuarios = activos.filter((u) =>
        objetivo.includes(u.role?.nombreRol?.toLowerCase() ?? ""),
      );
    }

    const label = ANTICIPO_ESTADOS[estado].label;
    const nro = (solicitud.data?.consecutivo || solicitud.solicitudId).toString();
    const concepto = (solicitud.data?.concepto || "").toString().trim();

    const enviados = new Set<string>();
    for (const u of usuarios) {
      const to = u.emailNotificacion || u.email;
      if (!to || enviados.has(to.toLowerCase())) continue;
      enviados.add(to.toLowerCase());
      await this.notifications.sendEmail({
        to,
        subject: `Solicitud de anticipo N.º ${nro} · ${label}`,
        html: this.buildHtmlAnticipo(u.nombre ?? "", nro, label, concepto, motivo),
      });
    }
  }

  private buildHtmlAnticipo(
    nombre: string,
    nro: string,
    label: string,
    concepto: string,
    motivo?: string,
  ): string {
    return `
      <div style="font-family:Arial,sans-serif;color:#1f2937">
        <p>Hola ${nombre || ""},</p>
        <p>La solicitud de anticipo <b>N.º ${nro}</b> (formato GF-005-F) pasó al estado
           <b>${label}</b>${concepto ? ` — <i>${concepto}</i>` : ""}.</p>
        ${motivo ? `<p><b>Motivo:</b> ${motivo}</p>` : ""}
        <p>Ingresa al sistema para continuar con el trámite.</p>
        <p style="color:#6b7280;font-size:12px">Sistema de Gestión · Gestión del conocimiento</p>
      </div>`;
  }
}
