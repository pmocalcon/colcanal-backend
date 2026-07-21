import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, Repository, IsNull } from "typeorm";
import { CregMunicipioConfig } from "../../database/entities/creg-municipio-config.entity";
import { CregParametrizacion } from "../../database/entities/creg-parametrizacion.entity";
import { CregCenso } from "../../database/entities/creg-censo.entity";
import { CregLiquidacion } from "../../database/entities/creg-liquidacion.entity";
import { CregIddOff } from "../../database/entities/creg-idd-off.entity";
import { CregIddOn } from "../../database/entities/creg-idd-on.entity";
import { Ucap } from "../../database/entities/ucap.entity";
import { UcapCostItem } from "../../database/entities/ucap-cost-item.entity";
import { UcapApellido } from "../../database/entities/ucap-apellido.entity";
import { Company } from "../../database/entities/company.entity";
import { Project } from "../../database/entities/project.entity";
import {
  CreateCregUnitDto,
  SaveCregCensoDto,
  SaveCregLiquidacionDto,
  SaveCregIddOffDto,
  SaveCregIddOnDto,
  SaveCregParametrizacionDto,
  SaveUcapCostSheetDto,
  UpsertCregConfigDto,
} from "./dto";

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
    @InjectRepository(CregCenso)
    private readonly censoRepo: Repository<CregCenso>,
    @InjectRepository(CregLiquidacion)
    private readonly liquidacionRepo: Repository<CregLiquidacion>,
    @InjectRepository(CregIddOff)
    private readonly iddOffRepo: Repository<CregIddOff>,
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
    private readonly dataSource: DataSource,
  ) {}

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

  async saveLiquidacion(
    companyId: number,
    projectId: number | null,
    dto: SaveCregLiquidacionDto,
  ) {
    let row = await this.liquidacionRepo.findOne({
      where: { companyId, projectId: projectId ?? IsNull() },
    });
    if (!row) {
      row = this.liquidacionRepo.create({ companyId, projectId: projectId ?? null });
    }
    row.data = dto.data ?? {};
    await this.liquidacionRepo.save(row);
    return this.getLiquidacion(companyId, projectId);
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
    let row = await this.iddOffRepo.findOne({
      where: { companyId, projectId: projectId ?? IsNull() },
    });
    if (!row) {
      row = this.iddOffRepo.create({ companyId, projectId: projectId ?? null });
    }
    row.data = dto.data ?? {};
    await this.iddOffRepo.save(row);
    return this.getIddOff(companyId, projectId);
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
    let row = await this.iddOnRepo.findOne({
      where: { companyId, projectId: projectId ?? IsNull() },
    });
    if (!row) {
      row = this.iddOnRepo.create({ companyId, projectId: projectId ?? null });
    }
    row.data = dto.data ?? {};
    await this.iddOnRepo.save(row);
    return this.getIddOn(companyId, projectId);
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

  // ============ Hojas de costos (sobre UCAPs) ============

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
    const ucap = await this.ucapRepo.findOne({
      where: { ucapId },
      relations: ["costItems"],
    });
    if (!ucap) {
      throw new NotFoundException(`UCAP ${ucapId} no encontrada`);
    }

    const ippBase = await this.getCompanyIppBase(ucap.companyId, ucap.projectId ?? null);

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
    const ucap = await this.ucapRepo.findOne({ where: { ucapId } });
    if (!ucap) {
      throw new NotFoundException(`UCAP ${ucapId} no encontrada`);
    }
    await this.itemRepo.delete({ ucapId });
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
    const ucap = await this.ucapRepo.findOne({ where: { ucapId } });
    if (!ucap) {
      throw new NotFoundException(`UCAP ${ucapId} no encontrada`);
    }
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
      items,
      totals,
      createdAt: ucap.createdAt,
      updatedAt: ucap.updatedAt,
    };
  }
}
