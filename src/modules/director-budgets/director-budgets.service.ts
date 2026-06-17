import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DirectorBudget, DirectorBudgetStatus } from '../../database/entities/director-budget.entity';
import { DirectorBudgetItem } from '../../database/entities/director-budget-item.entity';
import { Work } from '../../database/entities/work.entity';
import { User } from '../../database/entities/user.entity';
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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /** Rol único autorizado a aprobar/rechazar el presupuesto del Director. */
  private readonly BUDGET_APPROVER_ROLE = 'Director Financiero y Administrativo';

  private buildBudgetEntity(dto: CreateDirectorBudgetDto, resolvedCompanyName?: string): Partial<DirectorBudget> {
    return {
      workId: n(dto.workId) as number,
      departmentName: dto.departmentName,
      workName: dto.workName,
      companyName: resolvedCompanyName ?? dto.companyName ?? null,
      observaciones: dto.observaciones,
      fuenteFinanciacion: dto.fuenteFinanciacion,
      valorMinimoExcedentes: n(dto.valorMinimoExcedentes) as number,
      valorActualExcedentes: n(dto.valorActualExcedentes) as number,
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
      hasIva: item.hasIva !== false,
    }));
  }

  private async resolveCompanyName(dto: CreateDirectorBudgetDto): Promise<string | undefined> {
    if (dto.workId) {
      const work = await this.workRepo.findOne({
        where: { workId: dto.workId },
        relations: ['company'],
      });
      if (work?.company?.name) return work.company.name;
    }
    return dto.companyName;
  }

  async create(dto: CreateDirectorBudgetDto, userId: number): Promise<DirectorBudget> {
    const companyName = await this.resolveCompanyName(dto);
    const budget = this.budgetRepo.create({
      ...this.buildBudgetEntity(dto, companyName),
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

    const companyName = await this.resolveCompanyName(dto);
    Object.assign(budget, this.buildBudgetEntity(dto, companyName));
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
      .leftJoinAndSelect('b.items', 'items')
      .leftJoinAndSelect('items.material', 'itemMaterial')
      .orderBy('b.budgetId', 'ASC')
      .addOrderBy('items.itemOrder', 'ASC')
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
        if (filters.departmentName) {
          qb.andWhere(
            '(work.companyId IN (:...companyIds) OR (b.workId IS NULL AND b.departmentName = :deptName))',
            { companyIds: ids, deptName: filters.departmentName },
          );
        } else {
          qb.andWhere('work.companyId IN (:...companyIds)', { companyIds: ids });
        }
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

  async updateStatus(
    budgetId: number,
    newStatus: DirectorBudgetStatus,
    userId: number,
  ): Promise<DirectorBudget> {
    const budget = await this.budgetRepo.findOne({ where: { budgetId } });
    if (!budget) throw new NotFoundException('Presupuesto no encontrado');

    const allowed: Record<DirectorBudgetStatus, DirectorBudgetStatus[]> = {
      [DirectorBudgetStatus.DRAFT]: [DirectorBudgetStatus.EN_REVISION],
      [DirectorBudgetStatus.EN_REVISION]: [DirectorBudgetStatus.FINAL, DirectorBudgetStatus.DRAFT],
      [DirectorBudgetStatus.FINAL]: [],
    };

    if (!allowed[budget.status].includes(newStatus)) {
      throw new BadRequestException(
        `No se puede cambiar de '${budget.status}' a '${newStatus}'`,
      );
    }

    // Aprobar (en_revision → final) y rechazar (en_revision → draft) solo los hace
    // la Directora Financiera. Enviar a revisión (draft → en_revision) queda abierto.
    const isApproval = budget.status === DirectorBudgetStatus.EN_REVISION && newStatus === DirectorBudgetStatus.FINAL;
    const isRejection = budget.status === DirectorBudgetStatus.EN_REVISION && newStatus === DirectorBudgetStatus.DRAFT;
    if (isApproval || isRejection) {
      const user = await this.userRepo.findOne({ where: { userId }, relations: ['role'] });
      if (user?.role?.nombreRol !== this.BUDGET_APPROVER_ROLE) {
        throw new ForbiddenException(
          'Solo la Directora Financiera (Director Financiero y Administrativo) puede aprobar o rechazar el presupuesto',
        );
      }
    }

    budget.status = newStatus;
    await this.budgetRepo.save(budget);
    return this.findOne(budgetId);
  }
}
