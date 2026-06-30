import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { Schedule } from '../../database/entities/schedule.entity';
import { ScheduleItem } from '../../database/entities/schedule-item.entity';
import { ScheduleDailyPlan } from '../../database/entities/schedule-daily-plan.entity';
import { ScheduleMaterialLog } from '../../database/entities/schedule-material-log.entity';
import { ScheduleExecution } from '../../database/entities/schedule-execution.entity';
import { Survey } from '../../database/entities/survey.entity';
import { SurveyBudgetItem } from '../../database/entities/survey-budget-item.entity';
import { SurveyMaterial } from '../../database/entities/survey-material.entity';
import { Work } from '../../database/entities/work.entity';
import { Ucap } from '../../database/entities/ucap.entity';
import { DirectorBudgetItem } from '../../database/entities/director-budget-item.entity';
import { Requisition } from '../../database/entities/requisition.entity';
import { RequisitionItem } from '../../database/entities/requisition-item.entity';
import { PurchaseOrderItem } from '../../database/entities/purchase-order-item.entity';
import { ProjectCode } from '../../database/entities/project-code.entity';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { UpsertDailyPlansDto } from './dto/upsert-daily-plans.dto';
import { UpsertMaterialLogsDto } from './dto/material-log.dto';
import { UpsertDailyExecutionDto, UpsertExecutionsDto } from './dto/execution.dto';

export interface ScheduleUcapItem {
  itemId: number | null;
  ucapId: number;
  ucapCode: string;
  ucapDescription: string;
  unitValue: number;
  plannedQuantity: number;
  executedQuantity: number;
  ucapStartDate: string | null;
  ucapEndDate: string | null;
}

