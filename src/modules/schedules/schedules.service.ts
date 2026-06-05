import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
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
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { UpsertDailyPlansDto } from './dto/upsert-daily-plans.dto';
import { UpsertMaterialLogsDto } from './dto/material-log.dto';
import { UpsertDailyExecutionDto, UpsertExecutionsDto } from './dto/execution.dto';

export interface ScheduleUcapItem {
  itemId: number | null;
  ucapId: number;
  ucapCode: string;
  ucapDescription: string;
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
  items: ScheduleUcapItem[];
}

@Injectable()
export class SchedulesService {
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
  ) {}

  async getOrCreateSchedule(workId: number): Promise<ScheduleDetail> {
    const work = await this.workRepo.findOne({ where: { workId } });
    if (!work) throw new NotFoundException(`Work ${workId} not found`);

    let schedule = await this.scheduleRepo.findOne({ where: { workId } });
    if (!schedule) {
      schedule = this.scheduleRepo.create({ workId });
      schedule = await this.scheduleRepo.save(schedule);
    }

    // Aggregate planned quantities by ucap_id across all surveys of this work
    const budgetItems = await this.budgetItemRepo
      .createQueryBuilder('bi')
      .innerJoin('bi.survey', 'survey')
      .innerJoinAndSelect('bi.ucap', 'ucap')
      .where('survey.workId = :workId', { workId })
      .getMany();

    const ucapMap = new Map<number, { ucap: Ucap; plannedQuantity: number }>();
    for (const item of budgetItems) {
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
          ucapCode: ucap.code,
          ucapDescription: ucap.description,
          plannedQuantity,
          executedQuantity: si ? Number(si.executedQuantity) : 0,
          ucapStartDate: si?.ucapStartDate ?? null,
          ucapEndDate: si?.ucapEndDate ?? null,
        };
      },
    );

    // Sort by ucap code
    items.sort((a, b) => a.ucapCode.localeCompare(b.ucapCode));

    return {
      scheduleId: schedule.scheduleId,
      workId: schedule.workId,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      contractualStart: schedule.contractualStart,
      contractualEnd: schedule.contractualEnd,
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
    const schedule = await this.scheduleRepo.findOne({ where: { scheduleId } });
    if (!schedule) throw new NotFoundException(`Schedule ${scheduleId} not found`);

    const plans = await this.dailyPlanRepo.find({
      where: { scheduleId, planDate: Between(from, to) },
      order: { planDate: 'ASC', ucapId: 'ASC' },
    });

    return {
      scheduleId,
      from,
      to,
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

    if (dto.items.length > 0) {
      await this.dailyPlanRepo.upsert(
        dto.items.map((item) => ({
          scheduleId,
          ucapId: item.ucapId,
          planDate: item.planDate,
          plannedQuantity: item.plannedQuantity,
          executedQuantity: item.executedQuantity ?? 0,
        })),
        { conflictPaths: ['scheduleId', 'ucapId', 'planDate'], skipUpdateIfNoValuesChanged: false },
      );
    }

    const dates = dto.items.map((i) => i.planDate);
    const from = dates.reduce((a, b) => (a < b ? a : b));
    const to = dates.reduce((a, b) => (a > b ? a : b));
    return this.getDailyPlans(scheduleId, from, to);
  }

  async getSurveyMaterials(workId: number) {
    const work = await this.workRepo.findOne({ where: { workId } });
    if (!work) throw new NotFoundException(`Work ${workId} not found`);

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

    return Array.from(byCode.entries()).map(([materialCode, data]) => ({
      materialCode,
      materialDescription: data.description,
      unitOfMeasure: data.unitOfMeasure,
      totalQuantity: data.totalQuantity,
    }));
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
          }),
        ),
      );
    }

    return this.getExecutions(scheduleId, dto.execType);
  }
}
