import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, Repository, IsNull } from "typeorm";
import { CregMunicipioConfig } from "../../database/entities/creg-municipio-config.entity";
import { CregParametrizacion } from "../../database/entities/creg-parametrizacion.entity";
import { CregIppMensual } from "../../database/entities/creg-ipp-mensual.entity";
import { CregCenso } from "../../database/entities/creg-censo.entity";
import { CregLiquidacion } from "../../database/entities/creg-liquidacion.entity";
import { CregIddOff } from "../../database/entities/creg-idd-off.entity";
import { CregFacturaEnergia } from "../../database/entities/creg-factura-energia.entity";
import { CregIddOn } from "../../database/entities/creg-idd-on.entity";
import { Ucap } from "../../database/entities/ucap.entity";
import { UcapCostItem } from "../../database/entities/ucap-cost-item.entity";
import { UcapApellido } from "../../database/entities/ucap-apellido.entity";
import { Company } from "../../database/entities/company.entity";
import { Project } from "../../database/entities/project.entity";
import { User } from "../../database/entities/user.entity";
import { SurveyReviewerAccess } from "../../database/entities/survey-reviewer-access.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { ROLE_NAMES } from "../../common/constants/roles.constants";
import {
  CreateCregUnitDto,
  SaveCregCensoDto,
  SaveCregLiquidacionDto,
  SaveCregIddOffDto,
  SaveCregFacturaEnergiaDto,
  SaveCregIddOnDto,
  SaveCregParametrizacionDto,
  SaveCregIppMensualDto,
  SaveUcapCostSheetDto,
  UpsertCregConfigDto,
} from "./dto";

/**
 * Hojas del modulo que se llevan mes a mes y se pueden cerrar. Las tres guardan
 * su contenido en `data.meses[YYYY-MM]`, asi que comparten el mismo candado.
 */
export type HojaMensual = "liquidacion" | "idd-off" | "idd-on";

/** Una columna del comparador: el municipio, sea empresa o proyecto de Canales. */
export interface ComparadorMunicipio {
  /** `companyId:projectId` (0 si no hay proyecto). Es la llave de `valores`. */
  clave: string;
  companyId: number;
  projectId: number | null;
  nombre: string;
}

/** Lo que un municipio tiene cargado para un elemento. */
export interface ComparadorCelda {
  valor: number | null;
  /** El código local. Cada contrato numeró su catálogo aparte, así que difiere. */
  code: string;
  /** El texto tal como está escrito allí, que rara vez coincide letra a letra. */
  descripcion: string;
}

/** Una fila del comparador: un elemento visto en todos los municipios. */
export interface ComparadorFila {
  /** Descripción normalizada. Es la llave con la que se cruzan los municipios. */
  clave: string;
  /** La descripción más frecuente, para mostrarla como nombre del elemento. */
  elemento: string;
  grupo: string | null;
  /** Lo cargado en cada municipio. Ausente = ese municipio no lo tiene. */
  celdas: Record<string, ComparadorCelda>;
  /** En cuántos municipios existe. */
  presentes: number;
  minimo: number | null;
  maximo: number | null;
  /** Cuántas veces cabe el menor en el mayor. `null` si está en un solo municipio. */
  veces: number | null;
}

export interface CregComparador {
  municipios: ComparadorMunicipio[];
  filas: ComparadorFila[];
}

/**
 * Empresas que existen en la base pero por las que no se opera.
 *
 * Pueblorico (11), Ciudad Bolívar (12), Tarso (13) y Jericó (14) se manejan como
 * proyectos de Canales & Contactos; Jamundí (5) solo tiene centro de costo. El
 * frontend ya las esconde de sus selectores (`EMPRESAS_OCULTAS` en
 * `master-data.service.ts`); si alguna de las dos listas cambia, hay que mover
 * la otra.
 */
const EMPRESAS_SIN_OPERACION = new Set([5, 11, 12, 13, 14]);

/**
 * La descripción, reducida a lo que identifica al elemento.
 *
 * Es la llave con la que se cruzan los municipios, porque el código NO sirve:
 * cada contrato numeró su catálogo por su cuenta y el mismo PROP-020 es una
 * luminaria en un municipio y un poste en otro. Lo que sí se repite —con otras
 * mayúsculas, otras tildes y a veces una coletilla— es el texto.
 *
 * Se quitan «EXISTENTE» y «NUEVA» porque describen el estado del elemento, no el
 * elemento: la misma luminaria de sodio 70 W aparece de las dos formas y son la
 * misma cosa a efectos de comparar su costo.
 */