export interface ScheduleDetail {
  scheduleId: number;
  workId: number;
  startDate: string | null;
  endDate: string | null;
  contractualStart: string | null;
  contractualEnd: string | null;
  ippFactor: number;
  items: ScheduleUcapItem[];
}

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    @InjectRepository(Schedule)
    private scheduleRepo: Repository<Schedule>,
    @InjectRepository(ScheduleItem)
    private itemRepo: Repository<ScheduleItem>,
    @InjectRepository(ScheduleDailyPlan)
    private dailyPlanRepo: Repository<ScheduleDailyPlan>,
    @InjectRepository(ScheduleMaterialLog)
    private materialLogRepo: Repository<ScheduleMaterialLog>,
    @InjectRepository(ScheduleExecution)
    private executionRepo: Repository<ScheduleExecution>,
    @InjectRepository(Survey)
    private surveyRepo: Repository<Survey>,
    @InjectRepository(SurveyBudgetItem)
    private budgetItemRepo: Repository<SurveyBudgetItem>,
    @InjectRepository(Work)
    private workRepo: Repository<Work>,
    @InjectRepository(Ucap)
    private ucapRepo: Repository<Ucap>,
    @InjectRepository(SurveyMaterial)
    private surveyMaterialRepo: Repository<SurveyMaterial>,
    @InjectRepository(DirectorBudgetItem)
    private directorBudgetItemRepo: Repository<DirectorBudgetItem>,
    @InjectRepository(Requisition)
    private requisitionRepo: Repository<Requisition>,
    @InjectRepository(RequisitionItem)
    private requisitionItemRepo: Repository<RequisitionItem>,
    @InjectRepository(PurchaseOrderItem)
    private purchaseOrderItemRepo: Repository<PurchaseOrderItem>,
    @InjectRepository(ProjectCode)
    private projectCodeRepo: Repository<ProjectCode>,
  ) {}

  async getOrCreateSchedule(workId: number): Promise<ScheduleDetail> {
    const work = await this.workRepo.findOne({ where: { workId }, relations: ['company', 'project'] });
    if (!work) throw new NotFoundException(`Work ${workId} not found`);

    let schedule = await this.scheduleRepo.findOne({ where: { workId } });
    if (!schedule) {
      schedule = this.scheduleRepo.create({ workId });
      schedule = await this.scheduleRepo.save(schedule);
    }

    // Aggregate planned quantities by ucap_id across all surveys of this work.
    // If this auxiliary query fails, keep the schedule available with empty items
    // instead of breaking the whole acta view.
    let budgetItems: SurveyBudgetItem[] = [];
    try {
      budgetItems = await this.budgetItemRepo
        .createQueryBuilder('bi')
        .innerJoin('bi.survey', 'survey')
        .innerJoinAndSelect('bi.ucap', 'ucap')
        .where('survey.workId = :workId', { workId })
        .getMany();
    } catch (error) {
      this.logger.warn(
        `No se pudieron consultar las UCAPs presupuestadas de la obra ${workId}. Se devolvera cronograma sin items.`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    const ucapMap = new Map<number, { ucap: Ucap; plannedQuantity: number }>();
    for (const item of budgetItems) {
      if (!item.ucap) continue;
      const existing = ucapMap.get(item.ucapId);
      if (existing) {
        existing.plannedQuantity += Number(item.quantity);
      } else {
        ucapMap.set(item.ucapId, {
          ucap: item.ucap,
          plannedQuantity: Number(item.quantity),
        });
      }
    }

    // Load existing executed quantities
    const scheduleItems = await this.itemRepo.find({
      where: { scheduleId: schedule.scheduleId },
    });
    const itemByUcapId = new Map(scheduleItems.map((i) => [i.ucapId, i]));

    const items: ScheduleUcapItem[] = Array.from(ucapMap.entries()).map(
      ([ucapId, { ucap, plannedQuantity }]) => {
        const si = itemByUcapId.get(ucapId);
        return {
          itemId: si?.itemId ?? null,
          ucapId,
          ucapCode: ucap.code ?? String(ucapId),
          ucapDescription: ucap.description ?? '',
          unitValue: Number(ucap.roundedValue) || 0,
          plannedQuantity,
          executedQuantity: si ? Number(si.executedQuantity) : 0,
          ucapStartDate: si?.ucapStartDate ?? null,
          ucapEndDate: si?.ucapEndDate ?? null,
        };
      },
    );

    // Sort by ucap code
    items.sort((a, b) => a.ucapCode.localeCompare(b.ucapCode, 'es'));

    // IPP factor: previousMonthIpp del levantamiento / IPP inicial base.
    // - IPP del mes: se prefiere el último levantamiento APROBADO; si no hay aprobado,
    //   se usa el último disponible (cualquier estado).
    // - IPP inicial base: en Antioquia el IPP vive en el proyecto (municipio); para los
    //   demás departamentos, en la empresa. Por eso se prioriza el del proyecto y se
    //   cae al de la empresa si el proyecto no lo tiene.
    let ippMes = 0;
    try {
      const baseQuery = () =>
        this.surveyRepo
          .createQueryBuilder('survey')
          .select('survey.previousMonthIpp', 'previousMonthIpp')
          .where('survey.workId = :workId', { workId })
          .orderBy('survey.surveyDate', 'DESC')
          .limit(1);

      const approvedSurvey = await baseQuery()
        .andWhere('survey.status = :status', { status: 'approved' })
        .getRawOne<{ previousMonthIpp: string | number | null }>();

      const survey =
        approvedSurvey ??
        (await baseQuery().getRawOne<{ previousMonthIpp: string | number | null }>());

      ippMes = Number(survey?.previousMonthIpp) || 0;
    } catch (error) {
      this.logger.warn(
        `No se pudo consultar el IPP del levantamiento para la obra ${workId}. Se usara factor 1.`,
        error instanceof Error ? error.stack : String(error),
      );
    }
    const ippInicial =
      Number(work.project?.ippInitialValue) || Number(work.company?.ippInitialValue) || 0;
    const ippFactor = ippMes > 0 && ippInicial > 0 ? ippMes / ippInicial : 1;

    return {
      scheduleId: schedule.scheduleId,
      workId: schedule.workId,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      contractualStart: schedule.contractualStart,
      contractualEnd: schedule.contractualEnd,
      ippFactor,
      items,
    };
  }

  async updateSchedule(
    scheduleId: number,
    dto: UpdateScheduleDto,
  ): Promise<ScheduleDetail> {
    const schedule = await this.scheduleRepo.findOne({ where: { scheduleId } });
    if (!schedule) throw new NotFoundException(`Schedule ${scheduleId} not found`);

    // Update dates (assign strings directly to avoid timezone conversion)
    if (dto.startDate !== undefined) schedule.startDate = dto.startDate ?? null;
    if (dto.endDate !== undefined) schedule.endDate = dto.endDate ?? null;
    if (dto.contractualStart !== undefined) schedule.contractualStart = dto.contractualStart ?? null;
    if (dto.contractualEnd !== undefined) schedule.contractualEnd = dto.contractualEnd ?? null;

    await this.scheduleRepo.save(schedule);

    // Upsert executed quantities
    if (dto.items && dto.items.length > 0) {
      await this.itemRepo.upsert(
        dto.items.map((itemDto) => ({
          scheduleId,
          ucapId: itemDto.ucapId,
          executedQuantity: itemDto.executedQuantity,
          ucapStartDate: itemDto.ucapStartDate ?? null,
          ucapEndDate: itemDto.ucapEndDate ?? null,
        })),
        { conflictPaths: ['scheduleId', 'ucapId'], skipUpdateIfNoValuesChanged: false },
      );
    }

    return this.getOrCreateSchedule(schedule.workId);
  }

  async getDailyPlans(scheduleId: number, from: string, to: string) {
    const normalizedFrom = /^\d{4}-\d{2}-\d{2}$/.test(from ?? '') ? from : null;
    const normalizedTo = /^\d{4}-\d{2}-\d{2}$/.test(to ?? '') ? to : null;

    if (!normalizedFrom || !normalizedTo) {
      return {
        scheduleId,
        from: normalizedFrom,
        to: normalizedTo,
        plans: [],
      };
    }

    let plans: ScheduleDailyPlan[] = [];
    try {
      const schedule = await this.scheduleRepo.findOne({ where: { scheduleId } });
      if (!schedule) throw new NotFoundException(`Schedule ${scheduleId} not found`);

      plans = await this.dailyPlanRepo.find({
        where: { scheduleId, planDate: Between(normalizedFrom, normalizedTo) },
        order: { planDate: 'ASC', ucapId: 'ASC' },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.warn(
        `No se pudieron consultar los planes diarios del cronograma ${scheduleId}. Se devolvera una lista vacia.`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return {
      scheduleId,
      from: normalizedFrom,
      to: normalizedTo,
      plans: plans.map((p) => ({
        planId: p.planId,
        ucapId: p.ucapId,
        planDate: p.planDate,
        plannedQuantity: Number(p.plannedQuantity),
        executedQuantity: Number(p.executedQuantity),
      })),
    };
  }

  async upsertDailyPlans(scheduleId: number, dto: UpsertDailyPlansDto) {
    const schedule = await this.scheduleRepo.findOne({ where: { scheduleId } });
    if (!schedule) throw new NotFoundException(`Schedule ${scheduleId} not found`);

    const items = dto.items ?? [];
    if (items.length === 0) {
      return {
        scheduleId,
        from: null,
        to: null,
        plans: [],
      };
    }

    if (items.length > 0) {
      await this.dailyPlanRepo.upsert(
        items.map((item) => ({
          scheduleId,
          ucapId: item.ucapId,
          planDate: item.planDate,
          plannedQuantity: item.plannedQuantity,
          executedQuantity: item.executedQuantity ?? 0,
        })),
        { conflictPaths: ['scheduleId', 'ucapId', 'planDate'], skipUpdateIfNoValuesChanged: false },
      );
    }

    const dates = items.map((i) => i.planDate);
    const from = dates.reduce((a, b) => (a < b ? a : b));
    const to = dates.reduce((a, b) => (a > b ? a : b));
    return this.getDailyPlans(scheduleId, from, to);
  }

  async getSurveyMaterials(workId: number) {
    let work: Work | null = null;
    try {
      work = await this.workRepo.findOne({ where: { workId } });
    } catch (error) {
      this.logger.warn(
        `No se pudo validar la obra ${workId} para consultar materiales. Se devolvera una lista vacia.`,
        error instanceof Error ? error.stack : String(error),
      );
      return [];
    }
    if (!work) throw new NotFoundException(`Work ${workId} not found`);

    try {
      const materials = await this.surveyMaterialRepo
        .createQueryBuilder('sm')
        .innerJoin('sm.survey', 'survey')
        .leftJoinAndSelect('sm.material', 'material')
        .where('survey.workId = :workId', { workId })
        .andWhere('(sm.materialCode IS NOT NULL OR sm.materialId IS NOT NULL)')
        .orderBy('sm.materialCode', 'ASC')
        .getMany();

      const byCode = new Map<string, { description: string | null; unitOfMeasure: string | null; totalQuantity: number }>();
      for (const m of materials) {
        const effectiveCode = m.materialCode ?? m.material?.code ?? null;
        if (!effectiveCode) continue;
        const effectiveDescription = m.description ?? m.material?.description ?? null;
        const existing = byCode.get(effectiveCode);
        if (existing) {
          existing.totalQuantity += Number(m.quantity);
        } else {
          byCode.set(effectiveCode, {
            description: effectiveDescription,
            unitOfMeasure: m.unitOfMeasure ?? null,
            totalQuantity: Number(m.quantity),
          });
        }
      }

      // Unit prices from director budget items (most recent budget wins per code)
      const budgetItems = await this.directorBudgetItemRepo
        .createQueryBuilder('dbi')
        .innerJoin('dbi.budget', 'budget')
        .where('budget.workId = :workId', { workId })
        .andWhere('dbi.codigo IS NOT NULL')
        .andWhere('dbi.vrUnitario IS NOT NULL')
        .orderBy('budget.budgetId', 'DESC')
        .getMany();

      const priceByCode = new Map<string, number>();
      for (const bi of budgetItems) {
        if (bi.codigo && !priceByCode.has(bi.codigo)) {
          priceByCode.set(bi.codigo, Number(bi.vrUnitario) || 0);
        }
      }

      return Array.from(byCode.entries()).map(([materialCode, data]) => ({
        materialCode,
        materialDescription: data.description,
        unitOfMeasure: data.unitOfMeasure,
        totalQuantity: data.totalQuantity,
        unitValue: priceByCode.get(materialCode) ?? 0,
      }));
    } catch (error) {
      this.logger.warn(
        `No se pudieron consultar los materiales de la obra ${workId}. Se devolvera una lista vacia.`,
        error instanceof Error ? error.stack : String(error),
      );
      return [];
    }
  }

  async getMaterialLogs(scheduleId: number) {
    const schedule = await this.scheduleRepo.findOne({ where: { scheduleId } });
    if (!schedule) throw new NotFoundException(`Schedule ${scheduleId} not found`);

    const logs = await this.materialLogRepo.find({
      where: { scheduleId },
      order: { usageDate: 'DESC', logId: 'DESC' },
    });

    return {
      scheduleId,
      logs: logs.map((l) => ({
        logId: l.logId,
        materialCode: l.materialCode,
        materialDescription: l.materialDescription,
        unitOfMeasure: l.unitOfMeasure,
        quantity: Number(l.quantity),
        usageDate: l.usageDate,
      })),
    };
  }

  async upsertMaterialLogs(scheduleId: number, dto: UpsertMaterialLogsDto) {
    const schedule = await this.scheduleRepo.findOne({ where: { scheduleId } });
    if (!schedule) throw new NotFoundException(`Schedule ${scheduleId} not found`);

    await this.materialLogRepo.delete({ scheduleId });

    if (dto.items.length > 0) {
      await this.materialLogRepo.save(
        dto.items.map((item) => this.materialLogRepo.create({
          scheduleId,
          materialCode: item.materialCode,
          materialDescription: item.materialDescription ?? null,
          unitOfMeasure: item.unitOfMeasure ?? null,
          quantity: item.quantity,
          usageDate: item.usageDate,
        })),
      );
    }

    return this.getMaterialLogs(scheduleId);
  }

  async deleteMaterialLog(scheduleId: number, logId: number) {
    const log = await this.materialLogRepo.findOne({ where: { logId, scheduleId } });
    if (!log) throw new NotFoundException(`Log ${logId} not found`);
    await this.materialLogRepo.remove(log);
  }

  // ── Ejecución diaria de UCAPs: actualiza SOLO executed_quantity en schedule_daily_plans,
  //    sin pisar planned_quantity (que pertenece al Plan Diario UCAPs).
  async upsertDailyExecution(scheduleId: number, dto: UpsertDailyExecutionDto) {
    const schedule = await this.scheduleRepo.findOne({ where: { scheduleId } });
    if (!schedule) throw new NotFoundException(`Schedule ${scheduleId} not found`);

    if (dto.items.length > 0) {
      await this.dailyPlanRepo
        .createQueryBuilder()
        .insert()
        .into(ScheduleDailyPlan)
        .values(
          dto.items.map((item) => ({
            scheduleId,
            ucapId: item.ucapId,
            planDate: item.planDate,
            executedQuantity: item.executedQuantity,
          })),
        )
        .orUpdate(['executed_quantity'], ['schedule_id', 'ucap_id', 'plan_date'])
        .execute();
    }

    return { scheduleId, ok: true };
  }

  // ── Ejecución de materiales / actividades (schedule_executions). Reemplazo total por tipo.
  async getExecutions(scheduleId: number, execType: 'material' | 'activity') {
    const schedule = await this.scheduleRepo.findOne({ where: { scheduleId } });
    if (!schedule) throw new NotFoundException(`Schedule ${scheduleId} not found`);

    const rows = await this.executionRepo.find({
      where: { scheduleId, execType },
      order: { itemKey: 'ASC', executionDate: 'ASC' },
    });

    return {
      scheduleId,
      execType,
      items: rows.map((r) => ({
        itemKey: r.itemKey,
        label: r.label,
        unitOfMeasure: r.unitOfMeasure,
        executionDate: r.executionDate,
        quantity: Number(r.quantity),
        unitPrice: r.unitPrice != null ? Number(r.unitPrice) : null,
      })),
    };
  }

  async upsertExecutions(scheduleId: number, dto: UpsertExecutionsDto) {
    const schedule = await this.scheduleRepo.findOne({ where: { scheduleId } });
    if (!schedule) throw new NotFoundException(`Schedule ${scheduleId} not found`);

    await this.executionRepo.delete({ scheduleId, execType: dto.execType });

    if (dto.items.length > 0) {
      await this.executionRepo.save(
        dto.items.map((item) =>
          this.executionRepo.create({
            scheduleId,
            execType: dto.execType,
            itemKey: item.itemKey,
            label: item.label ?? null,
            unitOfMeasure: item.unitOfMeasure ?? null,
            executionDate: item.executionDate ?? null,
            quantity: item.quantity,
            unitPrice: item.unitPrice ?? null,
          }),
        ),
      );
    }

    return this.getExecutions(scheduleId, dto.execType);
  }

  // ── Comparación Presupuesto vs Órdenes de Compra por material
  async getWorkPurchaseComparison(workId: number) {
    let work: Work | null = null;
    try {
      work = await this.workRepo.findOne({ where: { workId } });
    } catch (error) {
      this.logger.warn(
        `No se pudo validar la obra ${workId} para comparar compras. Se devolvera una lista vacia.`,
        error instanceof Error ? error.stack : String(error),
      );
      return [];
    }
    if (!work) throw new NotFoundException(`Work ${workId} not found`);

    try {
      // Vinculo acta <-> requisicion: las requisiciones guardan el numero de acta en
      // `codigo_obra` (= work.record_number). Asi cada acta se compara solo contra SUS
      // requisiciones (clave cuando un municipio tiene varias actas). Si no hay match
      // por acta (datos antiguos sin codigo_obra ligado), se cae al heuristico de la
      // requisicion mas reciente del proyecto/municipio.
      let reqIds: number[] = [];

      const actaNumber = work.recordNumber?.trim();
      if (actaNumber) {
        const actaReqs = await this.requisitionRepo
          .createQueryBuilder('req')
          .where('req.companyId = :cid', { cid: work.companyId })
          .andWhere('req.codigoObra = :acta', { acta: actaNumber })
          .getMany();
        reqIds = actaReqs.map((r) => r.requisitionId);
      }

      if (reqIds.length === 0) {
        const projectCode = await this.projectCodeRepo.findOne({
          where: {
            companyId: work.companyId,
            projectId: work.projectId != null ? work.projectId : IsNull(),
          },
        });
        if (!projectCode) return [];

        const latestReq = await this.requisitionRepo
          .createQueryBuilder('req')
          .where('req.projectCodeId = :pcId', { pcId: projectCode.codeId })
          .orderBy('req.createdAt', 'DESC')
          .addOrderBy('req.requisitionId', 'DESC')
          .getOne();
        if (!latestReq) return [];
        reqIds = [latestReq.requisitionId];
      }

      const reqItems = await this.requisitionItemRepo
        .createQueryBuilder('ri')
        .innerJoin('ri.requisition', 'req')
        .innerJoinAndSelect('ri.material', 'material')
        .where('req.requisitionId IN (:...ids)', { ids: reqIds })
        .getMany();

      if (reqItems.length === 0) return [];

      const reqByCode = new Map<string, { description: string; qty: number; itemIds: number[] }>();
      for (const ri of reqItems) {
        const code = ri.material?.code;
        if (!code) continue;
        const existing = reqByCode.get(code);
        if (existing) {
          existing.qty += Number(ri.quantity);
          existing.itemIds.push(ri.itemId);
        } else {
          reqByCode.set(code, {
            description: ri.material?.description ?? '',
            qty: Number(ri.quantity),
            itemIds: [ri.itemId],
          });
        }
      }

      const reqItemIds = Array.from(reqByCode.values()).flatMap((item) => item.itemIds);
      const poItems = reqItemIds.length > 0
        ? await this.purchaseOrderItemRepo
            .createQueryBuilder('poi')
            .where('poi.requisitionItemId IN (:...ids)', { ids: reqItemIds })
            .getMany()
        : [];

      const reqItemCodeMap = new Map(reqItems.map((ri) => [ri.itemId, ri.material?.code ?? null]));
      const poByCode = new Map<string, { qty: number; value: number }>();
      for (const poi of poItems) {
        const code = reqItemCodeMap.get(poi.requisitionItemId);
        if (!code) continue;
        const existing = poByCode.get(code);
        const qty = Number(poi.quantity);
        const value = Number(poi.subtotal);
        if (existing) {
          existing.qty += qty;
          existing.value += value;
        } else {
          poByCode.set(code, { qty, value });
        }
      }

      return Array.from(reqByCode.entries()).map(([materialCode, data]) => {
        const po = poByCode.get(materialCode);
        return {
          materialCode,
          materialDescription: data.description,
          requisitionedQty: data.qty,
          orderedQty: po?.qty ?? 0,
          orderedValue: po?.value ?? 0,
        };
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo comparar presupuesto vs ordenes de compra de la obra ${workId}. Se devolvera una lista vacia.`,
        error instanceof Error ? error.stack : String(error),
      );
      return [];
    }
  }
}
