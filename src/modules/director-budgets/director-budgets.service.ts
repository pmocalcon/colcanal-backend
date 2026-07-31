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
import { ActaBudgetStatus } from '../../database/entities/work-acta.entity';
import { Work } from '../../database/entities/work.entity';
import { User } from '../../database/entities/user.entity';
import {
  NotificationsService,
  WorksNotificationData,
} from '../notifications/notifications.service';
import { SurveysService } from '../surveys/surveys.service';
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
    private readonly surveysService: SurveysService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Rol único autorizado a aprobar/rechazar el presupuesto del Director (Gerencia). */
  private readonly BUDGET_APPROVER_ROLE = 'Gerencia';

  /**
   * Quién saca el presupuesto a autorización. Es el rol que lo elabora: el acta le llega
   * a su bandeja y de ahí arma el presupuesto. Antes la transición no validaba nada —el
   * código decía «queda abierto»—, así que cualquiera con permiso sobre el presupuesto
   * podía mandarle uno a Gerencia.
   */
  private readonly BUDGET_SUBMITTER_ROLES = ['Director Financiero y Administrativo', 'Analista PMO'];

  private buildBudgetEntity(dto: CreateDirectorBudgetDto, resolvedCompanyName?: string): Partial<DirectorBudget> {
    return {
      workId: n(dto.workId) as number,
      actaCompanyId: n(dto.actaCompanyId),
      actaProjectId: n(dto.actaProjectId),
      actaNumber: dto.actaNumber ?? null,
      departmentName: dto.departmentName,
      workName: dto.workName,
      companyName: resolvedCompanyName ?? dto.companyName ?? null,
      observaciones: dto.observaciones,
      fuenteFinanciacion: dto.fuenteFinanciacion,
      valorMinimoExcedentes: n(dto.valorMinimoExcedentes) as number,
      valorActualExcedentes: n(dto.valorActualExcedentes) as number,
      valorActualExcedentesTexto: dto.valorActualExcedentesTexto,
      saldoDisponible: n(dto.saldoDisponible) as number,
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
      estampillaPct: n(dto.estampillaPct) as number,
      estampillaPctEj: n(dto.estampillaPctEj) as number,
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
      // `final` deja de ser terminal: Gerencia puede devolver un presupuesto ya
      // autorizado. La pantalla siempre mostró el botón «Devolver» en este estado y la
      // llamada fallaba contra esta tabla.
      [DirectorBudgetStatus.FINAL]: [DirectorBudgetStatus.DRAFT],
    };

    if (!allowed[budget.status].includes(newStatus)) {
      throw new BadRequestException(
        `No se puede cambiar de '${budget.status}' a '${newStatus}'`,
      );
    }

    // Aprobar (en_revision → final) y devolver a borrador —desde revisión o desde un
    // presupuesto ya autorizado— los hacen Gerencia y Analista PMO. Enviar a revisión
    // (draft → en_revision) lo hace quien lo elabora, y exige además que el presupuesto
    // cuelgue de un acta que lo esté esperando.
    const isApproval = budget.status === DirectorBudgetStatus.EN_REVISION && newStatus === DirectorBudgetStatus.FINAL;
    const isRejection = newStatus === DirectorBudgetStatus.DRAFT && budget.status !== DirectorBudgetStatus.DRAFT;
    const isReopen = budget.status === DirectorBudgetStatus.FINAL && newStatus === DirectorBudgetStatus.DRAFT;
    const isSubmit = budget.status === DirectorBudgetStatus.DRAFT && newStatus === DirectorBudgetStatus.EN_REVISION;

    if (isSubmit) {
      const user = await this.userRepo.findOne({ where: { userId }, relations: ['role'] });
      if (!this.BUDGET_SUBMITTER_ROLES.includes(user?.role?.nombreRol ?? '')) {
        throw new ForbiddenException(
          'Solo la Directora Financiera o Analista PMO pueden enviar el presupuesto a autorización',
        );
      }
      await this.validarActaAntesDeAutorizacion(budget);
    }

    if (isApproval || isRejection) {
      const user = await this.userRepo.findOne({ where: { userId }, relations: ['role'] });
      const rol = user?.role?.nombreRol;
      if (rol !== this.BUDGET_APPROVER_ROLE && rol !== 'Analista PMO') {
        throw new ForbiddenException(
          'Solo Gerencia o Analista PMO pueden aprobar, rechazar o devolver el presupuesto',
        );
      }
    }

    budget.status = newStatus;
    await this.budgetRepo.save(budget);

    // Aprobar aquí cierra también el presupuesto del ACTA: es el último eslabón de la
    // cadena (acta → Directora Financiera → Presupuesto del Director → Gerencia) y sin
    // esto el acta se quedaba en 'en_revision' indefinidamente. No cierra nada si el
    // presupuesto no viene de un acta o si el acta no está esperando.
    if (isApproval) {
      await this.surveysService.closeActaBudgetFromDirectorBudget(
        this.enlaceAlActa(budget),
        userId,
      );
    }

    // Devolver un presupuesto ya autorizado deshace ese cierre: el acta vuelve a
    // 'en_revision' y reaparece en la bandeja de la Directora Financiera. Si no, el acta
    // afirmaría tener un presupuesto aprobado que acaba de volver a borrador.
    if (isReopen) {
      await this.surveysService.reopenActaBudgetFromDirectorBudget(
        this.enlaceAlActa(budget),
        userId,
      );
    }

    // El correo no puede tumbar la transición: si el envío falla, el presupuesto ya
    // cambió de estado y eso es lo que importa. Mismo criterio que en surveys.
    const evento = isSubmit
      ? 'enviado'
      : isApproval
        ? 'aprobado'
        : isReopen
          ? 'reabierto'
          : isRejection
            ? 'rechazado'
            : null;
    if (evento) {
      this.notificarCambioDeEstado(evento, budget, userId).catch(() => {});
    }

    return this.findOne(budgetId);
  }

  /**
   * Avisa por correo en cada transición del presupuesto. Antes el módulo no enviaba
   * ninguno: Gerencia se enteraba solo si entraba a su bandeja, y quien lo elaboró no
   * sabía si se lo habían autorizado o devuelto.
   *
   * A quién:
   * - **enviado** → a Gerencia (y Analista PMO), que son quienes pueden autorizarlo.
   * - **aprobado / rechazado / reabierto** → a quien elaboró el presupuesto.
   *
   * El cierre y la reapertura del presupuesto del acta mandan su propio correo (al
   * Director Técnico y a la Directora Financiera), así que aquí no se les duplica.
   */
  private async notificarCambioDeEstado(
    evento: 'enviado' | 'aprobado' | 'rechazado' | 'reabierto',
    budget: DirectorBudget,
    actorId: number,
  ): Promise<void> {
    const actor = await this.userRepo.findOne({ where: { userId: actorId } });
    const data = await this.construirDatosDeNotificacion(budget, actor);

    // Devolver algo ya autorizado no es lo mismo que rechazarlo en revisión: quien lo
    // elaboró creía tenerlo aprobado. El correo usa la caja de comentarios para decirlo.
    if (evento === 'reabierto') {
      data.comments =
        'El presupuesto ya estaba autorizado. Al devolverlo, el presupuesto del acta ' +
        'vuelve a quedar en revisión.';
    }

    if (evento === 'enviado') {
      const autorizadores = await this.usuariosActivosPorRol([
        this.BUDGET_APPROVER_ROLE,
        'Analista PMO',
      ]);
      await this.enviarSinRepetir(autorizadores, (email, nombre) =>
        this.notificationsService.notifyDirectorBudgetForAuthorization(email, nombre, data),
      );
      return;
    }

    const creador = budget.createdBy
      ? await this.userRepo.findOne({ where: { userId: budget.createdBy } })
      : null;
    if (!creador) return;

    await this.enviarSinRepetir([creador], (email, nombre) =>
      evento === 'aprobado'
        ? this.notificationsService.notifyDirectorBudgetApproved(email, nombre, data)
        : this.notificationsService.notifyDirectorBudgetRejected(email, nombre, data),
    );
  }

  private async construirDatosDeNotificacion(
    budget: DirectorBudget,
    actor?: User | null,
  ): Promise<WorksNotificationData> {
    const creador = budget.createdBy
      ? await this.userRepo.findOne({ where: { userId: budget.createdBy } })
      : null;

    return {
      entityType: 'presupuesto',
      // El presupuesto no tiene número propio: se identifica por su acta, o por la obra.
      identifier: budget.actaNumber || budget.workName || `#${budget.budgetId}`,
      workName: budget.workId != null ? budget.workName ?? undefined : undefined,
      municipality: budget.companyName ?? undefined,
      createdBy: this.nombreParaMostrar(creador),
      actorName: actor ? this.nombreParaMostrar(actor) : undefined,
      actionUrl: this.urlDelFrontend(
        `/dashboard/levantamiento-obras/presupuesto/${budget.budgetId}`,
      ),
    };
  }

  // Los cuatro ayudantes de abajo son gemelos de los de SurveysService. Se repiten aquí
  // en vez de compartirlos porque son cuatro líneas cada uno y unificarlos obligaría a
  // meter el repositorio de usuarios dentro de NotificationsModule.
  private async usuariosActivosPorRol(nombresDeRol: string[]): Promise<User[]> {
    const normalizados = nombresDeRol.map((rol) => rol.toLowerCase());
    const usuarios = await this.userRepo.find({ where: { estado: true }, relations: ['role'] });
    return usuarios.filter((u) => normalizados.includes(u.role?.nombreRol?.toLowerCase() || ''));
  }

  private async enviarSinRepetir(
    usuarios: User[],
    enviar: (email: string, nombre: string) => Promise<boolean>,
  ): Promise<void> {
    const enviados = new Set<string>();
    for (const usuario of usuarios) {
      const email = usuario.emailNotificacion || usuario.email;
      if (!email || enviados.has(email.toLowerCase())) continue;
      enviados.add(email.toLowerCase());
      await enviar(email, this.nombreParaMostrar(usuario));
    }
  }

  private nombreParaMostrar(usuario?: User | null): string {
    if (!usuario) return 'Usuario';
    const apellido = (usuario as any).apellido ? ` ${(usuario as any).apellido}` : '';
    return `${usuario.nombre || 'Usuario'}${apellido}`.trim();
  }

  private urlDelFrontend(ruta: string): string | undefined {
    const base = process.env.FRONTEND_URL || process.env.APP_URL || process.env.CLIENT_URL;
    if (!base) return undefined;
    return `${base.replace(/\/$/, '')}${ruta}`;
  }

  /**
   * Cómo llegar del presupuesto a su acta. Ver `findActaForDirectorBudget` en
   * `SurveysService` para el orden en que se prueban las pistas.
   */
  private enlaceAlActa(budget: DirectorBudget) {
    // En los presupuestos agrupados anteriores a las columnas acta_*, el número del
    // acta quedó en work_name (work_id va nulo ahí). Solo en ese caso sirve de pista:
    // en un presupuesto de una sola obra, work_name es el nombre de la obra.
    const numeroActaLegado = budget.workId == null ? budget.workName : null;
    return {
      actaCompanyId: budget.actaCompanyId,
      actaProjectId: budget.actaProjectId,
      actaNumber: budget.actaNumber ?? numeroActaLegado,
      workId: budget.workId,
    };
  }

  /**
   * El presupuesto no sale a autorización si no cuelga de un acta que esté esperándolo.
   *
   * Antes nada lo exigía: se podía crear un Presupuesto del Director sin acta y llevarlo
   * hasta Gerencia, que terminaba autorizando un presupuesto sin origen. Y como aprobar
   * ahora cierra el presupuesto del acta, sin este control la aprobación no cerraría nada
   * y el acta volvería a quedarse colgada.
   *
   * Se valida al **enviar**, no al crear: el borrador sigue siendo libre para trabajarlo.
   */
  private async validarActaAntesDeAutorizacion(budget: DirectorBudget): Promise<void> {
    const acta = await this.surveysService.findActaForDirectorBudget(this.enlaceAlActa(budget));

    if (!acta) {
      throw new BadRequestException(
        'El presupuesto no está asociado a un acta que esté pendiente de presupuesto. ' +
          'Ábrelo, selecciona el acta y guárdalo antes de enviarlo a autorización.',
      );
    }

    if (acta.presupuestoStatus === ActaBudgetStatus.PENDIENTE) {
      throw new BadRequestException(
        `El acta ${acta.actaNumber} no ha sido enviada a presupuesto. ` +
          'El Director Técnico debe enviarla primero.',
      );
    }

    if (acta.presupuestoStatus === ActaBudgetStatus.RECHAZADO) {
      throw new BadRequestException(
        `El presupuesto del acta ${acta.actaNumber} fue rechazado` +
          (acta.presupuestoRechazoMotivo ? `: ${acta.presupuestoRechazoMotivo}` : '') +
          '. El Director Técnico debe volver a enviarla a presupuesto.',
      );
    }

    // `aprobado` se deja pasar: el acta ya cumplió su parte del trámite y bloquear ahí
    // impediría rehacer un presupuesto sobre un acta ya cerrada. Aprobar simplemente no
    // tendrá nada que cerrar.
  }

  /**
   * Gerencia ajusta SOLO "Otros Costos" mientras autoriza un presupuesto en
   * revisión (el resto de la planilla queda bloqueada en el frontend).
   */
  async updateOtrosCostos(
    budgetId: number,
    userId: number,
    otrosCostos: number | null,
    otrosCostosEj: number | null,
    leg: number | null = null,
    legEj: number | null = null,
  ): Promise<DirectorBudget> {
    const budget = await this.budgetRepo.findOne({ where: { budgetId } });
    if (!budget) throw new NotFoundException('Presupuesto no encontrado');
    if (budget.status !== DirectorBudgetStatus.EN_REVISION) {
      throw new BadRequestException(
        'Solo se pueden ajustar Otros Costos y Costos L.N.A mientras el presupuesto está en revisión',
      );
    }
    const user = await this.userRepo.findOne({ where: { userId }, relations: ['role'] });
    const rol = user?.role?.nombreRol;
    if (rol !== this.BUDGET_APPROVER_ROLE && rol !== 'Analista PMO') {
      throw new ForbiddenException(
        'Solo Gerencia puede ajustar Otros Costos y Costos L.N.A al autorizar',
      );
    }

    budget.otrosCostos = n(otrosCostos) as number;
    budget.otrosCostosEj = n(otrosCostosEj) as number;
    budget.leg = n(leg) as number;
    budget.legEj = n(legEj) as number;
    await this.budgetRepo.save(budget);
    return this.findOne(budgetId);
  }
}