export const normalizarDescripcion = (texto: string): string =>
  (texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s*\((estadio|siniestro)\)\s*/g, " ")
    .replace(/\s+(existentes?|nuevas?|nuevo)\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();

const DEFAULT_CONFIG = {
  pctTransport: 0,
  pctEngineering: 15,
  pctAdministration: 2,
  pctInspection: 7,
  pctInterventoria: 7,
  pctFinancial: 11.3,
  pctRetieRetilap: 0,
  pctEnvironmental: 0,
  ippBase: null as number | null,
  ippCurrent: null as number | null,
};

@Injectable()
export class CregService {
  constructor(
    @InjectRepository(CregMunicipioConfig)
    private readonly configRepo: Repository<CregMunicipioConfig>,
    @InjectRepository(CregParametrizacion)
    private readonly paramRepo: Repository<CregParametrizacion>,
    @InjectRepository(CregIppMensual)
    private readonly ippRepo: Repository<CregIppMensual>,
    @InjectRepository(CregCenso)
    private readonly censoRepo: Repository<CregCenso>,
    @InjectRepository(CregLiquidacion)
    private readonly liquidacionRepo: Repository<CregLiquidacion>,
    @InjectRepository(CregIddOff)
    private readonly iddOffRepo: Repository<CregIddOff>,
    @InjectRepository(CregFacturaEnergia)
    private readonly facturaEnergiaRepo: Repository<CregFacturaEnergia>,
    @InjectRepository(CregIddOn)
    private readonly iddOnRepo: Repository<CregIddOn>,
    @InjectRepository(Ucap)
    private readonly ucapRepo: Repository<Ucap>,
    @InjectRepository(UcapCostItem)
    private readonly itemRepo: Repository<UcapCostItem>,
    @InjectRepository(UcapApellido)
    private readonly apellidoRepo: Repository<UcapApellido>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SurveyReviewerAccess)
    private readonly accessRepo: Repository<SurveyReviewerAccess>,
    private readonly notifications: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  private readonly logger = new Logger(CregService.name);

  /**
   * IPP base del municipio: el del proyecto si existe, si no el de la empresa.
   */
  private async getCompanyIppBase(
    companyId: number,
    projectId?: number | null,
  ): Promise<number | null> {
    if (projectId) {
      const project = await this.projectRepo.findOne({ where: { projectId } });
      if (project?.ippInitialValue != null) return Number(project.ippInitialValue);
    }
    const company = await this.companyRepo.findOne({ where: { companyId } });
    return company?.ippInitialValue != null ? Number(company.ippInitialValue) : null;
  }

  // ============ Configuracion por municipio ============

  /** Convierte a numero finito; devuelve null si no lo es (permite el valor 0). */
  private toNum(v: unknown): number | null {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }

  /**
   * Porcentajes de costos indirectos del municipio.
   * Prioridad por campo: hoja de PARAMETROS > config del municipio > default.
   */
  private async resolvePcts(companyId: number, projectId: number | null) {
    const param = await this.paramRepo.findOne({
      where: { companyId, projectId: projectId ?? IsNull() },
    });
    const config = await this.configRepo.findOne({
      where: { companyId, projectId: projectId ?? IsNull() },
    });
    const p: Record<string, any> = param?.data ?? {};

    // Mapeo Parametros -> hoja de costos (los que tambien viven en la config vieja)
    const KEYS = {
      pctEngineering: "costoIngenieria",
      pctAdministration: "costoAdministracion",
      pctInspection: "costoInspectores",
      pctInterventoria: "costoInterventoria",
      pctFinancial: "costosFinancieros",
    } as const;

    const pick = (field: keyof typeof KEYS): number => {
      const fromParam = this.toNum(p[KEYS[field]]);
      if (fromParam !== null) return fromParam;
      const fromConfig = config ? this.toNum(config[field]) : null;
      if (fromConfig !== null) return fromConfig;
      return DEFAULT_CONFIG[field];
    };

    // Indirectos que solo existen en Parametros (sin columna en la config vieja).
    const EXTRA_KEYS = ["costoTransporte", "costoRetieRetilap", "costosAmbientalesDisposicion"];
    const pctTransport = this.toNum(p["costoTransporte"]) ?? DEFAULT_CONFIG.pctTransport;
    const pctRetieRetilap =
      this.toNum(p["costoRetieRetilap"]) ?? DEFAULT_CONFIG.pctRetieRetilap;
    const pctEnvironmental =
      this.toNum(p["costosAmbientalesDisposicion"]) ?? DEFAULT_CONFIG.pctEnvironmental;

    const fromParametros =
      Object.values(KEYS).some((k) => this.toNum(p[k]) !== null) ||
      EXTRA_KEYS.some((k) => this.toNum(p[k]) !== null);

    return {
      config,
      fromParametros,
      pctTransport,
      pctEngineering: pick("pctEngineering"),
      pctAdministration: pick("pctAdministration"),
      pctInspection: pick("pctInspection"),
      pctInterventoria: pick("pctInterventoria"),
      pctFinancial: pick("pctFinancial"),
      pctRetieRetilap,
      pctEnvironmental,
    };
  }

  async getConfig(companyId: number, projectId?: number | null) {
    const companyIppBase = await this.getCompanyIppBase(companyId, projectId);
    const resolved = await this.resolvePcts(companyId, projectId ?? null);
    const config = resolved.config;

    return {
      configId: config?.configId,
      companyId,
      projectId: projectId ?? null,
      pctTransport: resolved.pctTransport,
      pctEngineering: resolved.pctEngineering,
      pctAdministration: resolved.pctAdministration,
      pctInspection: resolved.pctInspection,
      pctInterventoria: resolved.pctInterventoria,
      pctFinancial: resolved.pctFinancial,
      pctRetieRetilap: resolved.pctRetieRetilap,
      pctEnvironmental: resolved.pctEnvironmental,
      /** true si al menos un % proviene de la hoja de Parametros. */
      fromParametros: resolved.fromParametros,
      // El IPP base siempre proviene del municipio/proyecto (no editable).
      ippBase: companyIppBase,
      ippCurrent: config?.ippCurrent != null ? Number(config.ippCurrent) : null,
      companyIppBase,
      exists: !!config,
    };
  }

  async upsertConfig(
    companyId: number,
    projectId: number | null,
    dto: UpsertCregConfigDto,
  ) {
    let config = await this.configRepo.findOne({
      where: { companyId, projectId: projectId ?? IsNull() },
    });
    if (!config) {
      config = this.configRepo.create({ companyId, projectId: projectId ?? null });
    }
    config.pctEngineering = dto.pctEngineering;
    config.pctAdministration = dto.pctAdministration;
    config.pctInspection = dto.pctInspection;
    config.pctInterventoria = dto.pctInterventoria;
    config.pctFinancial = dto.pctFinancial;
    config.ippBase = dto.ippBase ?? null;
    config.ippCurrent = dto.ippCurrent ?? null;
    await this.configRepo.save(config);
    return this.getConfig(companyId, projectId);
  }

  // ============ Parametrizacion por municipio ============

  async getParametrizacion(companyId: number, projectId?: number | null) {
    const row = await this.paramRepo.findOne({
      where: { companyId, projectId: projectId ?? IsNull() },
    });
    return {
      companyId,
      projectId: projectId ?? null,
      data: row?.data ?? null,
      exists: !!row,
    };
  }

  async saveParametrizacion(
    companyId: number,
    projectId: number | null,
    dto: SaveCregParametrizacionDto,
  ) {
    let row = await this.paramRepo.findOne({
      where: { companyId, projectId: projectId ?? IsNull() },
    });
    if (!row) {
      row = this.paramRepo.create({ companyId, projectId: projectId ?? null });
    }
    row.data = dto.data ?? {};
    await this.paramRepo.save(row);
    return this.getParametrizacion(companyId, projectId);
  }

  // ============ IPP mensual (global) ============

  /**
   * Toda la serie del IPP como { 'YYYY-MM': valor }.
   * No recibe municipio: el índice lo publica el DANE y es el mismo para todos.
   */
  async getIppMensual(): Promise<{ valores: Record<string, number> }> {
    const filas = await this.ippRepo.find({ order: { ym: "ASC" } });
    const valores: Record<string, number> = {};
    for (const f of filas) valores[f.ym] = Number(f.valor);
    return { valores };
  }

  /**
   * Reemplaza la serie completa. Los meses que no vengan en `valores` se borran,
   * que es como el frontend representa "esta casilla quedó vacía".
   */
  async saveIppMensual(dto: SaveCregIppMensualDto) {
    const entrada = dto.valores ?? {};
    const limpios = new Map<string, number>();
    for (const [ym, raw] of Object.entries(entrada)) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) {
        throw new BadRequestException(`Mes inválido: "${ym}" (se espera AAAA-MM)`);
      }
      const n = Number(raw);
      if (raw === null || raw === undefined || String(raw).trim() === "" || Number.isNaN(n)) {
        continue; // casilla vacía: no se guarda
      }
      limpios.set(ym, n);
    }

    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(CregIppMensual);
      const existentes = await repo.find();
      const porMes = new Map(existentes.map((f) => [f.ym, f]));

      const sobran = existentes.filter((f) => !limpios.has(f.ym));
      if (sobran.length > 0) await repo.remove(sobran);

      const guardar: CregIppMensual[] = [];
      for (const [ym, valor] of limpios) {
        const fila = porMes.get(ym);
        if (fila) {
          if (fila.valor !== valor) { fila.valor = valor; guardar.push(fila); }
        } else {
          guardar.push(repo.create({ ym, valor }));
        }
      }
      if (guardar.length > 0) await repo.save(guardar);
    });

    return this.getIppMensual();
  }

  // ============ Censo fisico por municipio ============

  async getCenso(companyId: number, projectId?: number | null) {
    const row = await this.censoRepo.findOne({
      where: { companyId, projectId: projectId ?? IsNull() },
    });
    return {
      companyId,
      projectId: projectId ?? null,
      data: row?.data ?? null,
      exists: !!row,
    };
  }

  async saveCenso(
    companyId: number,
    projectId: number | null,
    dto: SaveCregCensoDto,
  ) {
    let row = await this.censoRepo.findOne({
      where: { companyId, projectId: projectId ?? IsNull() },
    });
    if (!row) {
      row = this.censoRepo.create({ companyId, projectId: projectId ?? null });
    }
    row.data = dto.data ?? {};
    await this.censoRepo.save(row);
    return this.getCenso(companyId, projectId);
  }

  // ============ Facturas de energia del municipio ============

  /**
   * Facturas del comercializador, una por mes. No tienen cierre mensual como la
   * liquidacion o los ID: una factura es un documento externo, no un calculo que
   * se apruebe, asi que se guarda sin pasar por `guardarHoja`.
   */
  async getFacturaEnergia(companyId: number, projectId?: number | null) {
    const row = await this.facturaEnergiaRepo.findOne({
      where: { companyId, projectId: projectId ?? IsNull() },
    });
    return {
      companyId,
      projectId: projectId ?? null,
      data: row?.data ?? null,
      exists: !!row,
    };
  }

  async saveFacturaEnergia(
    companyId: number,
    projectId: number | null,
    dto: SaveCregFacturaEnergiaDto,
  ) {
    let row = await this.facturaEnergiaRepo.findOne({
      where: { companyId, projectId: projectId ?? IsNull() },
    });
    if (!row) {
      row = this.facturaEnergiaRepo.create({ companyId, projectId: projectId ?? null });
    }
    row.data = dto.data ?? {};
    await this.facturaEnergiaRepo.save(row);
    return this.getFacturaEnergia(companyId, projectId);
  }

  // ============ Liquidacion mensual por municipio ============

  async getLiquidacion(companyId: number, projectId?: number | null) {
    const row = await this.liquidacionRepo.findOne({
      where: { companyId, projectId: projectId ?? IsNull() },
    });
    return {
      companyId,
      projectId: projectId ?? null,
      data: row?.data ?? null,
      exists: !!row,
    };
  }

  /** El IPP(m-1) del mes liquidado es potestad del Director Tecnico. */
  private readonly ROL_IPP = ROLE_NAMES.DIRECTOR_TECNICO;

  private async getRolDe(userId: number): Promise<string> {
    const user = await this.userRepo.findOne({
      where: { userId },
      relations: ["role"],
    });
    return user?.role?.nombreRol?.trim() ?? "";
  }

  /** Compara IPPs tolerando null/undefined/string ("187.43" == 187.43). */
  private mismoIpp(a: unknown, b: unknown): boolean {
    const n = (v: unknown) =>
      v === null || v === undefined || v === "" ? null : Number(v);
    const na = n(a);
    const nb = n(b);
    if (na === null || nb === null) return na === nb;
    return Math.abs(na - nb) < 1e-9;
  }

  async saveLiquidacion(
    companyId: number,
    projectId: number | null,
    dto: SaveCregLiquidacionDto,
    userId?: number,
  ) {
    const row = await this.filaHoja("liquidacion", companyId, projectId);

    // Candado propio de la Liquidacion: el IPP(m-1) solo lo mueve el Director
    // Tecnico. Va aqui y no en la pantalla porque el front puede omitirse.
    const guardados: Record<string, any> = row.data?.meses ?? {};
    const entrantes: Record<string, any> = dto.data?.meses ?? {};
    const cambiaIpp = Object.keys(entrantes).some(
      (ym) => !this.mismoIpp(entrantes[ym]?.ippMes, guardados[ym]?.ippMes),
    );
    if (cambiaIpp) {
      const rol = userId ? await this.getRolDe(userId) : "";
      if (rol !== this.ROL_IPP) {
        throw new ForbiddenException(
          `El IPP(m-1) del mes liquidado solo lo puede modificar el ${this.ROL_IPP}.`,
        );
      }
    }

    return this.guardarHoja("liquidacion", companyId, projectId, dto.data);
  }

  // ============ Aprobacion de un mes (Liquidacion / ID OFF / ID ON) ============

  /**
   * Las tres hojas mensuales del modulo se cierran igual: el Director Tecnico
   * aprueba un mes, ese mes queda congelado y se le avisa por correo al Director
   * de Proyecto del municipio. La regla vive una sola vez aqui.
   */
  private hojaDe(hoja: HojaMensual): {
    repo: Repository<any>;
    label: string;
    /** Que queda bloqueado, para decirlo en el correo. */
    detalle: string;
  } {
    switch (hoja) {
      case "liquidacion":
        return {
          repo: this.liquidacionRepo,
          label: "Liquidación",
          detalle: "el IPP(m-1) y los ajustes",
        };
      case "idd-off":
        return {
          repo: this.iddOffRepo,
          label: "ID OFF (apagadas)",
          detalle: "la potencia instalada (WT), las horas del periodo (T) y las fallas",
        };
      case "idd-on":
        return {
          repo: this.iddOnRepo,
          label: "ID ON (encendidas)",
          detalle:
            "la potencia instalada (WT), las horas del periodo (T), la tarifa (TEEn) y las encendidas",
        };
    }
  }

  private async filaHoja(
    hoja: HojaMensual,
    companyId: number,
    projectId: number | null,
  ): Promise<{ data: any; [k: string]: any }> {
    const { repo } = this.hojaDe(hoja);
    const row = await repo.findOne({
      where: { companyId, projectId: projectId ?? IsNull() },
    });
    return row ?? repo.create({ companyId, projectId: projectId ?? null, data: null });
  }

  private async leerHoja(
    hoja: HojaMensual,
    companyId: number,
    projectId: number | null,
  ) {
    const { repo } = this.hojaDe(hoja);
    const row = await repo.findOne({
      where: { companyId, projectId: projectId ?? IsNull() },
    });
    return {
      companyId,
      projectId: projectId ?? null,
      data: row?.data ?? null,
      exists: !!row,
    };
  }

  /**
   * Guarda la hoja conservando los meses ya aprobados: gana lo guardado, venga
   * lo que venga (incluso si el payload omite el mes, que lo borraria).
   */
  private async guardarHoja(
    hoja: HojaMensual,
    companyId: number,
    projectId: number | null,
    data: Record<string, any> | undefined,
  ) {
    const { repo } = this.hojaDe(hoja);
    const row = await this.filaHoja(hoja, companyId, projectId);

    const guardados: Record<string, any> = row.data?.meses ?? {};
    const meses: Record<string, any> = { ...((data?.meses ?? {}) as object) };
    const congelados: string[] = [];
    for (const [ym, mes] of Object.entries(guardados)) {
      if (mes?.aprobado) {
        meses[ym] = mes;
        congelados.push(ym);
      }
    }

    row.data = { ...(data ?? {}), meses };
    await repo.save(row);
    const res = await this.leerHoja(hoja, companyId, projectId);
    return { ...res, congelados };
  }

  /**
   * Aprueba y cierra un mes. "Director de Proyecto responsable del municipio" se
   * resuelve con survey_reviewer_access, que es donde ya vive el alcance por
   * departamento de cada Director de Proyecto (los roles son "Director de
   * Proyecto Antioquia", "... Valle", etc.).
   */
  async aprobarMes(
    hoja: HojaMensual,
    companyId: number,
    projectId: number | null,
    ym: string,
    userId: number,
  ) {
    const { repo, label, detalle } = this.hojaDe(hoja);

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym ?? "")) {
      throw new BadRequestException("Mes invalido: se espera YYYY-MM.");
    }

    const user = await this.userRepo.findOne({
      where: { userId },
      relations: ["role"],
    });
    if ((user?.role?.nombreRol?.trim() ?? "") !== ROLE_NAMES.DIRECTOR_TECNICO) {
      throw new ForbiddenException(
        `Solo el ${ROLE_NAMES.DIRECTOR_TECNICO} puede aprobar el mes.`,
      );
    }

    const row = await repo.findOne({
      where: { companyId, projectId: projectId ?? IsNull() },
    });
    if (!row) {
      throw new NotFoundException(
        `Este municipio todavia no tiene ${label} guardada: guarda el mes antes de aprobarlo.`,
      );
    }
    const meses: Record<string, any> = row.data?.meses ?? {};
    if (meses[ym]?.aprobado) {
      throw new BadRequestException("Ese mes ya estaba aprobado.");
    }

    meses[ym] = {
      ...(meses[ym] ?? {}),
      aprobado: true,
      aprobadoEn: new Date().toISOString(),
      aprobadoPor: userId,
      aprobadoPorNombre: user?.nombre ?? null,
    };
    row.data = { ...(row.data ?? {}), meses };
    await repo.save(row);

    const notificados = await this.notificarMesAprobado(
      companyId,
      projectId,
      ym,
      user,
      label,
      detalle,
    );

    const res = await this.leerHoja(hoja, companyId, projectId);
    return { ...res, notificados };
  }

  /**
   * Reabre un mes cerrado. Solo el Director Tecnico, el mismo que lo aprobo.
   *
   * Guarda quien y cuando reabrio en `reaperturas[]` en vez de borrar el rastro:
   * un mes que se cerro y se volvio a abrir es justo lo que hay que poder
   * auditar despues.
   */
  async reabrirMes(
    hoja: HojaMensual,
    companyId: number,
    projectId: number | null,
    ym: string,
    userId: number,
    motivo?: string,
  ) {
    const { repo, label } = this.hojaDe(hoja);

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym ?? "")) {
      throw new BadRequestException("Mes invalido: se espera YYYY-MM.");
    }

    const user = await this.userRepo.findOne({
      where: { userId },
      relations: ["role"],
    });
    if ((user?.role?.nombreRol?.trim() ?? "") !== ROLE_NAMES.DIRECTOR_TECNICO) {
      throw new ForbiddenException(
        `Solo el ${ROLE_NAMES.DIRECTOR_TECNICO} puede reabrir un mes cerrado.`,
      );
    }

    const row = await repo.findOne({
      where: { companyId, projectId: projectId ?? IsNull() },
    });
    const meses: Record<string, any> = row?.data?.meses ?? {};
    if (!row || !meses[ym]?.aprobado) {
      throw new BadRequestException(`Ese mes no esta aprobado en ${label}.`);
    }

    const {
      aprobado: _ap,
      aprobadoEn,
      aprobadoPor,
      aprobadoPorNombre,
      ...resto
    } = meses[ym];
    meses[ym] = {
      ...resto,
      reaperturas: [
        ...(resto.reaperturas ?? []),
        {
          aprobadoEn,
          aprobadoPor,
          aprobadoPorNombre,
          reabiertoEn: new Date().toISOString(),
          reabiertoPor: userId,
          reabiertoPorNombre: user?.nombre ?? null,
          motivo: motivo?.trim() || null,
        },
      ],
    };
    row.data = { ...(row.data ?? {}), meses };
    await repo.save(row);

    this.logger.warn(
      `${label} ${ym} (company ${companyId}, project ${projectId ?? "-"}) reabierta por ${user?.nombre ?? userId}${motivo ? `: ${motivo}` : ""}`,
    );

    return this.leerHoja(hoja, companyId, projectId);
  }

  /** Directores de Proyecto con alcance sobre este municipio. */
  private async directoresDelMunicipio(
    companyId: number,
    projectId: number | null,
  ): Promise<User[]> {
    const accesos = await this.accessRepo.find({
      where: projectId
        ? [{ projectId }, { companyId, projectId: IsNull() }]
        : [{ companyId }],
      relations: ["user", "user.role"],
    });
    const vistos = new Set<number>();
    const out: User[] = [];
    for (const a of accesos) {
      const u = a.user;
      if (!u || u.estado === false || vistos.has(u.userId)) continue;
      if (!(u.role?.nombreRol ?? "").startsWith(ROLE_NAMES.DIRECTOR_PROYECTO)) continue;
      vistos.add(u.userId);
      out.push(u);
    }
    return out;
  }

  private async notificarMesAprobado(
    companyId: number,
    projectId: number | null,
    ym: string,
    aprobador: User | null,
    hojaLabel: string,
    detalle: string,
  ): Promise<string[]> {
    const [company, project, directores] = await Promise.all([
      this.companyRepo.findOne({ where: { companyId } }),
      projectId
        ? this.projectRepo.findOne({ where: { projectId } })
        : Promise.resolve(null),
      this.directoresDelMunicipio(companyId, projectId),
    ]);

    const municipio = [company?.name, project?.name].filter(Boolean).join(" — ");
    const MESES = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ];
    const [anio, mes] = ym.split("-").map(Number);
    const periodo = `${MESES[mes - 1]} de ${anio}`;

    if (directores.length === 0) {
      this.logger.warn(
        `${hojaLabel} ${ym} de ${municipio} aprobada, pero no hay Director de Proyecto con acceso al municipio: nadie fue notificado.`,
      );
      return [];
    }

    const enviados: string[] = [];
    for (const d of directores) {
      const to = d.emailNotificacion || d.email;
      if (!to) continue;
      try {
        await this.notifications.sendEmail({
          to,
          subject: `${hojaLabel} CREG aprobada · ${municipio} · ${periodo}`,
          html: `
            <div style="font-family:Arial,sans-serif;color:#1f2937">
              <p>Hola ${d.nombre ?? ""},</p>
              <p>La hoja <b>${hojaLabel}</b> de <b>${periodo}</b> de <b>${municipio}</b>
                 fue <b>aprobada</b> por ${aprobador?.nombre ?? "el Director Técnico"}.</p>
              <p>Ese mes queda cerrado: ${detalle} ya no se pueden modificar.</p>
              <p style="color:#6b7280;font-size:12px">
                Mensaje automático del Sistema de Gestión Empresarial · módulo CREG.
              </p>
            </div>`,
        });
        enviados.push(to);
      } catch (e: any) {
        // El correo no debe tumbar la aprobacion: ya quedo guardada.
        this.logger.error(
          `No se pudo notificar a ${to} la aprobacion de ${ym} (${hojaLabel}, ${municipio}): ${e?.message}`,
        );
      }
    }
    return enviados;
  }

  // ============ IDD OFF (indice de disponibilidad, apagadas) ============

  async getIddOff(companyId: number, projectId?: number | null) {
    const row = await this.iddOffRepo.findOne({
      where: { companyId, projectId: projectId ?? IsNull() },
    });
    return {
      companyId,
      projectId: projectId ?? null,
      data: row?.data ?? null,
      exists: !!row,
    };
  }

  async saveIddOff(
    companyId: number,
    projectId: number | null,
    dto: SaveCregIddOffDto,
  ) {
    return this.guardarHoja("idd-off", companyId, projectId, dto.data);
  }

  // ============ ID ON (indice de disponibilidad, encendidas) ============

  async getIddOn(companyId: number, projectId?: number | null) {
    const row = await this.iddOnRepo.findOne({
      where: { companyId, projectId: projectId ?? IsNull() },
    });
    return {
      companyId,
      projectId: projectId ?? null,
      data: row?.data ?? null,
      exists: !!row,
    };
  }

  async saveIddOn(
    companyId: number,
    projectId: number | null,
    dto: SaveCregIddOnDto,
  ) {
    return this.guardarHoja("idd-on", companyId, projectId, dto.data);
  }

  // ============ Resumen agregado (dashboard) ============

  /**
   * Resumen de UCAPs con hoja de costos agrupadas por municipio (empresa/proyecto).
   * Devuelve totales globales y el desglose por municipio.
   */
  async getSummary() {
    const ucaps = await this.ucapRepo.find({
      where: { isActive: true },
      relations: ["costItems", "company", "project"],
    });

    const withSheet = ucaps.filter((u) => (u.costItems || []).length > 0);

    // Agrupar por municipio: proyecto (Canales) o empresa.
    const map = new Map<
      string,
      { companyId: number; projectId: number | null; name: string; count: number; value: number }
    >();

    for (const u of withSheet) {
      const key = `${u.companyId}:${u.projectId ?? 0}`;
      const name = u.projectId
        ? u.project?.name ?? `Proyecto ${u.projectId}`
        : u.company?.name ?? `Empresa ${u.companyId}`;
      const entry =
        map.get(key) ??
        { companyId: u.companyId, projectId: u.projectId ?? null, name, count: 0, value: 0 };
      entry.count += 1;
      entry.value += Number(u.roundedValue) || 0;
      map.set(key, entry);
    }

    const byMunicipio = Array.from(map.values()).sort((a, b) => b.value - a.value);
    const totalValue = byMunicipio.reduce((s, m) => s + m.value, 0);

    return {
      totalUcapsAll: ucaps.length,
      totalUcaps: withSheet.length,
      totalValue,
      municipios: byMunicipio.length,
      byMunicipio,
    };
  }

  // ============ Comparador entre municipios ============

  /**
   * El mismo elemento, municipio por municipio.
   *
   * Se cruza por DESCRIPCIÓN, no por código. El código no identifica nada entre
   * contratos: de los 93 códigos presentes en varios municipios, 92 designan
   * elementos distintos —PROP-020 es una luminaria en Ciudad Bolívar, un
   * proyector en Jericó y un poste en Pueblo Rico—, así que una matriz por
   * código enfrentaría un brazo galvanizado contra un proyector de 900 W y
   * llamaría «diferencia» al resultado. Lo que sí se repite es el texto.
   *
   * Puesto así, la fila dice algo real: la misma luminaria de sodio 70 W está en
   * nueve municipios entre 331 mil y 582 mil pesos, y esa diferencia es una
   * pregunta que alguien puede responder.
   *
   * Se compara `roundedValue` —total con indirectos, SIN IPP— a propósito. El
   * valor final lleva el factor IPP de cada municipio, que es una diferencia
   * legítima y esperada; incluirla aquí escondería las diferencias de costo,
   * que son las que se buscan.
   */
  async getComparador(): Promise<CregComparador> {
    const todas = await this.ucapRepo.find({
      where: { isActive: true },
      relations: ["company", "project"],
    });

    // Fuera las empresas por las que no se opera. Pueblorico, Ciudad Bolívar,
    // Tarso y Jericó existen como empresa pero se manejan como proyectos de
    // Canales & Contactos, y Jamundí no tiene operación; el frontend ya las
    // esconde de todos sus selectores (`EMPRESAS_OCULTAS`). Aquí no basta con no
    // pintarlas: si entraran al cálculo, el mínimo y el máximo de una fila
    // podrían salir de un municipio que la pantalla no muestra, y la columna
    // «veces» señalaría una diferencia que nadie puede ver.
    const ucaps = todas.filter((u) => !EMPRESAS_SIN_OPERACION.has(u.companyId));

    // Un municipio es la empresa, salvo en Canales & Contactos, que opera varios
    // como proyectos. Es la misma regla de `getSummary`.
    const claveDe = (u: Ucap) => `${u.companyId}:${u.projectId ?? 0}`;
    const municipios = new Map<string, ComparadorMunicipio>();
    for (const u of ucaps) {
      const clave = claveDe(u);
      if (municipios.has(clave)) continue;
      municipios.set(clave, {
        clave,
        companyId: u.companyId,
        projectId: u.projectId ?? null,
        nombre: u.projectId
          ? u.project?.name ?? `Proyecto ${u.projectId}`
          : u.company?.name ?? `Empresa ${u.companyId}`,
      });
    }

    const filas = new Map<string, ComparadorFila>();
    // Cuántas veces se escribió cada variante del texto, para quedarse con la más
    // usada como nombre del elemento en vez de con la primera que aparezca.
    const variantes = new Map<string, Map<string, number>>();

    for (const u of ucaps) {
      const descripcion = (u.description ?? "").trim();
      const clave = normalizarDescripcion(descripcion);
      if (!clave) continue;

      let fila = filas.get(clave);
      if (!fila) {
        fila = {
          clave,
          elemento: descripcion,
          grupo: u.grupo?.trim() || null,
          celdas: {},
          presentes: 0,
          minimo: null,
          maximo: null,
          veces: null,
        };
        filas.set(clave, fila);
        variantes.set(clave, new Map());
      }
      if (!fila.grupo) fila.grupo = u.grupo?.trim() || null;

      const cuenta = variantes.get(clave)!;
      cuenta.set(descripcion, (cuenta.get(descripcion) ?? 0) + 1);

      const valor = Number(u.roundedValue);
      // Si un municipio tuviera dos UCAP para el mismo elemento —dos códigos que
      // describen lo mismo—, se conserva la de mayor valor: dejar la última que
      // pase por el bucle haría que el resultado dependiera del orden de lectura.
      const claveMunicipio = claveDe(u);
      const previa = fila.celdas[claveMunicipio];
      const nuevo = Number.isFinite(valor) ? valor : null;
      if (!previa || (nuevo ?? 0) > (previa.valor ?? 0)) {
        fila.celdas[claveMunicipio] = {
          valor: nuevo,
          code: (u.code ?? "").trim(),
          descripcion,
        };
      }
    }

    for (const fila of filas.values()) {
      const cuenta = variantes.get(fila.clave)!;
      fila.elemento = [...cuenta.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"),
      )[0][0];

      const valores = Object.values(fila.celdas)
        .map((c) => c.valor)
        .filter((v): v is number => v !== null && v > 0);
      fila.presentes = Object.keys(fila.celdas).length;
      if (valores.length > 0) {
        fila.minimo = Math.min(...valores);
        fila.maximo = Math.max(...valores);
        // Cuántas veces cabe el menor en el mayor: la medida de cuánto se
        // separan los municipios en el precio del mismo elemento.
        fila.veces =
          valores.length > 1 && fila.minimo > 0
            ? Number((fila.maximo / fila.minimo).toFixed(2))
            : null;
      }
    }

    return {
      municipios: [...municipios.values()].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es"),
      ),
      filas: [...filas.values()].sort(
        (a, b) =>
          b.presentes - a.presentes ||
          (b.veces ?? 0) - (a.veces ?? 0) ||
          a.elemento.localeCompare(b.elemento, "es"),
      ),
    };
  }

  // ============ Hojas de costos (sobre UCAPs) ============

  /**
   * Una UCAP con hoja de costos esta cerrada mientras no la reabran.
   *
   * La hoja alimenta el censo, los presupuestos y la liquidacion: cambiarla
   * mueve valores ya liquidados. Sin hoja no hay nada que proteger.
   */
  private estaBloqueada(ucap: Ucap, tieneHoja: boolean): boolean {
    return tieneHoja && ucap.desbloqueada !== true;
  }

  /** Lanza si la UCAP esta cerrada. `accion` sale en el mensaje. */
  private async assertUcapEditable(ucapId: number, accion: string): Promise<Ucap> {
    const ucap = await this.ucapRepo.findOne({
      where: { ucapId },
      relations: ["costItems"],
    });
    if (!ucap) throw new NotFoundException(`UCAP ${ucapId} no encontrada`);
    if (this.estaBloqueada(ucap, (ucap.costItems || []).length > 0)) {
      throw new ForbiddenException(
        `La UCAP ${ucap.code} tiene hoja de costos y esta cerrada. ` +
        `Solo el ${ROLE_NAMES.DIRECTOR_TECNICO} puede reabrirla para ${accion}.`,
      );
    }
    return ucap;
  }

  /**
   * Reabre una UCAP cerrada para poder editarla. Solo el Director Tecnico.
   * Al guardar la hoja se vuelve a cerrar sola.
   */
  async reabrirUnit(ucapId: number, userId: number) {
    const user = await this.userRepo.findOne({
      where: { userId },
      relations: ["role"],
    });
    if ((user?.role?.nombreRol?.trim() ?? "") !== ROLE_NAMES.DIRECTOR_TECNICO) {
      throw new ForbiddenException(
        `Solo el ${ROLE_NAMES.DIRECTOR_TECNICO} puede reabrir una UCAP.`,
      );
    }

    const ucap = await this.ucapRepo.findOne({
      where: { ucapId },
      relations: ["costItems"],
    });
    if (!ucap) throw new NotFoundException(`UCAP ${ucapId} no encontrada`);
    if ((ucap.costItems || []).length === 0) {
      throw new BadRequestException(
        "Esa UCAP no tiene hoja de costos: ya se puede editar.",
      );
    }
    if (ucap.desbloqueada === true) {
      throw new BadRequestException("Esa UCAP ya estaba abierta.");
    }

    ucap.desbloqueada = true;
    ucap.reabiertaPor = userId;
    ucap.reabiertaEn = new Date();
    await this.ucapRepo.save(ucap);

    this.logger.warn(
      `UCAP ${ucap.code} (${ucapId}) reabierta para edicion por ${user?.nombre ?? userId}`,
    );
    return this.findOne(ucapId);
  }

  /**
   * Lista las UCAPs del municipio que ya tienen hoja de costos CREG definida.
   */
  async findAll(companyId: number, projectId?: number | null) {
    const ucaps = await this.ucapRepo.find({
      where: {
        companyId,
        projectId: projectId ?? IsNull(),
        isActive: true,
      },
      relations: ["costItems", "apellidos"],
      order: { code: "ASC" },
    });
    const base = await this.getCompanyIppBase(companyId, projectId);
    return ucaps
      .filter((u) => (u.costItems || []).length > 0)
      .map((u) => this.serialize(u, base));
  }

  async findOne(ucapId: number) {
    const ucap = await this.ucapRepo.findOne({
      where: { ucapId },
      relations: ["costItems", "apellidos"],
    });
    if (!ucap) {
      throw new NotFoundException(`UCAP ${ucapId} no encontrada`);
    }
    const base = await this.getCompanyIppBase(ucap.companyId, ucap.projectId ?? null);
    return this.serialize(ucap, base);
  }

  /** Valida que no exista otra UCAP con el mismo codigo en el municipio. */
  private async assertCodeIsFree(
    code: string,
    companyId: number,
    projectId: number | null,
  ) {
    const existing = await this.ucapRepo.findOne({
      where: { code, companyId, projectId: projectId ?? IsNull() },
    });
    if (existing) {
      throw new BadRequestException(
        `Ya existe una UCAP con código "${code}" en este municipio`,
      );
    }
  }

  /**
   * Crea la UCAP y guarda su hoja de costos en una sola operación ATÓMICA:
   * si algo falla, no queda una UCAP huérfana ocupando el código.
   */
  async createUnit(dto: CreateCregUnitDto) {
    const code = (dto.code ?? "").trim();
    const description = (dto.description ?? "").trim();
    if (!code) throw new BadRequestException("El código es obligatorio");
    if (!description) throw new BadRequestException("La descripción es obligatoria");

    const company = await this.companyRepo.findOne({
      where: { companyId: dto.companyId },
    });
    if (!company) {
      throw new NotFoundException(`Empresa ${dto.companyId} no encontrada`);
    }

    const projectId = dto.projectId ?? null;
    await this.assertCodeIsFree(code, dto.companyId, projectId);

    const ippBase = await this.getCompanyIppBase(dto.companyId, projectId);

    const ucapId = await this.dataSource.transaction(async (m) => {
      const ucap = m.getRepository(Ucap).create({
        companyId: dto.companyId,
        code,
        description,
        roundedValue: 0,
        initialIpp: dto.initialIpp ?? ippBase ?? 0,
        isActive: true,
        ...(projectId ? { projectId } : {}),
      } as Partial<Ucap> as Ucap);
      // Código/descripción ya quedan seteados; persistSheet aplica el resto.
      await this.persistSheet(m, ucap, dto, ippBase);
      return ucap.ucapId;
    });

    return this.findOne(ucapId);
  }

  /**
   * Guarda la hoja de costos dentro de la UCAP y actualiza su valor (roundedValue)
   * con el TOTAL CON INDIRECTOS (sin IPP). También permite editar el código,
   * la descripción y el IPP inicial de la UCAP desde la misma hoja.
   *
   * El borrado de líneas + guardado van en una TRANSACCIÓN: si el save falla, no
   * se pierde la hoja de costos existente.
   */
  async saveSheet(ucapId: number, dto: SaveUcapCostSheetDto) {
    const ucap = await this.assertUcapEditable(ucapId, "editarla");

    const ippBase = await this.getCompanyIppBase(ucap.companyId, ucap.projectId ?? null);

    // Al guardar se vuelve a cerrar: la reapertura vale para UNA edicion, no
    // deja la UCAP abierta para siempre.
    ucap.desbloqueada = false;

    // ---- Datos de la propia UCAP (editables desde la hoja) ----
    if (dto.code !== undefined) {
      const code = dto.code.trim();
      if (!code) throw new BadRequestException("El código es obligatorio");
      if (code !== ucap.code) {
        await this.assertCodeIsFree(code, ucap.companyId, ucap.projectId ?? null);
        ucap.code = code;
      }
    }
    if (dto.description !== undefined) {
      const description = dto.description.trim();
      if (!description) throw new BadRequestException("La descripción es obligatoria");
      ucap.description = description;
    }

    await this.dataSource.transaction((m) => this.persistSheet(m, ucap, dto, ippBase));
    return this.findOne(ucapId);
  }

  // ============ Apellidos/variantes de una UCAP ============

  private serializeApellido(a: UcapApellido) {
    return {
      apellidoId: a.apellidoId,
      ucapId: a.ucapId,
      apellido: a.apellido,
      sortOrder: a.sortOrder,
    };
  }

  /** Lista los apellidos/variantes de una UCAP, en orden. */
  async listApellidos(ucapId: number) {
    const rows = await this.apellidoRepo.find({
      where: { ucapId },
      order: { sortOrder: "ASC", apellidoId: "ASC" },
    });
    return rows.map((a) => this.serializeApellido(a));
  }

  /**
   * Agrega un apellido/variante a la UCAP (al final del orden).
   *
   * El nombre puede ir vacío: en el censo la fila nace en blanco para escribirla
   * desde cero. Solo se usa para mostrar y buscar, nunca para identificar la
   * variante — de eso se encarga apellidoId — así que no estorba dejarlo así.
   */
  async addApellido(ucapId: number, apellido: string) {
    const ucap = await this.ucapRepo.findOne({ where: { ucapId } });
    if (!ucap) throw new NotFoundException(`UCAP ${ucapId} no encontrada`);
    const name = (apellido ?? "").trim();

    const last = await this.apellidoRepo.findOne({
      where: { ucapId },
      order: { sortOrder: "DESC" },
    });
    const row = this.apellidoRepo.create({
      ucapId,
      apellido: name,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    });
    const saved = await this.apellidoRepo.save(row);
    return this.serializeApellido(saved);
  }

  /** Renombra un apellido/variante. Admite vaciarlo, igual que al crearlo. */
  async renameApellido(apellidoId: number, apellido: string) {
    const row = await this.apellidoRepo.findOne({ where: { apellidoId } });
    if (!row) throw new NotFoundException(`Apellido ${apellidoId} no encontrado`);
    row.apellido = (apellido ?? "").trim();
    const saved = await this.apellidoRepo.save(row);
    return this.serializeApellido(saved);
  }

  /**
   * Elimina un apellido/variante. Idempotente: si la fila ya no existe (borrada
   * antes, doble clic, UI con estado viejo), la operación se considera cumplida
   * en vez de devolver 404 y dejar la fila fantasma atascada en la interfaz.
   */
  async deleteApellido(apellidoId: number) {
    const row = await this.apellidoRepo.findOne({ where: { apellidoId } });
    if (!row) {
      return {
        message: "El apellido ya no existía",
        apellidoId,
        ucapId: null as number | null,
        alreadyGone: true,
      };
    }
    await this.apellidoRepo.delete({ apellidoId });
    return { message: "Apellido eliminado", apellidoId, ucapId: row.ucapId, alreadyGone: false };
  }

  /**
   * Aplica los %/IPP/potencias, reemplaza las líneas y recalcula el valor de la
   * UCAP, todo con el `EntityManager` recibido (dentro de una transacción).
   * No hace lecturas de configuración: el `ippBase` se pasa ya resuelto.
   */
  private async persistSheet(
    m: EntityManager,
    ucap: Ucap,
    dto: SaveUcapCostSheetDto,
    ippBase: number | null,
  ): Promise<void> {
    const ucapRepo = m.getRepository(Ucap);
    const itemRepo = m.getRepository(UcapCostItem);

    if (dto.grupo !== undefined) ucap.grupo = dto.grupo?.trim() || null;
    ucap.pctEngineering = dto.pctEngineering;
    ucap.pctAdministration = dto.pctAdministration;
    ucap.pctInspection = dto.pctInspection;
    ucap.pctInterventoria = dto.pctInterventoria;
    ucap.pctTransport = dto.pctTransport ?? 0;
    ucap.pctFinancial = dto.pctFinancial;
    ucap.pctRetieRetilap = dto.pctRetieRetilap ?? 0;
    ucap.pctEnvironmental = dto.pctEnvironmental ?? 0;
    ucap.ippCurrent = dto.ippCurrent ?? null;
    ucap.ucapMonth = dto.ucapMonth ?? null;
    ucap.ucapYear = dto.ucapYear ?? null;
    ucap.powerNominal = dto.powerNominal ?? null;
    ucap.powerLosses = dto.powerLosses ?? null;
    ucap.efficiencyLmW = dto.efficiencyLmW ?? null;
    // IPP base: el que envía la hoja; si no, el del municipio.
    if (dto.initialIpp != null) ucap.initialIpp = dto.initialIpp;
    else if (ippBase != null) ucap.initialIpp = ippBase;

    // Reemplazar las líneas (sólo si la UCAP ya existía: al crear no hay nada que borrar).
    if (ucap.ucapId) await itemRepo.delete({ ucapId: ucap.ucapId });
    ucap.costItems = dto.items.map((it, idx) =>
      itemRepo.create({
        section: it.section,
        materialId: it.materialId ?? null,
        name: it.name,
        unit: it.unit || "UND",
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        sortOrder: it.sortOrder ?? idx,
      }),
    );

    // Calcular y guardar el valor final (con IPP) como valor de la UCAP
    const totals = this.computeTotals(
      dto.items.map((it) => ({
        section: it.section,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      })),
      {
        transport: dto.pctTransport ?? 0,
        engineering: dto.pctEngineering,
        administration: dto.pctAdministration,
        inspection: dto.pctInspection,
        interventoria: dto.pctInterventoria,
        financial: dto.pctFinancial,
        retieRetilap: dto.pctRetieRetilap ?? 0,
        environmental: dto.pctEnvironmental ?? 0,
      },
      ippBase,
      dto.ippCurrent ?? null,
    );
    // El valor de la UCAP es el TOTAL CON INDIRECTOS (sin aplicar el factor IPP).
    // Sin líneas no hay nada que calcular: se respeta el valor que llegue (o el actual).
    ucap.roundedValue =
      dto.items.length > 0
        ? totals.totalUnit
        : dto.roundedValue ?? (Number(ucap.roundedValue) || 0);

    await ucapRepo.save(ucap);
  }

  /**
   * Elimina la hoja de costos de una UCAP (borra líneas y limpia los %/IPP),
   * sin borrar la UCAP.
   */
  async clearSheet(ucapId: number) {
    // Sin este candado, borrar la hoja seria la puerta de atras para editar una
    // UCAP cerrada: se borra la hoja y queda libre.
    const ucap = await this.assertUcapEditable(ucapId, "borrar su hoja de costos");
    await this.itemRepo.delete({ ucapId });
    // La entidad viene con las líneas cargadas y la relación es cascade: si se
    // guarda así, TypeORM las vuelve a insertar justo después de borrarlas.
    ucap.costItems = [];
    // Sin hoja no hay nada que cerrar: vuelve al estado de una UCAP nueva.
    ucap.desbloqueada = null;
    ucap.reabiertaPor = null;
    ucap.reabiertaEn = null;
    ucap.pctEngineering = null;
    ucap.pctAdministration = null;
    ucap.pctInspection = null;
    ucap.pctInterventoria = null;
    ucap.pctTransport = null;
    ucap.pctFinancial = null;
    ucap.pctRetieRetilap = null;
    ucap.pctEnvironmental = null;
    ucap.ippCurrent = null;
    await this.ucapRepo.save(ucap);
    return { message: "Hoja de costos eliminada" };
  }

  /**
   * Elimina la UCAP por completo (y sus líneas), liberando el código para poder
   * reutilizarlo. Sirve para recuperar UCAPs mal creadas. Si la UCAP está en uso
   * (referenciada por presupuestos/levantamientos), la FK lo impide y se devuelve
   * un error claro en vez de un 500.
   */
  async deleteUnit(ucapId: number) {
    // Igual que clearSheet: borrar tambien es editar.
    await this.assertUcapEditable(ucapId, "eliminarla");
    try {
      await this.dataSource.transaction(async (m) => {
        await m.getRepository(UcapCostItem).delete({ ucapId });
        await m.getRepository(Ucap).delete({ ucapId });
      });
    } catch (err: any) {
      // 23503 = foreign_key_violation (Postgres): la UCAP está referenciada.
      if (err?.code === "23503") {
        throw new BadRequestException(
          "No se puede eliminar la UCAP porque está en uso (presupuestos o levantamientos la referencian).",
        );
      }
      throw err;
    }
    return { message: "UCAP eliminada" };
  }

  // ============ Helpers de cálculo ============

  private computeTotals(
    items: { section: string; quantity: number; unitPrice: number }[],
    pct: {
      transport: number;
      engineering: number;
      administration: number;
      inspection: number;
      interventoria: number;
      financial: number;
      retieRetilap: number;
      environmental: number;
    },
    ippBase: number | null,
    ippCurrent: number | null,
  ) {
    // Como en el Excel: NADA se redondea en el camino. Cada línea conserva su
    // producto exacto (con centavos), los subtotales y los indirectos también,
    // y el redondeo se aplica UNA sola vez, al final, con round (no floor).
    //
    // Antes se redondeaba cada línea y se truncaba el total; eso corría el
    // decimal medio peso y dejaba muchas UCAPs 1 peso cortas frente al Excel
    // (p. ej. 152.380 en vez de 152.381). Verificado contra el Excel en
    // 0010=2.270.244, 0301=152.381, 0404/0405/0406.
    const sum = (section: string) =>
      items
        .filter((it) => it.section === section)
        .reduce((acc, it) => acc + Number(it.quantity) * Number(it.unitPrice), 0);

    const subtotalMaterials = sum("material");
    const subtotalTransporte = sum("transporte");
    const subtotalObraCivil = sum("obra_civil");
    const subtotalMontaje = sum("montaje");
    const subtotalDirectos =
      subtotalMaterials + subtotalTransporte + subtotalObraCivil + subtotalMontaje;

    // Sin redondear: el redondeo se aplica una sola vez, sobre el total.
    const indirect = {
      transport: subtotalDirectos * (pct.transport / 100),
      engineering: subtotalDirectos * (pct.engineering / 100),
      administration: subtotalDirectos * (pct.administration / 100),
      inspection: subtotalDirectos * (pct.inspection / 100),
      interventoria: subtotalDirectos * (pct.interventoria / 100),
      retieRetilap: subtotalDirectos * (pct.retieRetilap / 100),
      financial: subtotalDirectos * (pct.financial / 100),
      environmental: subtotalDirectos * (pct.environmental / 100),
    };
    const totalIndirectos =
      indirect.transport +
      indirect.engineering +
      indirect.administration +
      indirect.inspection +
      indirect.interventoria +
      indirect.retieRetilap +
      indirect.financial +
      indirect.environmental;
    const totalUnit = Math.round(subtotalDirectos + totalIndirectos);
    // Factor IPP = IPP actual / IPP base (actualiza el valor a precios de hoy).
    const ippFactor =
      ippBase && ippCurrent && ippBase !== 0 ? ippCurrent / ippBase : 1;
    const finalValue = Math.round(totalUnit * ippFactor);

    return {
      subtotalMaterials,
      subtotalTransporte,
      subtotalObraCivil,
      subtotalMontaje,
      subtotalDirectos,
      indirect,
      totalIndirectos,
      totalUnit,
      ippFactor,
      finalValue,
    };
  }

  private serialize(ucap: Ucap, ippBase: number | null) {
    const items = (ucap.costItems || [])
      .map((it) => ({
        itemId: it.itemId,
        section: it.section,
        materialId: it.materialId,
        name: it.name,
        unit: it.unit,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        total: Number(it.quantity) * Number(it.unitPrice),
        sortOrder: it.sortOrder,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const pct = {
      transport: ucap.pctTransport != null ? Number(ucap.pctTransport) : null,
      engineering: ucap.pctEngineering != null ? Number(ucap.pctEngineering) : null,
      administration: ucap.pctAdministration != null ? Number(ucap.pctAdministration) : null,
      inspection: ucap.pctInspection != null ? Number(ucap.pctInspection) : null,
      interventoria: ucap.pctInterventoria != null ? Number(ucap.pctInterventoria) : null,
      financial: ucap.pctFinancial != null ? Number(ucap.pctFinancial) : null,
      retieRetilap: ucap.pctRetieRetilap != null ? Number(ucap.pctRetieRetilap) : null,
      environmental: ucap.pctEnvironmental != null ? Number(ucap.pctEnvironmental) : null,
    };

    const ippCurrent = ucap.ippCurrent != null ? Number(ucap.ippCurrent) : null;

    const totals = this.computeTotals(
      items,
      {
        transport: pct.transport ?? 0,
        engineering: pct.engineering ?? 0,
        administration: pct.administration ?? 0,
        inspection: pct.inspection ?? 0,
        interventoria: pct.interventoria ?? 0,
        financial: pct.financial ?? 0,
        retieRetilap: pct.retieRetilap ?? 0,
        environmental: pct.environmental ?? 0,
      },
      ippBase,
      ippCurrent,
    );

    return {
      ucapId: ucap.ucapId,
      companyId: ucap.companyId,
      projectId: ucap.projectId ?? null,
      code: ucap.code,
      name: ucap.description,
      grupo: ucap.grupo ?? null,
      apellidos: (ucap.apellidos || [])
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder || a.apellidoId - b.apellidoId)
        .map((a) => this.serializeApellido(a)),
      value: Number(ucap.roundedValue),
      /** IPP inicial propio de la UCAP (columna "IPP inicial" de la lista). */
      initialIpp: ucap.initialIpp != null ? Number(ucap.initialIpp) : null,
      pct,
      /** IPP base del municipio/proyecto: es el que se usa en el factor IPP. */
      ippBase,
      ippCurrent,
      ucapMonth: ucap.ucapMonth ?? null,
      ucapYear: ucap.ucapYear ?? null,
      powerNominal: ucap.powerNominal ?? null,
      powerLosses: ucap.powerLosses ?? null,
      powerWithLosses:
        ucap.powerNominal != null || ucap.powerLosses != null
          ? (ucap.powerNominal ?? 0) + (ucap.powerLosses ?? 0)
          : null,
      efficiencyLmW: ucap.efficiencyLmW ?? null,
      ippFactor: totals.ippFactor,
      hasCostSheet: items.length > 0,
      /** Cerrada: tiene hoja y nadie la reabrió. La pantalla la pone solo lectura. */
      bloqueada: this.estaBloqueada(ucap, items.length > 0),
      reabiertaEn: ucap.reabiertaEn ?? null,
      items,
      totals,
      createdAt: ucap.createdAt,
      updatedAt: ucap.updatedAt,
    };
  }
}
