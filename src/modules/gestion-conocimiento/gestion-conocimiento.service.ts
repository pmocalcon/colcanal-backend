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
import { User } from "../../database/entities/user.entity";
import { Material } from "../../database/entities/material.entity";
import { OperationCenter } from "../../database/entities/operation-center.entity";
import { Authorization } from "../../database/entities/authorization.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { PurchasesService } from "../purchases/purchases.service";
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
  PRESTAMO_TRANSICIONES,
  PRESTAMO_ESTADOS,
  PRESTAMO_NOTIFICAR_AL_LLEGAR,
  PrestamoEstado,
} from "./prestamo-workflow";
import {
  PERMISO_TRANSICIONES,
  PERMISO_ESTADOS,
  FILAS_APROBACION_POR_ROL,
  PermisoEstado,
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
  SIGLA_CONTRATO,
  SIGLA_SIN_TIPO,
  ACCION_ALERTA_VENCIMIENTO,
  ACCION_RQ_POLIZA,
  ACCION_NOTIFICACION_INICIO,
  DIAS_ALERTA_VENCIMIENTO,
  ESTADOS_CONTRATO_VIGENTE,
  formatearConsecutivo,
  mismoNombre,
  numeroDeConsecutivo,
  vencimientoDe,
} from "./juridica-contratos";
import { ROLES_ADMINISTRATIVA, ROLES_JURIDICA } from "./juridica-workflow";

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

  /** Formato de Autorización de pago mediante cuentas entre compañías (uso excepcional). */
  private static readonly FORMATO_CUENTAS = "GF-004-F5";

  /** True si la solicitud es una Autorización de cuentas entre compañías (GF-004-F5). */
  private esCuentasCompanias(s: GcSolicitud): boolean {
    return (
      s.gestion === "contable" &&
      s.formato === GestionConocimientoService.FORMATO_CUENTAS
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

  async findAll(
    gestion?: string,
    mine?: boolean,
    userId?: number,
  ): Promise<GcSolicitud[]> {
    const where: Record<string, unknown> = {};
    if (gestion) where.gestion = gestion;
    if (mine && userId) where.createdBy = userId;
    const solicitudes = await this.solicitudRepo.find({
      where,
      order: { updatedAt: "DESC" },
    });
    if (!userId) return solicitudes;
    return this.anotarAccionesPendientes(solicitudes, userId);
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
    if (creadorIds.length > 0) {
      const creadores = await this.userRepo.find({
        where: { userId: In(creadorIds) },
        relations: ["role"],
      });
      for (const c of creadores) {
        if (c.role?.category === CATEGORIA_DIRECTOR_AREA) directoresArea.add(c.userId);
      }
      const conJefe = await this.authorizationRepo.find({
        where: { usuarioAutorizadoId: In(creadorIds), esActivo: true },
      });
      for (const r of conJefe) sinAutorizador.delete(r.usuarioAutorizadoId);
    }

    return solicitudes.map((s) => {
      const transiciones = this.esAnticipo(s)
        ? ANTICIPO_TRANSICIONES
        : this.esLegalizacion(s)
          ? LEGALIZACION_TRANSICIONES
          : this.esCuentasCompanias(s)
            ? CUENTAS_TRANSICIONES
            : this.esPrestamo(s)
              ? PRESTAMO_TRANSICIONES
              : this.esPermiso(s)
                ? PERMISO_TRANSICIONES
                : this.esHorasExtras(s)
                  ? HORAS_EXTRAS_TRANSICIONES
                  : JURIDICA_TRANSICIONES;

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
            const esJefe =
              (s.createdBy != null && autorizados.has(s.createdBy)) ||
              (rol === ROL_GERENCIA &&
                s.createdBy != null &&
                (directoresArea.has(s.createdBy) || sinAutorizador.has(s.createdBy)));
            // Cuando el paso además nombra roles —horas extras, donde revisa el
            // Director de Proyecto a cargo— hay que cumplir las dos cosas.
            return esJefe && (anyT.roles.length === 0 || anyT.roles.includes(rol));
          }
          return anyT.roles.includes(rol);
        })
        .map(([accion]) => accion);

      return Object.assign(s, { accionesPendientes: acciones });
    });
  }

  async findOne(id: number): Promise<GcSolicitud> {
    const solicitud = await this.solicitudRepo.findOne({ where: { solicitudId: id } });
    if (!solicitud) throw new NotFoundException("Solicitud no encontrada");
    return this.conNombreDelCreador(solicitud);
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
      data.fechaFirmaJefe = data.fechaFirmaJefe || hoy;
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
    solicitud.historial = [...(solicitud.historial ?? []), entrada];

    // Firmas automáticas del recuadro del formato y registro del pago.
    if (accion === "aprobar_jefe") {
      data.firmaJefe = user?.nombre ?? "";
      data.fechaFirmaJefe = data.fechaFirmaJefe || hoy;
    } else if (accion === "aprobar_gp") {
      data.firmaGerenteProy = user?.nombre ?? "";
      data.fechaFirmaGerenteProy = data.fechaFirmaGerenteProy || hoy;
    } else if (accion === "aprobar_gerencia") {
      data.firmaGerenciaGral = user?.nombre ?? "";
      data.fechaFirmaGerenciaGral = data.fechaFirmaGerenciaGral || hoy;
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
    if (accion === "enviar") {
      const nombre = [data.primerNombre, data.segundoNombre, data.primerApellido, data.segundoApellido]
        .map((s: unknown) => String(s ?? "").trim())
        .filter(Boolean)
        .join(" ");
      if (!nombre || !String(data.numero ?? "").trim() || !String(data.valorSolicitado ?? "").trim()) {
        throw new BadRequestException(
          "Diligencia el nombre, el número de identificación y el valor del préstamo antes de enviar.",
        );
      }
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
    solicitud.historial = [...(solicitud.historial ?? []), entrada];
    solicitud.data = data;

    const guardada = await this.solicitudRepo.save(solicitud);

    this.notificarPrestamo(guardada, t.to, motivo).catch((e) =>
      this.logger.warn(`No se pudo notificar el préstamo: ${e.message}`),
    );

    return guardada;
  }

  /** Notifica por correo al actor que sigue en el flujo del préstamo. */
  private async notificarPrestamo(
    solicitud: GcSolicitud,
    estado: PrestamoEstado,
    motivo?: string,
  ): Promise<void> {
    const destino = PRESTAMO_NOTIFICAR_AL_LLEGAR[estado];
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

    const label = PRESTAMO_ESTADOS[estado].label;
    const nro = String(solicitud.solicitudId);
    const empleado = String(solicitud.data?.nombreCompleto ?? "").trim();

    const enviados = new Set<string>();
    for (const u of usuarios) {
      const to = u.emailNotificacion || u.email;
      if (!to || enviados.has(to.toLowerCase())) continue;
      enviados.add(to.toLowerCase());
      await this.notifications.sendEmail({
        to,
        subject: `Solicitud de préstamo N.º ${nro} · ${label}`,
        html: `
      <div style="font-family:Arial,sans-serif;color:#1f2937">
        <p>Hola ${u.nombre ?? ""},</p>
        <p>La solicitud de préstamo <b>N.º ${nro}</b> (formato GTH-007-F)${
          empleado ? ` de <b>${empleado}</b>` : ""
        } pasó al estado <b>${label}</b>.</p>
        ${motivo ? `<p><b>Motivo:</b> ${motivo}</p>` : ""}
        <p>Ingresa al sistema para continuar con el trámite.</p>
        <p style="color:#6b7280;font-size:12px">Sistema de Gestión · Gestión del conocimiento</p>
      </div>`,
      });
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

    // Sin nombre y sin fecha del permiso, el papel no dice quién falta ni cuándo.
    if (accion === "enviar") {
      const falta =
        !String(data.nombre ?? "").trim() || !String(data.fechaPermiso ?? "").trim();
      if (falta) {
        throw new BadRequestException(
          "Diligencia el nombre y la fecha del permiso antes de enviarlo a aprobación.",
        );
      }
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
      }
    }

    // Al negarlo vuelve al borrador: se limpia lo que el jefe había marcado para que un
    // reenvío no arrastre la decisión anterior. El motivo queda en la bitácora.
    if (t.to === "borrador") {
      data.aprobaciones = {};
      data.fechaAprobacion = "";
      data.aprobadoPor = "";
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
    solicitud.historial = [...(solicitud.historial ?? []), entrada];
    solicitud.data = data;

    const guardada = await this.solicitudRepo.save(solicitud);

    this.notificarPermiso(guardada, t.to, motivo).catch((e) =>
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

    if (estado === "pendiente_jefe") {
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

    const ahora = new Date();
    const hoy = ahora.toISOString().slice(0, 10);
    const data: Record<string, any> = { ...(solicitud.data ?? {}) };

    // Una planilla sin trabajador, sin valor hora o sin renglones no se puede revisar:
    // no hay nada que liquidar y el error se descubriría tres pasos más adelante.
    if (accion === "enviar") {
      const filas = Array.isArray(data.filas) ? data.filas : [];
      if (
        !String(data.nombre ?? "").trim() ||
        !String(data.valorHora ?? "").trim() ||
        filas.length === 0
      ) {
        throw new BadRequestException(
          "Diligencia el nombre del trabajador, el valor hora y al menos un renglón antes de enviar.",
        );
      }
    }

    const firma = HORAS_EXTRAS_FIRMA_POR_ACCION[accion];
    if (firma) {
      data[firma.nombre] = user?.nombre ?? "";
      data[firma.fecha] = data[firma.fecha] || hoy;
    }

    // Devolver la planilla borra las firmas: vuelve a recorrer el camino completo y
    // dejarlas diría que alguien avaló unas horas que después cambiaron.
    if (t.to === "borrador") {
      for (const f of Object.values(HORAS_EXTRAS_FIRMA_POR_ACCION)) {
        data[f.nombre] = "";
        data[f.fecha] = "";
      }
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
    solicitud.historial = [...(solicitud.historial ?? []), entrada];
    solicitud.data = data;

    const guardada = await this.solicitudRepo.save(solicitud);

    this.notificarHorasExtras(guardada, t.to, motivo).catch((e) =>
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

  /**
   * Los Directores de Proyecto que tienen a cargo a quien registró la planilla, según
   * la tabla de autorizaciones. Vacío si no tiene ninguno.
   */
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
    if (aCargo.length === 0) return true;
    return aCargo.some((u) => u.userId === userId);
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
