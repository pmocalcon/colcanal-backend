import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DirectorBudget } from '../../database/entities/director-budget.entity';
import { DirectorBudgetItem } from '../../database/entities/director-budget-item.entity';
import { Work } from '../../database/entities/work.entity';
import {
  CreateDirectorBudgetDto,
  UpdateDirectorBudgetDto,
  FilterDirectorBudgetsDto,
} from './dto';

type NullableNum = number | null | undefined;

function n(val: NullableNum): number | null {
  return val != null ? Number(val) : null;
}

@Injectable()
export class DirectorBudgetsService {
  constructor(
    @InjectRepository(DirectorBudget)
    private readonly budgetRepo: Repository<DirectorBudget>,
    @InjectRepository(DirectorBudgetItem)
    private readonly itemRepo: Repository<DirectorBudgetItem>,
    @InjectRepository(Work)
    private readonly workRepo: Repository<Work>,
  ) {}

  private buildBudgetEntity(dto: CreateDirectorBudgetDto): Partial<DirectorBudget> {
    return {
      workId: n(dto.workId) as number,
      departmentName: dto.departmentName,
      workName: dto.workName,
      observaciones: dto.observaciones,
      manoDeObra: n(dto.manoDeObra) as number,
      manoDeObraEj: n(dto.manoDeObraEj) as number,
      materialesInventario: n(dto.materialesInventario) as number,
      materialesInventarioEj: n(dto.materialesInventarioEj) as number,
      valorFacturado: n(dto.valorFacturado) as number,
      valorFacturadoEj: n(dto.valorFacturadoEj) as number,
      otrosCostos: n(dto.otrosCostos) as number,
      otrosCostosEj: n(dto.otrosCostosEj) as number,
      leg: n(dto.leg) as number,
      legEj: n(dto.legEj) as number,
      retPct: n(dto.retPct) as number,
      retPctEj: n(dto.retPctEj) as number,
      status: dto.status,
    };
  }

  private buildItemEntities(
    budgetId: number,
    dto: CreateDirectorBudgetDto,
  ): Partial<DirectorBudgetItem>[] {
    return (dto.items ?? []).map((item) => ({
      budgetId,
      itemOrder: item.itemOrder,
      materialId: n(item.materialId) as number,
      codigo: item.codigo,
      descripcion: item.descripcion,
      cantidad: n(item.cantidad) as number,
      vrUnitario: n(item.vrUnitario) as number,
      cantBodega: n(item.cantBodega) as number,
      costoTransporte: n(item.costoTransporte) as number,
      ejecutado: n(item.ejecutado) as number,
    }));
  }

  async create(dto: CreateDirectorBudgetDto, userId: number): Promise<DirectorBudget> {
    const budget = this.budgetRepo.create({
      ...this.buildBudgetEntity(dto),
      createdBy: userId,
    } as DirectorBudget);

    const saved = await this.budgetRepo.save(budget);

    if (dto.items?.length) {
      const items = this.itemRepo.create(
        this.buildItemEntities(saved.budgetId, dto) as DirectorBudgetItem[],
      );
      await this.itemRepo.save(items);
    }

    return this.findOne(saved.budgetId);
  }

  async update(
    budgetId: number,
    dto: UpdateDirectorBudgetDto,
    userId: number,
  ): Promise<DirectorBudget> {
    const budget = await this.budgetRepo.findOne({ where: { budgetId } });
    if (!budget) throw new NotFoundException('Presupuesto no encontrado');
    if (budget.createdBy !== userId) {
      throw new ForbiddenException('No tienes permiso para editar este presupuesto');
    }

    Object.assign(budget, this.buildBudgetEntity(dto));
    await this.budgetRepo.save(budget);

    await this.itemRepo.delete({ budgetId });
    if (dto.items?.length) {
      const items = this.itemRepo.create(
        this.buildItemEntities(budgetId, dto) as DirectorBudgetItem[],
      );
      await this.itemRepo.save(items);
    }

    return this.findOne(budgetId);
  }

  async findAll(filters: FilterDirectorBudgetsDto): Promise<{
    data: DirectorBudget[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const qb = this.budgetRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.work', 'work')
      .leftJoinAndSelect('work.company', 'company')
      .leftJoinAndSelect('b.creator', 'creator')
      .orderBy('b.updatedAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (filters.workId) {
      qb.andWhere('b.workId = :workId', { workId: filters.workId });
    }
    if (filters.status) {
      qb.andWhere('b.status = :status', { status: filters.status });
    }
    if (filters.createdBy) {
      qb.andWhere('b.createdBy = :createdBy', { createdBy: filters.createdBy });
    }
    if (filters.companyId) {
      const ids = filters.companyId
        .split(',')
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id));
      if (ids.length) {
        qb.andWhere('work.companyId IN (:...companyIds)', { companyIds: ids });
      }
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(budgetId: number): Promise<DirectorBudget> {
    const budget = await this.budgetRepo.findOne({
      where: { budgetId },
      relations: ['work', 'work.company', 'creator', 'items', 'items.material'],
      order: { items: { itemOrder: 'ASC' } } as any,
    });
    if (!budget) throw new NotFoundException('Presupuesto no encontrado');
    return budget;
  }
}
