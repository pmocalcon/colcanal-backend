import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
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
  ROL_PMO,
  JuridicaEstado,
} from "./juridica-workflow";
import {
  ANTICIPO_TRANSICIONES,
  ANTICIPO_ESTADOS,
  ANTICIPO_NOTIFICAR_AL_LLEGAR,
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

@Injectable()
export class GestionConocimientoService {
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
    const esPmo = rol === ROL_PMO;

    // A quiénes autoriza este usuario (es su "jefe"), en una sola consulta.
    const rels = await this.authorizationRepo.find({
      where: { usuarioAutorizadorId: userId, esActivo: true },
    });
    const autorizados = new Set(rels.map((r) => r.usuarioAutorizadoId));

    // Creadores que son Directores de Área (para la red de seguridad del paso jefe).
    const creadorIds = [
      ...new Set(solicitudes.map((s) => s.createdBy).filter(Boolean)),
    ] as number[];
    const directoresArea = new Set<number>();
    if (creadorIds.length > 0) {
      const creadores = await this.userRepo.find({
        where: { userId: In(creadorIds) },
        relations: ["role"],
      });
      for (const c of creadores) {
        if (c.role?.category === CATEGORIA_DIRECTOR_AREA) directoresArea.add(c.userId);
      }
    }

    return solicitudes.map((s) => {
      const transiciones = this.esAnticipo(s)
        ? ANTICIPO_TRANSICIONES
        : this.esLegalizacion(s)
          ? LEGALIZACION_TRANSICIONES
          : JURIDICA_TRANSICIONES;

      const acciones = Object.entries(transiciones)
        .filter(([, t]) => t.from === s.estado)
        .filter(([, t]) => {
          if (esPmo) return true;
          const anyT = t as { soloCreador?: boolean; jefeAutorizador?: boolean; roles: string[] };
          if (anyT.soloCreador) return s.createdBy === userId;
          if (anyT.jefeAutorizador) {
            return (
              (s.createdBy != null && autorizados.has(s.createdBy)) ||
              (rol === ROL_GERENCIA &&
                s.createdBy != null &&
                directoresArea.has(s.createdBy))
            );
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
    return solicitud;
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
    const rol = (user?.role?.nombreRol ?? "").toLowerCase();
    const permitido =
      rol === "analista pmo" ||
      rol.includes("juríd") ||
      rol.includes("jurid") ||
      rol.includes("administrativ");
    if (!permitido) {
      throw new ForbiddenException(
        "Solo Jurídica o Administrativa pueden diligenciar la lista de chequeo",
      );
    }

    // Firma automática de la revisión según la etapa activa de la solicitud:
    // en trámite (Administrativa) → REVISIÓN DIRECCIÓN ADMINISTRATIVA;
    // contrato en elaboración (Jurídica) → REVISIÓN DIRECCIÓN JURÍDICA.
    // Se estampa quien revisa (nombre/cargo/fecha) sin sobrescribir lo ya firmado.
    const cl: Record<string, any> = { ...checklist };
    const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    if (solicitud.estado === "en_tramite_administrativa" && !cl.revAdminNombre) {
      cl.revAdminNombre = user?.nombre ?? "";
      cl.revAdminCargo = user?.cargo ?? "";
      cl.revAdminFecha = cl.revAdminFecha || hoy;
    } else if (
      solicitud.estado === "contrato_en_elaboracion" &&
      !cl.revJurNombre
    ) {
      cl.revJurNombre = user?.nombre ?? "";
      cl.revJurCargo = user?.cargo ?? "";
      cl.revJurFecha = cl.revJurFecha || hoy;
    }

    solicitud.data = { ...(solicitud.data ?? {}), checklist: cl };
    return this.solicitudRepo.save(solicitud);
  }

  /** Documentos de fase 2 que viven en data[key] (los diligencia Jurídica). */
  private static readonly DOC_KEYS = [
    "designacionSupervisor",
    "actaInicio",
    "contrato",
    // Lista de verificación de garantías + matriz resumen de riesgo contractual.
    "verificacionGarantias",
  ];

  /**
   * Guarda un documento de fase 2 (designación de supervisor, acta de inicio) en
   * data[key]. Los diligencia Jurídica (o el Analista PMO como comodín).
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
    const rol = (user?.role?.nombreRol ?? "").toLowerCase();
    const permitido =
      rol === "analista pmo" || rol.includes("juríd") || rol.includes("jurid");
    if (!permitido) {
      throw new ForbiddenException(
        "Solo Jurídica puede diligenciar este documento",
      );
    }
    solicitud.data = { ...(solicitud.data ?? {}), [key]: docData };
    return this.solicitudRepo.save(solicitud);
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

    // Autorización: el Analista PMO siempre puede; si no, se valida el rol o el creador.
    const esPmo = rol === ROL_PMO;
    const rolPermitido = t.roles.includes(rol);
    const esCreador = solicitud.createdBy === userId;
    const autorizado = esPmo || rolPermitido || (t.soloCreador && esCreador);
    if (!autorizado) {
      throw new ForbiddenException("No tienes permiso para ejecutar esta acción");
    }

    if (t.requiereMotivo && (!motivo || !motivo.trim())) {
      throw new BadRequestException("Debe indicar el motivo");
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
    solicitud.estado = t.to;
    solicitud.estadoDesde = ahora;
    solicitud.historial = [...(solicitud.historial ?? []), entrada];

    // Firmas automáticas del recuadro AUTORIZACIONES del formato:
    //  - la autorización de Gerencia de Proyectos llena "Autorizado por";
    //  - la firma de la solicitud por Gerencia (Dra. Gloria) llena "Aprobado por".
    // (La firma del contrato va en el formato del contrato, no en este recuadro.)
    const data: Record<string, any> = { ...(solicitud.data ?? {}) };
    if (accion === "autorizar_gp") {
      data.autorizadoNombre = user?.nombre ?? "";
      data.autorizadoCargo = user?.cargo ?? "";
    } else if (accion === "aprobar_gerencia") {
      data.aprobadoNombre = user?.nombre ?? "";
      data.aprobadoCargo = user?.cargo ?? "";
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
    const observacion =
      `Póliza del contrato · Solicitud jurídica N.º ${solicitud.solicitudId}` +
      (objeto ? ` — ${objeto}` : "");

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
      });
    } catch (e: any) {
      await this.registrarResultadoPoliza(solicitud.solicitudId, {
        error: e?.message ?? "No se pudo crear la requisición en Compras.",
        fecha: new Date().toISOString(),
      });
      throw e;
    }
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
    const esPmo = rol === ROL_PMO;

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
    const esPmo = rol === ROL_PMO;

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
