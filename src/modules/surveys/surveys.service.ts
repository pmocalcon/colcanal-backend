import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { SurveyReviewerAccess } from '../../database/entities/survey-reviewer-access.entity';
import { Work } from '../../database/entities/work.entity';
import {
  WorkActa,
  ActaStatus,
  ActaBudgetStatus,
  ActaCronogramaStatus,
  ActaRqAnticipadaStatus,
} from '../../database/entities/work-acta.entity';
import { Requisition } from '../../database/entities/requisition.entity';
import { ActaSummaryDraft } from '../../database/entities/acta-summary-draft.entity';
import { AnnualPlanReview, AnnualPlanReviewStatus } from '../../database/entities/annual-plan-review.entity';
import { Survey, SurveyStatus } from '../../database/entities/survey.entity';
import { SurveyBudgetItem } from '../../database/entities/survey-budget-item.entity';
import { SurveyInvestmentItem } from '../../database/entities/survey-investment-item.entity';
import { SurveyMaterial } from '../../database/entities/survey-material.entity';
import { SurveyTravelExpense } from '../../database/entities/survey-travel-expense.entity';
import { Ucap } from '../../database/entities/ucap.entity';
import { Company } from '../../database/entities/company.entity';
import { Project } from '../../database/entities/project.entity';
import { User } from '../../database/entities/user.entity';
import {
  CreateWorkDto,
  UpdateWorkDto,
  CreateSurveyDto,
  UpdateSurveyDto,
  ReviewSurveyDto,
  ReviewAction,
  FilterSurveysDto,
  ReviewBlockDto,
  SurveyBlock,
  BlockReviewStatus,
  CreateUcapDto,
  UpdateUcapDto,
} from './dto';
import { BlockStatus } from '../../database/entities/survey.entity';
import { NotificationsService, WorksNotificationData } from '../notifications/notifications.service';

@Injectable()
export class SurveysService {
  private readonly logger = new Logger(SurveysService.name);

  constructor(
    @InjectRepository(Work)
    private workRepository: Repository<Work>,
    @InjectRepository(Survey)
    private surveyRepository: Repository<Survey>,
    @InjectRepository(SurveyBudgetItem)
    private budgetItemRepository: Repository<SurveyBudgetItem>,
    @InjectRepository(SurveyInvestmentItem)
    private investmentItemRepository: Repository<SurveyInvestmentItem>,
    @InjectRepository(SurveyMaterial)
    private materialRepository: Repository<SurveyMaterial>,
    @InjectRepository(SurveyTravelExpense)
    private travelExpenseRepository: Repository<SurveyTravelExpense>,
    @InjectRepository(Ucap)
    private ucapRepository: Repository<Ucap>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(SurveyReviewerAccess)
    private surveyReviewerAccessRepository: Repository<SurveyReviewerAccess>,
    @InjectRepository(WorkActa)
    private workActaRepository: Repository<WorkActa>,
    @InjectRepository(ActaSummaryDraft)
    private actaSummaryDraftRepository: Repository<ActaSummaryDraft>,
    @InjectRepository(AnnualPlanReview)
    private annualPlanReviewRepository: Repository<AnnualPlanReview>,
    // Solo para bajarle el código de contabilidad a las requisiciones anticipadas
    // al aprobar el acta. Se usa el repositorio y no PurchasesService a propósito:
    // purchases ya depende de este módulo y el servicio cerraría el círculo.
    @InjectRepository(Requisition)
    private requisitionRepository: Repository<Requisition>,
    private notificationsService: NotificationsService,
  ) {}

  // ============================================
  // NOTIFICATION HELPERS
  // ============================================

  private getNotificationEmail(user?: User | null): string | null {
    return user?.emailNotificacion || user?.email || null;
  }

  private getUserDisplayName(user?: User | null): string {
    if (!user) return 'Usuario';
    const lastName = (user as any).apellido ? ` ${(user as any).apellido}` : '';
    return `${user.nombre || 'Usuario'}${lastName}`.trim();
  }

  private buildFrontendUrl(path: string): string | undefined {
    const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || process.env.CLIENT_URL;
    if (!baseUrl) return undefined;
    return `${baseUrl.replace(/\/$/, '')}${path}`;
  }

  private getSurveyBlockLabel(block: SurveyBlock): string {
    switch (block) {
      case SurveyBlock.BUDGET:
        return 'Presupuesto';
      case SurveyBlock.INVESTMENT:
        return 'Inversion';
      case SurveyBlock.MATERIALS:
        return 'Materiales';
      case SurveyBlock.TRAVEL_EXPENSES:
        return 'Costos de viaje';
      default:
        return 'Bloque';
    }
  }

  private async findActiveUsersByRoleNames(roleNames: string[]): Promise<User[]> {
    const normalizedRoles = roleNames.map((role) => role.toLowerCase());
    const users = await this.userRepository.find({
      where: { estado: true },
      relations: ['role'],
    });

    return users.filter((user) =>
      normalizedRoles.includes(user.role?.nombreRol?.toLowerCase() || ''),
    );
  }

  private async notifyUniqueUsers(
    users: User[],
    sender: (email: string, name: string, user: User) => Promise<boolean>,
  ): Promise<void> {
    const sentEmails = new Set<string>();

    for (const user of users) {
      const email = this.getNotificationEmail(user);
      if (!email || sentEmails.has(email.toLowerCase())) continue;

      sentEmails.add(email.toLowerCase());
      await sender(email, this.getUserDisplayName(user), user);
    }
  }

  private buildSurveyNotificationData(
    survey: any,
    actor?: User | null,
    extra?: Partial<WorksNotificationData>,
  ): WorksNotificationData {
    return {
      entityType: 'levantamiento',
      identifier: survey.projectCode || survey.surveyNumber || `#${survey.surveyId}`,
      workName: survey.work?.name,
      companyName: survey.work?.company?.name,
      projectName: survey.work?.project?.name,
      createdBy: this.getUserDisplayName(survey.creator),
      actorName: actor ? this.getUserDisplayName(actor) : undefined,
      actionUrl: this.buildFrontendUrl(`/dashboard/levantamiento-obras/levantamientos/revisar/${survey.surveyId}`),
      ...extra,
    };
  }

  private async buildActaNotificationData(
    acta: WorkActa,
    actor?: User | null,
    extra?: Partial<WorksNotificationData>,
  ): Promise<WorksNotificationData> {
    const [company, works, creator] = await Promise.all([
      this.companyRepository.findOne({ where: { companyId: acta.companyId } }),
      this.workRepository.find({
        where: {
          companyId: acta.companyId,
          projectId: acta.projectId ?? IsNull(),
          recordNumber: acta.actaNumber,
        },
        relations: ['project', 'creator'],
      }),
      acta.createdBy
        ? this.userRepository.findOne({ where: { userId: acta.createdBy } })
        : Promise.resolve(null),
    ]);

    const firstWork = works[0];

    const actaUrl =
      `/dashboard/levantamiento-obras/acta/${encodeURIComponent(acta.actaNumber)}` +
      `?company=${acta.companyId}` +
      (acta.projectId != null ? `&project=${acta.projectId}` : '');

    return {
      entityType: 'acta',
      identifier: acta.actaNumber,
      workName: firstWork?.name,
      companyName: company?.name,
      projectName: firstWork?.project?.name,
      createdBy: this.getUserDisplayName(creator || firstWork?.creator),
      actorName: actor ? this.getUserDisplayName(actor) : undefined,
      worksCount: works.length || undefined,
      projectCode: acta.projectCode || undefined,
      actionUrl: this.buildFrontendUrl(actaUrl),
      ...extra,
    };
  }

  private async sendSurveyNotification(
    type: 'submitted_for_review' | 'reviewed' | 'block_reviewed' | 'approved_all' | 'reopened',
    survey: any,
    options?: {
      actor?: User | null;
      approved?: boolean;
      blockName?: string;
      comments?: string;
    },
  ): Promise<void> {
    try {
      const actor = options?.actor;
      const data = this.buildSurveyNotificationData(survey, actor, {
        blockName: options?.blockName,
        comments: options?.comments,
      });

      if (type === 'submitted_for_review') {
        const assignedReviewer = survey.assignedReviewer
          || (survey.assignedReviewerId
            ? await this.userRepository.findOne({ where: { userId: survey.assignedReviewerId } })
            : null);
        const reviewers = assignedReviewer
          ? [assignedReviewer]
          : await this.findActiveUsersByRoleNames(['Director Técnico', 'Analista PMO']);

        await this.notifyUniqueUsers(reviewers, (email, name) =>
          this.notificationsService.notifySurveySubmittedForReview(email, name, data),
        );
        return;
      }

      const creator = survey.creator
        || (survey.createdBy
          ? await this.userRepository.findOne({ where: { userId: survey.createdBy } })
          : null);
      const creatorEmail = this.getNotificationEmail(creator);
      if (!creator || !creatorEmail) return;

      if (type === 'reviewed') {
        await this.notificationsService.notifySurveyReviewed(
          creatorEmail,
          this.getUserDisplayName(creator),
          { ...data, approved: Boolean(options?.approved) },
        );
      } else if (type === 'block_reviewed') {
        await this.notificationsService.notifySurveyBlockReviewed(
          creatorEmail,
          this.getUserDisplayName(creator),
          { ...data, approved: Boolean(options?.approved) },
        );
      } else if (type === 'approved_all') {
        await this.notificationsService.notifySurveyReviewed(
          creatorEmail,
          this.getUserDisplayName(creator),
          { ...data, approved: true },
        );
      } else if (type === 'reopened') {
        await this.notificationsService.notifySurveyReopened(
          creatorEmail,
          this.getUserDisplayName(creator),
          data,
        );
      }
    } catch (error) {
      this.logger.warn(`No se pudo enviar notificacion de levantamiento: ${error.message}`);
    }
  }

  private async sendActaNotification(
    type: 'submitted_for_review' | 'reviewed' | 'for_approval' | 'approved' | 'sent_to_budget' | 'budget_approved' | 'budget_rejected' | 'cronograma_submitted' | 'cronograma_approved' | 'cronograma_rejected',
    acta: WorkActa,
    options?: {
      actor?: User | null;
      approved?: boolean;
      comments?: string;
    },
  ): Promise<void> {
    try {
      const data = await this.buildActaNotificationData(acta, options?.actor, {
        comments: options?.comments,
      });

      if (type === 'submitted_for_review') {
        const reviewers = await this.findActiveUsersByRoleNames(['Director Técnico', 'Analista PMO']);
        await this.notifyUniqueUsers(reviewers, (email, name) =>
          this.notificationsService.notifyActaSubmittedForReview(email, name, data),
        );
        return;
      }

      if (type === 'for_approval') {
        const approvers = await this.findActiveUsersByRoleNames(['Gerencia de Proyectos', 'Analista PMO']);
        await this.notifyUniqueUsers(approvers, (email, name) =>
          this.notificationsService.notifyActaForApproval(email, name, data),
        );
        return;
      }

      if (type === 'sent_to_budget') {
        const financieros = await this.findActiveUsersByRoleNames(['Director Financiero y Administrativo']);
        await this.notifyUniqueUsers(financieros, (email, name) =>
          this.notificationsService.notifyActaSentToBudget(email, name, data),
        );
        return;
      }

      if (type === 'budget_approved' || type === 'budget_rejected') {
        // Cierra el ciclo: avisa al Director Técnico (quien envió el acta a presupuesto).
        const tecnicos = await this.findActiveUsersByRoleNames(['Director Técnico']);
        await this.notifyUniqueUsers(tecnicos, (email, name) =>
          type === 'budget_approved'
            ? this.notificationsService.notifyActaBudgetApproved(email, name, data)
            : this.notificationsService.notifyActaBudgetRejected(email, name, data),
        );
        return;
      }

      if (type === 'cronograma_submitted') {
        // El Director de Proyecto envió el plan: avisa al Director Técnico.
        const tecnicos = await this.findActiveUsersByRoleNames(['Director Técnico', 'Analista PMO']);
        await this.notifyUniqueUsers(tecnicos, (email, name) =>
          this.notificationsService.notifyCronogramaSubmitted(email, name, data),
        );
        return;
      }

      if (type === 'cronograma_approved' || type === 'cronograma_rejected') {
        // Cierra el ciclo: avisa al Director de Proyecto (creador del plan).
        const recipients: User[] = [];
        if (acta.createdBy) {
          const creator = await this.userRepository.findOne({ where: { userId: acta.createdBy } });
          if (creator) recipients.push(creator);
        }
        await this.notifyUniqueUsers(recipients, (email, name) =>
          type === 'cronograma_approved'
            ? this.notificationsService.notifyCronogramaApproved(email, name, data)
            : this.notificationsService.notifyCronogramaRejected(email, name, data),
        );
        return;
      }

      const recipients: User[] = [];
      if (acta.createdBy) {
        const creator = await this.userRepository.findOne({ where: { userId: acta.createdBy } });
        if (creator) recipients.push(creator);
      }
      if (type === 'approved' && acta.reviewedBy) {
        const reviewer = await this.userRepository.findOne({ where: { userId: acta.reviewedBy } });
        if (reviewer) recipients.push(reviewer);
      }

      await this.notifyUniqueUsers(recipients, (email, name) => {
        if (type === 'reviewed') {
          return this.notificationsService.notifyActaReviewed(email, name, {
            ...data,
            approved: Boolean(options?.approved),
          });
        }

        return this.notificationsService.notifyActaApproved(email, name, data);
      });
    } catch (error) {
      this.logger.warn(`No se pudo enviar notificacion de acta: ${error.message}`);
    }
  }

  // ============================================
  // WORK (OBRA) METHODS
  // ============================================

  async createWork(createWorkDto: CreateWorkDto, userId: number): Promise<Work> {
    const company = await this.companyRepository.findOne({
      where: { companyId: createWorkDto.companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${createWorkDto.companyId} not found`);
    }

    // Generate work code if record number is provided
    let workCode: string | undefined;
    if (createWorkDto.recordNumber) {
      workCode = await this.generateWorkCode(
        createWorkDto.companyId,
        createWorkDto.projectId,
        createWorkDto.recordNumber,
      );
    }

    const work = this.workRepository.create({
      ...createWorkDto,
      workCode,
      createdBy: userId,
    });

    return this.workRepository.save(work);
  }

  async updateWork(workId: number, updateWorkDto: UpdateWorkDto, userId: number): Promise<Work> {
    const work = await this.workRepository.findOne({
      where: { workId },
    });

    if (!work) {
      throw new NotFoundException(`Work with ID ${workId} not found`);
    }

    // If record number is being updated, regenerate work code
    if (updateWorkDto.recordNumber && updateWorkDto.recordNumber !== work.recordNumber) {
      work.workCode = await this.generateWorkCode(
        updateWorkDto.companyId || work.companyId,
        updateWorkDto.projectId || work.projectId,
        updateWorkDto.recordNumber,
      );
    }

    Object.assign(work, updateWorkDto);
    return this.workRepository.save(work);
  }

  async getWork(workId: number): Promise<Work> {
    const work = await this.workRepository.findOne({
      where: { workId },
      relations: ['company', 'project', 'creator', 'surveys'],
    });

    if (!work) {
      throw new NotFoundException(`Work with ID ${workId} not found`);
    }

    return work;
  }

  async getWorks(companyIds?: number[], projectId?: number, createdBy?: number): Promise<Work[]> {
    const query = this.workRepository.createQueryBuilder('work')
      .leftJoinAndSelect('work.company', 'company')
      .leftJoinAndSelect('work.project', 'project')
      .leftJoinAndSelect('work.creator', 'creator');

    if (companyIds && companyIds.length > 0) {
      query.andWhere('work.companyId IN (:...companyIds)', { companyIds });
    }

    if (projectId) {
      query.andWhere('work.projectId = :projectId', { projectId });
    }

    if (createdBy) {
      query.andWhere('work.createdBy = :createdBy', { createdBy });
    }

    query.orderBy('work.createdAt', 'DESC');

    return query.getMany();
  }

  async deleteWork(workId: number): Promise<void> {
    const work = await this.workRepository.findOne({
      where: { workId },
      relations: ['surveys'],
    });

    if (!work) {
      throw new NotFoundException(`Work with ID ${workId} not found`);
    }

    if (work.surveys && work.surveys.length > 0) {
      throw new BadRequestException('Cannot delete work with existing surveys');
    }

    await this.workRepository.remove(work);
  }

  // ============================================
  // SURVEY (LEVANTAMIENTO) METHODS
  // ============================================

  async createSurvey(createSurveyDto: CreateSurveyDto, userId: number): Promise<Survey> {
    const work = await this.workRepository.findOne({
      where: { workId: createSurveyDto.workId },
      relations: ['company', 'project'],
    });

    if (!work) {
      throw new NotFoundException(`Work with ID ${createSurveyDto.workId} not found`);
    }

    // Generate project code
    const projectCode = await this.generateProjectCode(work.companyId, work.projectId);

    // Revisor designado: el que venga del formulario; si no, el Director Técnico por defecto.
    const technicalDirector = await this.userRepository.findOne({
      where: { cargo: 'Director Técnico', estado: true },
    });

    const survey = this.surveyRepository.create({
      workId: createSurveyDto.workId,
      projectCode,
      requestDate: createSurveyDto.requestDate ? new Date(createSurveyDto.requestDate) : undefined,
      surveyDate: createSurveyDto.surveyDate ? new Date(createSurveyDto.surveyDate) : undefined,
      receivedBy: createSurveyDto.receivedBy,
      assignedReviewerId: createSurveyDto.assignedReviewerId ?? technicalDirector?.userId,
      previousMonthIpp: createSurveyDto.previousMonthIpp,
      requiresPhotometricStudies: createSurveyDto.requiresPhotometricStudies || false,
      requiresRetieCertification: createSurveyDto.requiresRetieCertification || false,
      requiresRetilapCertification: createSurveyDto.requiresRetilapCertification || false,
      requiresCivilWork: createSurveyDto.requiresCivilWork || false,
      description: createSurveyDto.description ?? null,
      sketchUrl: createSurveyDto.sketchUrl,
      mapUrl: createSurveyDto.mapUrl,
      status: SurveyStatus.PENDING,
      createdBy: userId,
    });

    const savedSurvey = await this.surveyRepository.save(survey);

    // Save budget items
    if (createSurveyDto.budgetItems?.length) {
      await this.saveBudgetItems(savedSurvey.surveyId, createSurveyDto.budgetItems);
    }

    // Save investment items
    if (createSurveyDto.investmentItems?.length) {
      await this.saveInvestmentItems(savedSurvey.surveyId, createSurveyDto.investmentItems);
    }

    // Save materials
    if (createSurveyDto.materialItems?.length) {
      await this.saveMaterials(savedSurvey.surveyId, createSurveyDto.materialItems);
    }

    // Save travel expenses
    if (createSurveyDto.travelExpenses?.length) {
      await this.saveTravelExpenses(savedSurvey.surveyId, createSurveyDto.travelExpenses);
    }

    return this.getSurvey(savedSurvey.surveyId);
  }

  async updateSurvey(surveyId: number, updateSurveyDto: UpdateSurveyDto, userId: number): Promise<Survey> {
    const survey = await this.surveyRepository.findOne({
      where: { surveyId },
    });

    if (!survey) {
      throw new NotFoundException(`Survey with ID ${surveyId} not found`);
    }

    // Check if survey is editable
    if (survey.status === SurveyStatus.APPROVED || survey.status === SurveyStatus.IN_REVIEW) {
      throw new ForbiddenException('Cannot edit survey in current status');
    }

    // Update basic fields
    if (updateSurveyDto.requestDate) survey.requestDate = new Date(updateSurveyDto.requestDate);
    if (updateSurveyDto.surveyDate) survey.surveyDate = new Date(updateSurveyDto.surveyDate);
    if (updateSurveyDto.receivedBy !== undefined) survey.receivedBy = updateSurveyDto.receivedBy;
    if (updateSurveyDto.assignedReviewerId !== undefined) survey.assignedReviewerId = updateSurveyDto.assignedReviewerId;
    if (updateSurveyDto.requiresPhotometricStudies !== undefined) survey.requiresPhotometricStudies = updateSurveyDto.requiresPhotometricStudies;
    if (updateSurveyDto.requiresRetieCertification !== undefined) survey.requiresRetieCertification = updateSurveyDto.requiresRetieCertification;
    if (updateSurveyDto.requiresRetilapCertification !== undefined) survey.requiresRetilapCertification = updateSurveyDto.requiresRetilapCertification;
    if (updateSurveyDto.requiresCivilWork !== undefined) survey.requiresCivilWork = updateSurveyDto.requiresCivilWork;
    if (updateSurveyDto.previousMonthIpp !== undefined) survey.previousMonthIpp = updateSurveyDto.previousMonthIpp;
    if (updateSurveyDto.description !== undefined) survey.description = updateSurveyDto.description ?? null;
    if (updateSurveyDto.sketchUrl !== undefined) survey.sketchUrl = updateSurveyDto.sketchUrl;
    if (updateSurveyDto.mapUrl !== undefined) survey.mapUrl = updateSurveyDto.mapUrl;

    await this.surveyRepository.save(survey);

    // Update related items if provided
    if (updateSurveyDto.budgetItems) {
      await this.budgetItemRepository.delete({ surveyId });
      await this.saveBudgetItems(surveyId, updateSurveyDto.budgetItems);
    }

    if (updateSurveyDto.investmentItems) {
      await this.investmentItemRepository.delete({ surveyId });
      await this.saveInvestmentItems(surveyId, updateSurveyDto.investmentItems);
    }

    if (updateSurveyDto.materialItems) {
      await this.materialRepository.delete({ surveyId });
      await this.saveMaterials(surveyId, updateSurveyDto.materialItems);
    }

    if (updateSurveyDto.travelExpenses) {
      await this.travelExpenseRepository.delete({ surveyId });
      await this.saveTravelExpenses(surveyId, updateSurveyDto.travelExpenses);
    }

    return this.getSurvey(surveyId);
  }

  async updateSurveyIpp(surveyId: number, previousMonthIpp: number): Promise<any> {
    if (!Number.isFinite(previousMonthIpp) || previousMonthIpp <= 0) {
      throw new BadRequestException('El IPP debe ser un número mayor a cero');
    }

    const survey = await this.surveyRepository.findOne({
      where: { surveyId },
    });

    if (!survey) {
      throw new NotFoundException(`Survey with ID ${surveyId} not found`);
    }

    survey.previousMonthIpp = previousMonthIpp;
    await this.surveyRepository.save(survey);

    return this.getSurvey(surveyId);
  }

  async getSurvey(surveyId: number): Promise<any> {
    const survey = await this.surveyRepository.findOne({
      where: { surveyId },
      relations: [
        'work',
        'work.company',
        'work.project',
        'creator',
        'assignedReviewer',
        'reviewer',
        'budgetItems',
        'budgetItems.ucap',
        'investmentItems',
        'materialItems',
        'materialItems.material',
        'travelExpenses',
      ],
    });

    if (!survey) {
      throw new NotFoundException(`Survey with ID ${surveyId} not found`);
    }

    const actaProjectCode =
      survey.work?.recordNumber && survey.work?.companyId != null
        ? await this.workActaRepository
            .findOne({
              where: {
                companyId: survey.work.companyId,
                projectId: survey.work.projectId ?? IsNull(),
                actaNumber: survey.work.recordNumber,
              },
              select: ['actaNumber', 'projectCode'],
            })
            .then((a) => a?.projectCode ?? null)
        : null;

    const project = survey.work?.project;
    const company = survey.work?.company;
    const ippConfig = {
      baseYear: project?.ippBaseYear ?? company?.ippBaseYear ?? null,
      baseMonth: project?.ippBaseMonth ?? company?.ippBaseMonth ?? null,
      initialValue: project?.ippInitialValue ?? company?.ippInitialValue ?? null,
    };

    return {
      ...survey,
      surveyNumber: survey.projectCode,
      projectCode: actaProjectCode,
      ippConfig,
    };
  }

  /**
   * Lista de levantamientos, paginada.
   *
   * **No hidrata colecciones hijas**, y esa es la regla de la que depende que el proceso
   * siga en pie: `take(limit)` acota los levantamientos pero no sus hijos, así que traía
   * las filas de material —con su material completo— de los 500 que pide la pantalla de
   * crear requisición, para usar las de **uno**. Con 258 MB de heap eso es una caída.
   *
   * Quien necesite los materiales de un levantamiento pide su detalle en
   * `GET /surveys/:id`, que sí los trae.
   */
  async getSurveys(filters: FilterSurveysDto): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const query = this.surveyRepository.createQueryBuilder('survey')
      .leftJoinAndSelect('survey.work', 'work')
      .leftJoinAndSelect('work.company', 'company')
      .leftJoinAndSelect('work.project', 'project')
      .leftJoinAndSelect('survey.creator', 'creator')
      .leftJoinAndSelect('survey.assignedReviewer', 'assignedReviewer');

    const hasCompanyFilter = filters.companyId?.length;
    const hasProjectIdsFilter = filters.projectIds?.length;
    if (hasCompanyFilter || hasProjectIdsFilter) {
      const conditions: string[] = [];
      const params: Record<string, number[]> = {};

      if (hasCompanyFilter) {
        conditions.push('work.companyId IN (:...companyIds)');
        params.companyIds = filters.companyId!;
      }

      if (hasProjectIdsFilter) {
        conditions.push('work.projectId IN (:...projectIds)');
        params.projectIds = filters.projectIds!;
      }

      query.andWhere(`(${conditions.join(' OR ')})`, params);
    }

    if (filters.projectId) {
      query.andWhere('work.projectId = :projectId', { projectId: filters.projectId });
    }

    if (filters.workId) {
      query.andWhere('survey.workId = :workId', { workId: filters.workId });
    }

    if (filters.status) {
      query.andWhere('survey.status = :status', { status: filters.status });
    }

    if (filters.createdBy) {
      query.andWhere('survey.createdBy = :createdBy', { createdBy: filters.createdBy });
    }

    if (filters.projectCode) {
      query.andWhere('survey.projectCode ILIKE :projectCode', { projectCode: `%${filters.projectCode}%` });
    }

    if (filters.fromDate) {
      query.andWhere('survey.createdAt >= :fromDate', { fromDate: filters.fromDate });
    }

    if (filters.toDate) {
      query.andWhere('survey.createdAt <= :toDate', { toDate: filters.toDate });
    }

    query.orderBy('survey.createdAt', 'DESC');

    const [surveys, total] = await query.skip(skip).take(limit).getManyAndCount();

    const actaPairs = surveys
      .filter((s) => s.work?.companyId != null && s.work?.recordNumber)
      .map((s) => ({
        companyId: s.work!.companyId,
        projectId: s.work!.projectId ?? null,
        actaNumber: s.work!.recordNumber,
      }));
    const actaMap = await this.getActaProjectCodeMap(actaPairs);

    const data = surveys.map((survey) => ({
      ...survey,
      surveyNumber: survey.projectCode,
      projectCode:
        survey.work?.companyId != null && survey.work?.recordNumber
          ? actaMap.get(
              SurveysService.actaCodeKey(survey.work.companyId, survey.work.projectId, survey.work.recordNumber),
            ) || null
          : null,
    }));

    return { data, total, page, limit };
  }

  /**
   * Revisión general: una sola decisión sobre todo el levantamiento.
   *
   * **Arrastra los cuatro bloques**, y ese es el punto. Antes solo movía `status` y los
   * dejaba como estuvieran, así que aprobar por aquí duraba hasta la siguiente revisión
   * de un bloque: `updateGlobalStatus` recalculaba, veía bloques `pendiente` y devolvía
   * el levantamiento a «en revisión» sin que nadie lo hubiera desaprobado. Y rechazar no
   * marcaba ningún bloque, así que quien lo hizo no sabía qué corregir.
   */
  async reviewSurvey(surveyId: number, reviewDto: ReviewSurveyDto, userId: number): Promise<Survey> {
    const survey = await this.surveyRepository.findOne({
      where: { surveyId },
    });

    if (!survey) {
      throw new NotFoundException(`Survey with ID ${surveyId} not found`);
    }

    if (survey.status !== SurveyStatus.PENDING && survey.status !== SurveyStatus.IN_REVIEW) {
      throw new BadRequestException('Survey cannot be reviewed in current status');
    }

    // La revisión por bloque y «aprobar todo» ya lo exigían; decidir sobre el
    // levantamiento entero no puede ser el camino que se salta al revisor asignado.
    await this.assertPuedeRevisar(survey, userId);

    if (reviewDto.action === ReviewAction.APPROVE) {
      if (!reviewDto.previousMonthIpp) {
        throw new BadRequestException('Previous month IPP is required for approval');
      }
      survey.previousMonthIpp = reviewDto.previousMonthIpp;
      this.setAllBlocks(survey, BlockStatus.APPROVED);
      survey.rejectionComments = undefined;
    } else {
      if (!reviewDto.rejectionComments) {
        throw new BadRequestException('Rejection comments are required');
      }
      survey.rejectionComments = reviewDto.rejectionComments;
      // El motivo se copia a cada bloque: es la única forma de que quien lo hizo vea
      // marcado qué se le devolvió, igual que en un rechazo por bloque.
      this.setAllBlocks(survey, BlockStatus.REJECTED, reviewDto.rejectionComments);
    }

    // El estado global se deriva de los bloques, nunca se escribe a mano: así esta
    // decisión y la revisión por bloque no pueden contradecirse.
    this.updateGlobalStatus(survey);

    survey.reviewedBy = userId;
    survey.reviewDate = new Date();

    await this.surveyRepository.save(survey);

    const fullSurvey = await this.getSurvey(surveyId);
    const actor = await this.userRepository.findOne({ where: { userId } });
    this.sendSurveyNotification('reviewed', fullSurvey, {
      actor,
      approved: reviewDto.action === ReviewAction.APPROVE,
      comments: reviewDto.rejectionComments,
    }).catch(() => {});

    return fullSurvey;
  }

  async submitForReview(surveyId: number, userId: number): Promise<Survey> {
    const survey = await this.surveyRepository.findOne({
      where: { surveyId },
    });

    if (!survey) {
      throw new NotFoundException(`Survey with ID ${surveyId} not found`);
    }

    if (survey.status !== SurveyStatus.PENDING && survey.status !== SurveyStatus.REJECTED) {
      throw new BadRequestException('Only pending or rejected surveys can be submitted for review');
    }

    survey.status = SurveyStatus.IN_REVIEW;
    await this.surveyRepository.save(survey);

    const fullSurvey = await this.getSurvey(surveyId);
    const actor = await this.userRepository.findOne({ where: { userId } });
    this.sendSurveyNotification('submitted_for_review', fullSurvey, { actor }).catch(() => {});

    return fullSurvey;
  }

  async getSurveysForReview(): Promise<Survey[]> {
    return this.surveyRepository.find({
      where: { status: SurveyStatus.IN_REVIEW },
      relations: ['work', 'work.company', 'work.project', 'creator'],
      order: { createdAt: 'ASC' },
    });
  }

  async deleteSurvey(surveyId: number): Promise<void> {
    const survey = await this.surveyRepository.findOne({
      where: { surveyId },
    });

    if (!survey) {
      throw new NotFoundException(`Survey with ID ${surveyId} not found`);
    }

    if (survey.status === SurveyStatus.APPROVED) {
      throw new ForbiddenException('Cannot delete approved survey');
    }

    await this.surveyRepository.remove(survey);
  }

  // ============================================
  // UCAP METHODS
  // ============================================

  async getUcaps(companyId: number, projectId?: number): Promise<{
    ippConfig: {
      baseYear: number | null;
      baseMonth: number | null;
      initialValue: number | null;
    };
    ucaps: Ucap[];
  }> {
    // Get IPP config from project (if provided) or company
    let ippConfig = {
      baseYear: null as number | null,
      baseMonth: null as number | null,
      initialValue: null as number | null,
    };

    if (projectId) {
      const project = await this.projectRepository.findOne({
        where: { projectId },
        relations: ['company'],
      });

      if (project) {
        // Use project IPP if available, otherwise inherit from company
        ippConfig = {
          baseYear: project.ippBaseYear ?? project.company?.ippBaseYear ?? null,
          baseMonth: project.ippBaseMonth ?? project.company?.ippBaseMonth ?? null,
          initialValue: project.ippInitialValue ?? project.company?.ippInitialValue ?? null,
        };
      }
    } else {
      const company = await this.companyRepository.findOne({
        where: { companyId },
      });

      if (company) {
        ippConfig = {
          baseYear: company.ippBaseYear ?? null,
          baseMonth: company.ippBaseMonth ?? null,
          initialValue: company.ippInitialValue ?? null,
        };
      }
    }

    // Get UCAPs (con sus apellidos/variantes para el listado y el censo)
    const query = this.ucapRepository.createQueryBuilder('ucap')
      .leftJoinAndSelect('ucap.apellidos', 'apellidos')
      .where('ucap.companyId = :companyId', { companyId })
      .andWhere('ucap.isActive = true');

    if (projectId) {
      query.andWhere('(ucap.projectId = :projectId OR ucap.projectId IS NULL)', { projectId });
    }

    query.orderBy('ucap.code', 'ASC').addOrderBy('apellidos.sortOrder', 'ASC');

    const ucaps = await query.getMany();

    return { ippConfig, ucaps };
  }

  /**
   * Valor Total (con IPP) por obra, igual que el "Resumen de Acta":
   * valor = (Σ cantidad×vr.unitario de ítems del presupuesto + mano de obra) × factor IPP.
   * vr.unitario = rounded_value del UCAP (o unit_value del ítem si no hay UCAP).
   * factor IPP = previousMonthIpp del survey / ipp_initial_value (proyecto o empresa).
   */
  async getWorksValue(
    workIds: number[],
  ): Promise<
    { workId: number; value: number; baseIpp: number | null; mesIpp: number | null }[]
  > {
    const ids = (workIds || []).filter((n) => Number.isInteger(n));
    if (ids.length === 0) return [];

    // Valor = TOTAL AJUSTADO del presupuesto del levantamiento (igual que el detalle):
    //   por cada survey: SUBTOTAL = Σ(unit_value × quantity)  (sin mano de obra)
    //   factor IPP = survey.previous_month_ipp / ipp_initial_value (proyecto o empresa)
    //   total ajustado = SUBTOTAL × factor
    // Se aplica el factor por survey (cada levantamiento tiene su IPP) y se suma por obra.
    // base_ipp = IPP inicial del proyecto (o empresa); mes_ipp = IPP del mes del levantamiento.
    // Ambos se devuelven para mostrarlos por obra (un mismo work suele tener un solo survey).
    const rows: any[] = await this.surveyRepository.query(
      `SELECT s.work_id AS work_id,
              COALESCE(SUM(
                sub.total_base *
                CASE
                  WHEN bi.base_ipp > 0 AND s.previous_month_ipp IS NOT NULL AND s.previous_month_ipp > 0
                  THEN s.previous_month_ipp / bi.base_ipp
                  ELSE 1
                END
              ), 0)::float AS value,
              MAX(bi.base_ipp)::float AS base_ipp,
              MAX(s.previous_month_ipp)::float AS mes_ipp
       FROM surveys s
       JOIN LATERAL (
         SELECT COALESCE(SUM(sbi.quantity * sbi.unit_value), 0)::float AS total_base
         FROM survey_budget_items sbi
         WHERE sbi.survey_id = s.survey_id
       ) sub ON true
       JOIN LATERAL (
         SELECT COALESCE(p.ipp_initial_value, c.ipp_initial_value)::float AS base_ipp
         FROM works w
         LEFT JOIN projects p ON p.project_id = w.project_id
         LEFT JOIN companies c ON c.company_id = w.company_id
         WHERE w.work_id = s.work_id
       ) bi ON true
       WHERE s.work_id = ANY($1::int[])
       GROUP BY s.work_id`,
      [ids],
    );

    const rowMap = new Map<number, any>(
      rows.map((r) => [Number(r.work_id), r]),
    );

    return ids.map((workId) => {
      const r = rowMap.get(workId);
      return {
        workId,
        value: Math.round(Number(r?.value) || 0),
        baseIpp: r?.base_ipp != null ? Number(r.base_ipp) : null,
        mesIpp: r?.mes_ipp != null ? Number(r.mes_ipp) : null,
      };
    });
  }

  // ============================================
  // BLOCK REVIEW METHODS
  // ============================================

  async reviewBlock(
    surveyId: number,
    reviewBlockDto: ReviewBlockDto,
    userId: number,
  ): Promise<Survey> {
    const survey = await this.surveyRepository.findOne({
      where: { surveyId },
    });

    if (!survey) {
      throw new NotFoundException(`Survey with ID ${surveyId} not found`);
    }

    await this.assertPuedeRevisar(survey, userId);

    // Map block to status
    const newStatus: BlockStatus =
      reviewBlockDto.status === BlockReviewStatus.APPROVED
        ? BlockStatus.APPROVED
        : BlockStatus.REJECTED;

    switch (reviewBlockDto.block) {
      case SurveyBlock.BUDGET:
        survey.budgetStatus = newStatus;
        survey.budgetComments = reviewBlockDto.comments;
        break;
      case SurveyBlock.INVESTMENT:
        survey.investmentStatus = newStatus;
        survey.investmentComments = reviewBlockDto.comments;
        break;
      case SurveyBlock.MATERIALS:
        survey.materialsStatus = newStatus;
        survey.materialsComments = reviewBlockDto.comments;
        break;
      case SurveyBlock.TRAVEL_EXPENSES:
        survey.travelExpensesStatus = newStatus;
        survey.travelExpensesComments = reviewBlockDto.comments;
        break;
    }

    // Update reviewer info
    survey.reviewedBy = userId;
    survey.reviewDate = new Date();

    // Check if all blocks are approved to update global status
    this.updateGlobalStatus(survey);

    await this.surveyRepository.save(survey);

    const fullSurvey = await this.getSurvey(surveyId);
    const actor = await this.userRepository.findOne({ where: { userId } });
    this.sendSurveyNotification('block_reviewed', fullSurvey, {
      actor,
      approved: newStatus === BlockStatus.APPROVED,
      blockName: this.getSurveyBlockLabel(reviewBlockDto.block),
      comments: reviewBlockDto.comments,
    }).catch(() => {});

    return fullSurvey;
  }

  async approveAllBlocks(
    surveyId: number,
    userId: number,
    previousMonthIpp?: number,
  ): Promise<Survey> {
    const survey = await this.surveyRepository.findOne({
      where: { surveyId },
    });

    if (!survey) {
      throw new NotFoundException(`Survey with ID ${surveyId} not found`);
    }

    await this.assertPuedeRevisar(survey, userId);

    // Aprobar sin IPP dejaba el levantamiento aprobado con el factor en blanco, y de ese
    // factor sale el valor de la obra. Se acepta el que ya tenga guardado; lo que no se
    // acepta es aprobar sin ninguno.
    if (previousMonthIpp) {
      survey.previousMonthIpp = previousMonthIpp;
    } else if (!survey.previousMonthIpp) {
      throw new BadRequestException(
        'Debe registrarse el IPP del mes anterior antes de aprobar el levantamiento',
      );
    }

    this.setAllBlocks(survey, BlockStatus.APPROVED);
    survey.rejectionComments = undefined;

    this.updateGlobalStatus(survey);
    survey.reviewedBy = userId;
    survey.reviewDate = new Date();

    await this.surveyRepository.save(survey);

    const fullSurvey = await this.getSurvey(surveyId);
    const actor = await this.userRepository.findOne({ where: { userId } });
    this.sendSurveyNotification('approved_all', fullSurvey, { actor }).catch(() => {});

    return fullSurvey;
  }

  async reopenForEditing(
    surveyId: number,
    userId: number,
    reason?: string,
  ): Promise<Survey> {
    const survey = await this.surveyRepository.findOne({
      where: { surveyId },
    });

    if (!survey) {
      throw new NotFoundException(`Survey with ID ${surveyId} not found`);
    }

    // Validar que el usuario es el Director Técnico asignado o tiene rol privilegiado
    if (survey.assignedReviewerId && survey.assignedReviewerId !== userId) {
      const user = await this.userRepository.findOne({
        where: { userId },
        relations: ['role'],
      });
      const rol = user?.role?.nombreRol;
      if (rol !== 'Director Técnico' && rol !== 'Analista PMO') {
        throw new ForbiddenException(
          'Solo el Director Técnico asignado puede reabrir este levantamiento',
        );
      }
    }

    // Reset all block statuses to pending
    survey.budgetStatus = BlockStatus.PENDING;
    survey.investmentStatus = BlockStatus.PENDING;
    survey.materialsStatus = BlockStatus.PENDING;
    survey.travelExpensesStatus = BlockStatus.PENDING;

    // Clear all block comments
    survey.budgetComments = undefined;
    survey.investmentComments = undefined;
    survey.materialsComments = undefined;
    survey.travelExpensesComments = undefined;

    // Reset global status to pending
    survey.status = SurveyStatus.PENDING;

    // Store reopen reason in rejection comments (for audit trail)
    if (reason) {
      survey.rejectionComments = `Reabierto para edición: ${reason}`;
    }

    // Update reviewer info (who reopened it)
    survey.reviewedBy = userId;
    survey.reviewDate = new Date();

    await this.surveyRepository.save(survey);

    const fullSurvey = await this.getSurvey(surveyId);
    const actor = await this.userRepository.findOne({ where: { userId } });
    this.sendSurveyNotification('reopened', fullSurvey, {
      actor,
      comments: reason,
    }).catch(() => {});

    return fullSurvey;
  }

  /**
   * Solo el Director Técnico asignado revisa su levantamiento. Sin revisor asignado, el
   * permiso basta. La usan los tres caminos de revisión —por bloque, aprobar todo y
   * revisión general— para que ninguno sea la puerta de atrás de los otros.
   */
  private async assertPuedeRevisar(survey: Survey, userId: number): Promise<void> {
    if (!survey.assignedReviewerId || survey.assignedReviewerId === userId) return;

    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['role'],
    });
    const rol = user?.role?.nombreRol;
    if (rol !== 'Director Técnico' && rol !== 'Analista PMO') {
      throw new ForbiddenException(
        'Solo el Director Técnico asignado puede revisar este levantamiento',
      );
    }
  }

  /** Deja los cuatro bloques en el mismo estado, con el mismo comentario. */
  private setAllBlocks(survey: Survey, status: BlockStatus, comments?: string): void {
    survey.budgetStatus = status;
    survey.investmentStatus = status;
    survey.materialsStatus = status;
    survey.travelExpensesStatus = status;

    survey.budgetComments = comments;
    survey.investmentComments = comments;
    survey.materialsComments = comments;
    survey.travelExpensesComments = comments;
  }

  private updateGlobalStatus(survey: Survey): void {
    const allApproved =
      survey.budgetStatus === BlockStatus.APPROVED &&
      survey.investmentStatus === BlockStatus.APPROVED &&
      survey.materialsStatus === BlockStatus.APPROVED &&
      survey.travelExpensesStatus === BlockStatus.APPROVED;

    const anyRejected =
      survey.budgetStatus === BlockStatus.REJECTED ||
      survey.investmentStatus === BlockStatus.REJECTED ||
      survey.materialsStatus === BlockStatus.REJECTED ||
      survey.travelExpensesStatus === BlockStatus.REJECTED;

    if (allApproved) {
      survey.status = SurveyStatus.APPROVED;
    } else if (anyRejected) {
      survey.status = SurveyStatus.REJECTED;
    } else {
      survey.status = SurveyStatus.IN_REVIEW;
    }
  }

  // ============================================
  // DATABASE ENDPOINT (FULL DATA)
  // ============================================

  async getSurveyDatabase(
    filters: FilterSurveysDto,
    userId: number,
    permissions: string[] = [],
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Get user access
    const userAccess = await this.getMyAccess(userId, permissions);
    const accessibleCompanyIds = userAccess.companies.map((c) => c.companyId);
    const accessibleProjectIds = userAccess.projects.map((p) => p.projectId);

    /*
     * Esta es la vista de lista, no el detalle: por eso trae los ítems del presupuesto
     * —de ahí sale `budgetTotal`— y **ningún** otro detalle de los levantamientos.
     *
     * Antes traía además las UCAP de cada ítem, los de inversión, los materiales con su
     * material y los costos de viaje, y los devolvía enteros. Con `limit=500` eso es
     * medio módulo de Obras hidratado como objetos en memoria: el proceso murió con
     * `JavaScript heap out of memory` a los 251 MB y Render lo reinició, que es lo que en
     * el navegador se veía como un error de CORS —sin respuesta no hay cabeceras—.
     *
     * Si algún día esta pantalla necesita el desglose, se pide por levantamiento, no de a
     * quinientos.
     */
    const query = this.surveyRepository.createQueryBuilder('survey')
      .leftJoinAndSelect('survey.work', 'work')
      .leftJoinAndSelect('work.company', 'company')
      .leftJoinAndSelect('work.project', 'project')
      .leftJoinAndSelect('survey.creator', 'creator')
      .leftJoinAndSelect('survey.assignedReviewer', 'assignedReviewer')
      .leftJoinAndSelect('survey.reviewer', 'reviewer')
      .leftJoinAndSelect('survey.budgetItems', 'budgetItems');

    // Apply user access filter (only companies/projects the user has access to)
    if (accessibleCompanyIds.length > 0 || accessibleProjectIds.length > 0) {
      const conditions: string[] = [];
      if (accessibleCompanyIds.length > 0) {
        conditions.push('work.companyId IN (:...accessibleCompanyIds)');
      }
      if (accessibleProjectIds.length > 0) {
        conditions.push('work.projectId IN (:...accessibleProjectIds)');
      }
      query.andWhere(`(${conditions.join(' OR ')})`, {
        accessibleCompanyIds: accessibleCompanyIds.length > 0 ? accessibleCompanyIds : [0],
        accessibleProjectIds: accessibleProjectIds.length > 0 ? accessibleProjectIds : [0],
      });
    } else {
      // User has no access, return empty result
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    // Apply location filters with OR logic between companyId and projectIds
    const hasCompanyFilter = filters.companyId?.length;
    const hasProjectIdsFilter = filters.projectIds?.length;
    if (hasCompanyFilter || hasProjectIdsFilter) {
      const locConditions: string[] = [];
      const locParams: Record<string, any> = {};
      if (hasCompanyFilter) {
        locConditions.push('work.companyId IN (:...locCompanyIds)');
        locParams.locCompanyIds = filters.companyId;
      }
      if (hasProjectIdsFilter) {
        locConditions.push('work.projectId IN (:...locProjectIds)');
        locParams.locProjectIds = filters.projectIds;
      }
      query.andWhere(`(${locConditions.join(' OR ')})`, locParams);
    }

    if (filters.projectId) {
      query.andWhere('work.projectId = :projectId', { projectId: filters.projectId });
    }

    if (filters.status) {
      query.andWhere('survey.status = :status', { status: filters.status });
    }

    if (filters.createdBy) {
      query.andWhere('survey.createdBy = :createdBy', { createdBy: filters.createdBy });
    }

    if (filters.fromDate) {
      query.andWhere('survey.createdAt >= :fromDate', { fromDate: filters.fromDate });
    }

    if (filters.toDate) {
      query.andWhere('survey.createdAt <= :toDate', { toDate: filters.toDate });
    }

    // Search filter
    if (filters.search) {
      query.andWhere(
        '(survey.projectCode ILIKE :search OR work.name ILIKE :search OR work.recordNumber ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    // Block status filters
    if (filters.budgetStatus) {
      query.andWhere('survey.budgetStatus = :budgetStatus', { budgetStatus: filters.budgetStatus });
    }

    if (filters.investmentStatus) {
      query.andWhere('survey.investmentStatus = :investmentStatus', { investmentStatus: filters.investmentStatus });
    }

    if (filters.materialsStatus) {
      query.andWhere('survey.materialsStatus = :materialsStatus', { materialsStatus: filters.materialsStatus });
    }

    if (filters.travelExpensesStatus) {
      query.andWhere('survey.travelExpensesStatus = :travelExpensesStatus', { travelExpensesStatus: filters.travelExpensesStatus });
    }

    query.orderBy('survey.createdAt', 'DESC');

    const [surveys, total] = await query.skip(skip).take(limit).getManyAndCount();

    const actaPairsDb = surveys
      .filter((s) => s.work?.companyId != null && s.work?.recordNumber)
      .map((s) => ({
        companyId: s.work!.companyId,
        projectId: s.work!.projectId ?? null,
        actaNumber: s.work!.recordNumber,
      }));
    const actaMapDb = await this.getActaProjectCodeMap(actaPairsDb);

    // Transform to include calculated fields
    const data = surveys.map((survey) => ({
      surveyId: survey.surveyId,
      surveyNumber: survey.projectCode,
      projectCode:
        survey.work?.companyId != null && survey.work?.recordNumber
          ? actaMapDb.get(
              SurveysService.actaCodeKey(survey.work.companyId, survey.work.projectId, survey.work.recordNumber),
            ) || null
          : null,
      status: survey.status,

      // Work data
      workId: survey.work?.workId,
      workCode: survey.work?.workCode,
      workName: survey.work?.name,
      recordNumber: survey.work?.recordNumber,
      sectorVillage: survey.work?.sectorVillage,
      neighborhood: survey.work?.neighborhood,
      address: survey.work?.address,
      zone: survey.work?.zone,
      areaType: survey.work?.areaType,
      requestType: survey.work?.requestType,
      userName: survey.work?.userName,
      userAddress: survey.work?.userAddress,
      requestingEntity: survey.work?.requestingEntity,

      // Company/Project
      companyId: survey.work?.company?.companyId,
      companyName: survey.work?.company?.name,
      projectId: survey.work?.project?.projectId,
      projectName: survey.work?.project?.name,

      // Dates
      requestDate: survey.requestDate,
      surveyDate: survey.surveyDate,
      createdAt: survey.createdAt,
      reviewDate: survey.reviewDate,

      // Users
      createdBy: survey.creator?.nombre,
      receivedBy: survey.receivedBy,
      assignedReviewer: survey.assignedReviewer?.nombre,
      reviewedBy: survey.reviewer?.nombre,

      // Requirements
      requiresPhotometricStudies: survey.requiresPhotometricStudies,
      requiresRetieCertification: survey.requiresRetieCertification,
      requiresRetilapCertification: survey.requiresRetilapCertification,
      requiresCivilWork: survey.requiresCivilWork,

      // IPP
      previousMonthIpp: survey.previousMonthIpp,

      // Block statuses
      budgetStatus: survey.budgetStatus,
      budgetComments: survey.budgetComments,
      investmentStatus: survey.investmentStatus,
      investmentComments: survey.investmentComments,
      materialsStatus: survey.materialsStatus,
      materialsComments: survey.materialsComments,
      travelExpensesStatus: survey.travelExpensesStatus,
      travelExpensesComments: survey.travelExpensesComments,

      // Del presupuesto solo va el total: la lista muestra una cifra por fila, no el
      // desglose, y devolver los ítems de quinientos levantamientos es lo que tumbaba
      // el proceso.
      budgetTotal: survey.budgetItems?.reduce(
        (sum, item) => sum + Number(item.budgetedValue || 0),
        0,
      ),

      // URLs
      sketchUrl: survey.sketchUrl,
      mapUrl: survey.mapUrl,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Mapa de código de contabilidad por acta, con clave compuesta
   * `${companyId}|${projectId ?? 0}|${actaNumber}`.
   * El número de acta se reutiliza entre municipios (proyectos), así que se debe
   * consultar por empresa + proyecto + número.
   */
  static actaCodeKey(companyId: number, projectId: number | null | undefined, actaNumber: string) {
    return `${companyId}|${projectId ?? 0}|${actaNumber}`;
  }

  private async getActaProjectCodeMap(
    pairs: Array<{ companyId: number; projectId: number | null; actaNumber: string }>,
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const uniquePairs = new Map<string, { companyId: number; projectId: number | null; actaNumber: string }>();
    for (const p of pairs) {
      if (p.companyId == null || !p.actaNumber) continue;
      uniquePairs.set(SurveysService.actaCodeKey(p.companyId, p.projectId, p.actaNumber), p);
    }
    if (uniquePairs.size === 0) return map;

    const qb = this.workActaRepository
      .createQueryBuilder('acta')
      .select(['acta.companyId', 'acta.projectId', 'acta.actaNumber', 'acta.projectCode']);
    const ors: string[] = [];
    const params: Record<string, number | string> = {};
    let i = 0;
    for (const p of uniquePairs.values()) {
      if (p.projectId == null) {
        ors.push(`(acta.companyId = :c${i} AND acta.projectId IS NULL AND acta.actaNumber = :a${i})`);
      } else {
        ors.push(`(acta.companyId = :c${i} AND acta.projectId = :p${i} AND acta.actaNumber = :a${i})`);
        params[`p${i}`] = p.projectId;
      }
      params[`c${i}`] = p.companyId;
      params[`a${i}`] = p.actaNumber;
      i++;
    }
    qb.where(`(${ors.join(' OR ')})`, params);

    const actas = await qb.getMany();
    actas.forEach((a) => {
      if (a.projectCode) {
        map.set(SurveysService.actaCodeKey(a.companyId, a.projectId, a.actaNumber), a.projectCode);
      }
    });
    return map;
  }

  private async generateProjectCode(companyId: number, projectId?: number): Promise<string> {
    const abbreviation = await this.getAbbreviation(companyId, projectId);
    const year = new Date().getFullYear().toString().slice(-2);

    // Take the HIGHEST existing sequence (not the count) for this company/project
    // this year and add 1. Using MAX instead of COUNT keeps the sequence monotonic:
    // it never reuses the number of a survey that was deleted, which would otherwise
    // produce duplicate project codes (there is no unique constraint to catch it).
    // The sequence is the first 4 digits after the dash: `${abbr}-SSSSYY`.
    const query = this.surveyRepository.createQueryBuilder('survey')
      .innerJoin('survey.work', 'work')
      .select(
        `COALESCE(MAX(CAST(SUBSTRING(SPLIT_PART(survey.project_code, '-', 2) FROM 1 FOR 4) AS INTEGER)), 0)`,
        'maxSeq',
      )
      .where('work.companyId = :companyId', { companyId })
      .andWhere('survey.projectCode LIKE :pattern', { pattern: `${abbreviation}-%${year}` });

    if (projectId) {
      query.andWhere('work.projectId = :projectId', { projectId });
    }

    const raw = await query.getRawOne<{ maxSeq: string | number }>();
    const maxSeq = Number(raw?.maxSeq ?? 0);
    const sequence = (maxSeq + 1).toString().padStart(4, '0');

    return `${abbreviation}-${sequence}${year}`;
  }

  private async generateWorkCode(companyId: number, projectId: number | undefined, recordNumber: string): Promise<string> {
    const abbreviation = await this.getAbbreviation(companyId, projectId);
    // Remove dash from record number: "03-2025" -> "032025"
    const cleanRecord = recordNumber.replace(/-/g, '');
    return `${abbreviation}00${cleanRecord}`;
  }

  private async getAbbreviation(companyId: number, projectId?: number): Promise<string> {
    if (projectId) {
      const project = await this.projectRepository.findOne({
        where: { projectId },
      });
      if (project?.abbreviation) {
        return project.abbreviation;
      }
    }

    const company = await this.companyRepository.findOne({
      where: { companyId },
    });

    return company?.abbreviation || 'XX';
  }

  private async saveBudgetItems(surveyId: number, items: any[]): Promise<void> {
    for (const item of items) {
      const ucap = await this.ucapRepository.findOne({
        where: { ucapId: item.ucapId },
      });

      if (!ucap) continue;

      const budgetItem = this.budgetItemRepository.create({
        surveyId,
        ucapId: item.ucapId,
        quantity: item.quantity,
        unitValue: ucap.roundedValue,
        budgetedValue: item.quantity * Number(ucap.roundedValue),
        initialIpp: ucap.initialIpp,
      });

      await this.budgetItemRepository.save(budgetItem);
    }
  }

  private async saveInvestmentItems(surveyId: number, items: any[]): Promise<void> {
    const investmentItems = items.map((item, index) =>
      this.investmentItemRepository.create({
        surveyId,
        orderNumber: item.orderNumber ?? index,
        point: item.point,
        description: item.description,
        luminaireQuantity: item.luminaireQuantity || 0,
        relocatedLuminaireQuantity: item.relocatedLuminaireQuantity || 0,
        poleQuantity: item.poleQuantity || 0,
        braidedNetwork: item.braidedNetwork || 0,
        latitude: item.latitude,
        longitude: item.longitude,
      }),
    );

    await this.investmentItemRepository.save(investmentItems);
  }

  private async saveMaterials(surveyId: number, items: any[]): Promise<void> {
    const materials = items.map((item) =>
      this.materialRepository.create({
        surveyId,
        materialId: item.materialId,
        materialCode: item.materialCode,
        description: item.description,
        unitOfMeasure: item.unitOfMeasure,
        quantity: item.quantity,
        observations: item.observations,
      }),
    );

    await this.materialRepository.save(materials);
  }

  private async saveTravelExpenses(surveyId: number, items: any[]): Promise<void> {
    const expenses = items.map((item) =>
      this.travelExpenseRepository.create({
        surveyId,
        expenseType: item.expenseType,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? null,
        observations: item.observations,
      }),
    );

    await this.travelExpenseRepository.save(expenses);
  }

  // ============================================
  // REVIEWER ACCESS METHODS
  // ============================================

  /**
   * Get the companies and projects the current user has access to review.
   * Global reviewers (levantamientos:revisar / levantamientos:aprobar) see all companies.
   */
  async getMyAccess(
    userId: number,
    permissions: string[] = [],
  ): Promise<{
    companies: { companyId: number; name: string }[];
    projects: { projectId: number; name: string; companyId: number }[];
    isGlobalReviewer?: boolean;
  }> {
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['role'],
    });
    const roleName = user?.role?.nombreRol || '';

    const isGlobalReviewer =
      permissions.includes('levantamientos:revisar') ||
      permissions.includes('levantamientos:aprobar') ||
      permissions.includes('levantamientos:presupuesto') ||
      permissions.includes('levantamientos:autorizar');

    const hasOperationalSurveyAccess = roleName === 'Coordinador Operativo';

    // El Director de Proyecto tiene "Revisar" sobre su propio departamento, lo
    // que lo marcaría como revisor global. Cargamos sus accesos primero: si
    // tiene accesos explícitos asignados se respetan (queda acotado a su
    // departamento); solo si no tiene ninguno se cae al comportamiento global.
    const isProjectDirector = roleName.startsWith('Director de Proyecto');

    const accesses = await this.surveyReviewerAccessRepository.find({
      where: { userId },
      relations: ['company', 'project', 'project.company'],
    });

    const scopedByAccess = isProjectDirector && accesses.length > 0;

    if (!scopedByAccess && (isGlobalReviewer || hasOperationalSurveyAccess)) {
      const [allCompanies, allProjects] = await Promise.all([
        this.companyRepository.find({ select: ['companyId', 'name'], order: { name: 'ASC' } }),
        this.projectRepository.find({ select: ['projectId', 'name', 'companyId'], order: { name: 'ASC' } }),
      ]);
      return {
        companies: allCompanies.map((c) => ({ companyId: c.companyId, name: c.name })),
        projects: allProjects.map((p) => ({ projectId: p.projectId, name: p.name, companyId: p.companyId })),
        isGlobalReviewer,
      };
    }

    const companies: { companyId: number; name: string }[] = [];
    const projects: { projectId: number; name: string; companyId: number }[] = [];

    for (const access of accesses) {
      if (access.companyId && access.company) {
        companies.push({
          companyId: access.company.companyId,
          name: access.company.name,
        });
      }
      if (access.projectId && access.project) {
        projects.push({
          projectId: access.project.projectId,
          name: access.project.name,
          companyId: access.project.companyId,
        });
      }
    }

    return { companies, projects };
  }

  /**
   * Get all access entries for a specific user (admin)
   */
  async getUserAccess(userId: number): Promise<SurveyReviewerAccess[]> {
    return this.surveyReviewerAccessRepository.find({
      where: { userId },
      relations: ['company', 'project', 'user'],
    });
  }

  /**
   * Add access for a user to a company or project (admin)
   */
  async addUserAccess(
    userId: number,
    companyId?: number,
    projectId?: number,
  ): Promise<SurveyReviewerAccess> {
    // Validate that either companyId or projectId is provided, but not both
    if ((!companyId && !projectId) || (companyId && projectId)) {
      throw new BadRequestException(
        'Must provide either companyId or projectId, but not both',
      );
    }

    // Validate user exists
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Validate company or project exists
    if (companyId) {
      const company = await this.companyRepository.findOne({ where: { companyId } });
      if (!company) {
        throw new NotFoundException(`Company with ID ${companyId} not found`);
      }
    }

    if (projectId) {
      const project = await this.projectRepository.findOne({ where: { projectId } });
      if (!project) {
        throw new NotFoundException(`Project with ID ${projectId} not found`);
      }
    }

    // Check for duplicate
    const existing = await this.surveyReviewerAccessRepository.findOne({
      where: {
        userId,
        companyId: companyId || undefined,
        projectId: projectId || undefined,
      },
    });

    if (existing) {
      throw new BadRequestException('Access already exists for this user');
    }

    const access = this.surveyReviewerAccessRepository.create({
      userId,
      companyId: companyId || null,
      projectId: projectId || null,
    });

    return this.surveyReviewerAccessRepository.save(access);
  }

  /**
   * Remove access entry (admin)
   */
  async removeUserAccess(accessId: number): Promise<void> {
    const access = await this.surveyReviewerAccessRepository.findOne({
      where: { accessId },
    });

    if (!access) {
      throw new NotFoundException(`Access with ID ${accessId} not found`);
    }

    await this.surveyReviewerAccessRepository.remove(access);
  }

  /**
   * Create a new UCAP for a company/project
   */
  async createUcap(dto: CreateUcapDto): Promise<Ucap> {
    const company = await this.companyRepository.findOne({ where: { companyId: dto.companyId } });
    if (!company) {
      throw new NotFoundException(`Company with ID ${dto.companyId} not found`);
    }

    if (dto.projectId) {
      const project = await this.projectRepository.findOne({ where: { projectId: dto.projectId } });
      if (!project) {
        throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
      }
    }

    const existing = await this.ucapRepository.findOne({
      where: {
        code: dto.code,
        companyId: dto.companyId,
        projectId: dto.projectId ?? IsNull(),
      },
    });
    if (existing) {
      throw new BadRequestException(`Ya existe una UCAP con código "${dto.code}" en este proyecto/empresa`);
    }

    const ucapData: Partial<Ucap> = {
      companyId: dto.companyId,
      code: dto.code,
      description: dto.description,
      roundedValue: dto.roundedValue,
      initialIpp: dto.initialIpp,
      isActive: true,
    };
    if (dto.projectId) {
      ucapData.projectId = dto.projectId;
    }

    const ucap = this.ucapRepository.create(ucapData as Ucap);
    return this.ucapRepository.save(ucap);
  }

  async updateUcap(ucapId: number, dto: UpdateUcapDto): Promise<Ucap> {
    const ucap = await this.ucapRepository.findOne({ where: { ucapId } });
    if (!ucap) {
      throw new NotFoundException(`UCAP with ID ${ucapId} not found`);
    }

    if (dto.code && dto.code !== ucap.code) {
      const existing = await this.ucapRepository.findOne({
        where: {
          code: dto.code,
          companyId: ucap.companyId,
          projectId: ucap.projectId ?? IsNull(),
        },
      });
      if (existing) {
        throw new BadRequestException(`Ya existe una UCAP con código "${dto.code}" en este proyecto/empresa`);
      }
    }

    if (dto.code !== undefined) ucap.code = dto.code;
    if (dto.description !== undefined) ucap.description = dto.description;
    if (dto.roundedValue !== undefined) ucap.roundedValue = dto.roundedValue;
    if (dto.initialIpp !== undefined) ucap.initialIpp = dto.initialIpp;

    return this.ucapRepository.save(ucap);
  }

  /**
   * Get all users with survey review access (admin)
   */
  async getAllUsersWithAccess(): Promise<{
    userId: number;
    userName: string;
    accesses: SurveyReviewerAccess[];
  }[]> {
    const accesses = await this.surveyReviewerAccessRepository.find({
      relations: ['user', 'company', 'project'],
    });

    // Group by user
    const userMap = new Map<number, {
      userId: number;
      userName: string;
      accesses: SurveyReviewerAccess[];
    }>();

    for (const access of accesses) {
      if (!userMap.has(access.userId)) {
        userMap.set(access.userId, {
          userId: access.userId,
          userName: access.user?.nombre || 'Unknown',
          accesses: [],
        });
      }
      userMap.get(access.userId)!.accesses.push(access);
    }

    return Array.from(userMap.values());
  }

  // ============================================
  // WORK ACTA WORKFLOW METHODS
  // ============================================

  private normalizeAnnualPlanScope(year: number, municipio: string, zone?: string) {
    if (!Number.isFinite(year) || year < 2000 || !municipio?.trim()) {
      throw new BadRequestException('Año y municipio son obligatorios');
    }

    return {
      year,
      municipio: municipio.trim(),
      zone: zone?.trim() || 'all',
    };
  }

  async getAnnualPlanReview(year: number, municipio: string, zone?: string): Promise<AnnualPlanReview | null> {
    const scope = this.normalizeAnnualPlanScope(year, municipio, zone);
    return this.annualPlanReviewRepository.findOne({ where: scope });
  }

  async reviewAnnualPlan(
    year: number,
    municipio: string,
    zone: string | undefined,
    decision: 'aprobado' | 'rechazado',
    comment: string | undefined,
    userId: number,
  ): Promise<AnnualPlanReview> {
    const scope = this.normalizeAnnualPlanScope(year, municipio, zone);
    if (decision !== AnnualPlanReviewStatus.APROBADO && decision !== AnnualPlanReviewStatus.RECHAZADO) {
      throw new BadRequestException('Decisión de revisión inválida');
    }

    let review = await this.annualPlanReviewRepository.findOne({ where: scope });
    if (!review) {
      review = this.annualPlanReviewRepository.create(scope);
    }

    review.status = decision as AnnualPlanReviewStatus;
    review.comment = comment?.trim() || null;
    review.reviewedBy = userId;
    review.reviewedAt = new Date();

    return this.annualPlanReviewRepository.save(review);
  }

  async getActaSummaryDraft(
    companyId: number,
    projectId: number | null,
    actaNumber: string,
  ): Promise<{
    payload: Record<string, any> | null;
    updatedAt: Date | null;
    updatedBy: number | null;
  }> {
    if (!Number.isFinite(companyId) || companyId <= 0 || !actaNumber?.trim()) {
      throw new BadRequestException('Empresa y número de acta son obligatorios');
    }

    const draft = await this.actaSummaryDraftRepository.findOne({
      where: { companyId, projectId: projectId ?? IsNull(), actaNumber: actaNumber.trim() },
    });

    return {
      payload: draft?.payload ?? null,
      updatedAt: draft?.updatedAt ?? null,
      updatedBy: draft?.updatedBy ?? null,
    };
  }

  async saveActaSummaryDraft(
    companyId: number,
    projectId: number | null,
    actaNumber: string,
    payload: Record<string, any>,
    userId: number,
  ): Promise<{
    payload: Record<string, any>;
    updatedAt: Date;
    updatedBy: number | null;
  }> {
    if (!Number.isFinite(companyId) || companyId <= 0 || !actaNumber?.trim()) {
      throw new BadRequestException('Empresa y número de acta son obligatorios');
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('El contenido del acta no es válido');
    }

    const company = await this.companyRepository.findOne({ where: { companyId } });
    if (!company) {
      throw new BadRequestException('La empresa del acta no existe');
    }

    const normalizedActaNumber = actaNumber.trim();
    let draft = await this.actaSummaryDraftRepository.findOne({
      where: { companyId, projectId: projectId ?? IsNull(), actaNumber: normalizedActaNumber },
    });

    if (!draft) {
      draft = this.actaSummaryDraftRepository.create({
        companyId,
        projectId: projectId ?? null,
        actaNumber: normalizedActaNumber,
        payload,
        createdBy: userId,
        updatedBy: userId,
      });
    } else {
      draft.payload = payload;
      draft.updatedBy = userId;
    }

    const saved = await this.actaSummaryDraftRepository.save(draft);
    return {
      payload: saved.payload,
      updatedAt: saved.updatedAt,
      updatedBy: saved.updatedBy,
    };
  }

  async getWorkActa(
    companyId: number,
    projectId: number | null,
    actaNumber: string,
  ): Promise<WorkActa | null> {
    return this.workActaRepository.findOne({
      where: { companyId, projectId: projectId ?? IsNull(), actaNumber },
    });
  }

  async getWorkActas(
    pairs: Array<{ companyId: number; projectId: number | null; actaNumber: string }>,
  ): Promise<WorkActa[]> {
    const valid = pairs.filter((p) => p.companyId != null && p.actaNumber);
    if (!valid.length) return [];
    const qb = this.workActaRepository.createQueryBuilder('acta');
    const ors: string[] = [];
    const params: Record<string, number | string> = {};
    valid.forEach((p, i) => {
      if (p.projectId == null) {
        ors.push(`(acta.companyId = :c${i} AND acta.projectId IS NULL AND acta.actaNumber = :a${i})`);
      } else {
        ors.push(`(acta.companyId = :c${i} AND acta.projectId = :p${i} AND acta.actaNumber = :a${i})`);
        params[`p${i}`] = p.projectId;
      }
      params[`c${i}`] = p.companyId;
      params[`a${i}`] = p.actaNumber;
    });
    return qb.where(`(${ors.join(' OR ')})`, params).getMany();
  }

  async submitActaForReview(
    companyId: number,
    projectId: number | null,
    actaNumber: string,
    userId: number,
  ): Promise<WorkActa> {
    const user = await this.userRepository.findOne({ where: { userId }, relations: ['role'] });
    const rol = user?.role?.nombreRol;
    if (!rol?.startsWith('Director de Proyecto') && rol !== 'Analista PMO') {
      throw new ForbiddenException('Solo el Director de Proyecto puede enviar el acta a revisión');
    }

    let acta = await this.workActaRepository.findOne({
      where: { companyId, projectId: projectId ?? IsNull(), actaNumber },
    });
    if (!acta) {
      acta = this.workActaRepository.create({
        companyId,
        projectId: projectId ?? null,
        actaNumber,
        status: ActaStatus.BORRADOR,
        createdBy: userId,
      });
    }

    if (acta.status !== ActaStatus.BORRADOR) {
      throw new BadRequestException(
        `El acta está en estado "${acta.status}" y no puede enviarse a revisión`,
      );
    }

    acta.status = ActaStatus.EN_REVISION;
    acta.createdBy = userId;
    acta.rejectionComment = null;
    const savedActa = await this.workActaRepository.save(acta);
    this.sendActaNotification('submitted_for_review', savedActa, { actor: user }).catch(() => {});

    return savedActa;
  }

  async reviewActa(
    companyId: number,
    projectId: number | null,
    actaNumber: string,
    approved: boolean,
    comment: string | undefined,
    userId: number,
  ): Promise<WorkActa> {
    const user = await this.userRepository.findOne({ where: { userId }, relations: ['role'] });
    const rol = user?.role?.nombreRol;
    if (rol !== 'Director Técnico' && rol !== 'Analista PMO') {
      throw new ForbiddenException('Solo el Director Técnico puede revisar el acta');
    }

    const acta = await this.workActaRepository.findOne({
      where: { companyId, projectId: projectId ?? IsNull(), actaNumber },
    });
    if (!acta) throw new NotFoundException(`Acta "${actaNumber}" no encontrada`);
    if (acta.status !== ActaStatus.EN_REVISION) {
      throw new BadRequestException('El acta no está en estado de revisión');
    }

    if (approved) {
      acta.status = ActaStatus.EN_APROBACION;
      acta.reviewedBy = userId;
      acta.reviewedAt = new Date();
      acta.rejectionComment = null;
    } else {
      acta.status = ActaStatus.BORRADOR;
      acta.rejectionComment = comment || 'Sin comentarios';
    }

    const savedActa = await this.workActaRepository.save(acta);
    this.sendActaNotification('reviewed', savedActa, {
      actor: user,
      approved,
      comments: approved ? undefined : savedActa.rejectionComment || undefined,
    }).catch(() => {});

    if (approved) {
      this.sendActaNotification('for_approval', savedActa, { actor: user }).catch(() => {});
    }

    return savedActa;
  }

  async approveActa(
    companyId: number,
    projectId: number | null,
    actaNumber: string,
    projectCode: string,
    userId: number,
  ): Promise<WorkActa> {
    const user = await this.userRepository.findOne({ where: { userId }, relations: ['role'] });
    const rol = user?.role?.nombreRol;
    if (rol !== 'Gerencia de Proyectos' && rol !== 'Analista PMO') {
      throw new ForbiddenException('Solo la Gerencia de Proyectos puede aprobar el acta');
    }

    const acta = await this.workActaRepository.findOne({
      where: { companyId, projectId: projectId ?? IsNull(), actaNumber },
    });
    if (!acta) throw new NotFoundException(`Acta "${actaNumber}" no encontrada`);
    if (acta.status !== ActaStatus.EN_APROBACION) {
      throw new BadRequestException('El acta no está pendiente de aprobación por Gerencia');
    }

    acta.status = ActaStatus.APROBADA;
    acta.projectCode = projectCode;
    acta.approvedBy = userId;
    acta.approvedAt = new Date();
    // Deja de ser provisional: ya tiene número tramitado y código de contabilidad.
    acta.esProvisional = false;
    await this.workActaRepository.save(acta);

    // Aquí nace el código de contabilidad, y es el único lugar donde nace. Las
    // requisiciones que se compraron por anticipado contra esta acta lo estaban
    // esperando: se les estampa ahora, que es lo que cierra el camino anticipado.
    await this.estamparCodigoEnRequisiciones(acta).catch((e) =>
      this.logger.error(`No se pudo estampar el código en las requisiciones: ${e.message}`),
    );

    this.sendActaNotification('approved', acta, { actor: user }).catch(() => {});

    return acta;
  }

  /**
   * Baja el código de contabilidad del acta a las requisiciones que se crearon
   * contra ella cuando todavía no lo tenía (camino anticipado).
   *
   * La llave es (empresa, proyecto, número de acta): la requisición ya vive en la
   * empresa y el proyecto, así que con el número queda identificada sin
   * ambigüedad —la misma restricción única que tiene `work_actas`—.
   *
   * Solo toca las que siguen sin código. Una requisición a la que ya se le puso
   * el código a mano no se pisa: puede haberse imputado a otra cosa a propósito.
   */
  private async estamparCodigoEnRequisiciones(acta: WorkActa): Promise<void> {
    if (!acta.projectCode) return;

    const resultado = await this.requisitionRepository
      .createQueryBuilder()
      .update(Requisition)
      .set({ codigoObra: acta.projectCode })
      .where('acta_number = :actaNumber', { actaNumber: acta.actaNumber })
      .andWhere('company_id = :companyId', { companyId: acta.companyId })
      .andWhere(
        acta.projectId === null ? 'project_id IS NULL' : 'project_id = :projectId',
        acta.projectId === null ? {} : { projectId: acta.projectId },
      )
      .andWhere("(codigo_obra IS NULL OR btrim(codigo_obra) = '')")
      .execute();

    if (resultado.affected) {
      this.logger.log(
        `Acta ${acta.actaNumber}: código ${acta.projectCode} estampado en ${resultado.affected} requisición(es) anticipada(s).`,
      );
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Acta provisional · comprar materiales antes de que exista el acta
  // ══════════════════════════════════════════════════════════════════════════

  /** Solo Gerencia de Proyectos agrupa obras sueltas y pide comprar contra ellas. */
  private async assertEsGerenciaDeProyectos(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['role'],
    });
    if (user?.role?.nombreRol !== 'Gerencia de Proyectos') {
      throw new ForbiddenException(
        'Solo la Gerencia de Proyectos puede manejar actas provisionales',
      );
    }
    return user;
  }

  /**
   * Obras del municipio que no están agrupadas en ningún acta.
   *
   * Son las candidatas de la pantalla: se listan con su levantamiento —si ya lo
   * tienen— porque de ahí sale qué materiales se van a pedir.
   */
  async getObrasSinActa(companyId: number, projectId: number | null): Promise<Work[]> {
    return this.workRepository
      .createQueryBuilder('w')
      .leftJoinAndSelect('w.company', 'company')
      .leftJoinAndSelect('w.project', 'project')
      .where('w.company_id = :companyId', { companyId })
      .andWhere(
        projectId === null ? 'w.project_id IS NULL' : 'w.project_id = :projectId',
        projectId === null ? {} : { projectId },
      )
      .andWhere("(w.record_number IS NULL OR btrim(w.record_number) = '')")
      .orderBy('w.created_at', 'DESC')
      .getMany();
  }

  /**
   * Agrupa obras bajo un número de acta provisional.
   *
   * El número es el mismo campo con el que se agrupan todas las actas
   * (`work.record_number`), así que a partir de aquí el acta existe para todo el
   * sistema: cuando se tramite y reciba su código, las obras y las requisiciones
   * que cuelgan de ella quedan enganchadas sin hacer nada más.
   *
   * Se puede corregir: volver a llamarlo con otras obras las mueve. Lo que no se
   * puede es tocar un acta que ya salió de borrador —ahí ya hay gente revisándola—.
   */
  async asignarActaProvisional(
    companyId: number,
    projectId: number | null,
    actaNumber: string,
    workIds: number[],
    userId: number,
  ): Promise<WorkActa> {
    await this.assertEsGerenciaDeProyectos(userId);

    const numero = (actaNumber || '').trim();
    if (!numero) throw new BadRequestException('El número de acta provisional es obligatorio');
    if (!workIds?.length) throw new BadRequestException('Debe seleccionar al menos una obra');

    const acta = await this.getOrCreateActaProvisional(companyId, projectId, numero, userId);
    if (acta.status !== ActaStatus.BORRADOR) {
      throw new BadRequestException(
        `El acta ${numero} ya está en trámite (${acta.status}); no se le pueden asignar obras por esta vía`,
      );
    }

    const obras = await this.workRepository.find({
      where: workIds.map((workId) => ({ workId })),
    });
    if (obras.length !== workIds.length) {
      throw new NotFoundException('Alguna de las obras seleccionadas no existe');
    }

    for (const obra of obras) {
      if (obra.companyId !== companyId || (obra.projectId ?? null) !== projectId) {
        throw new BadRequestException(
          `La obra "${obra.name}" no pertenece al municipio seleccionado`,
        );
      }
      // Mover una obra de un acta ya tramitada le cambiaría el expediente a otra
      // gente. Solo se admite la que está suelta o la que está en otra provisional.
      const actual = (obra.recordNumber || '').trim();
      if (actual && actual !== numero) {
        const actaActual = await this.workActaRepository.findOne({
          where: { companyId, projectId: projectId ?? IsNull(), actaNumber: actual },
        });
        if (actaActual && actaActual.status !== ActaStatus.BORRADOR) {
          throw new BadRequestException(
            `La obra "${obra.name}" ya está en el acta ${actual}, que está en trámite`,
          );
        }
      }
      obra.recordNumber = numero;
    }

    await this.workRepository.save(obras);
    return acta;
  }

  /** Quita obras de un acta provisional, para corregir una asignación equivocada. */
  async quitarDeActaProvisional(
    companyId: number,
    projectId: number | null,
    workIds: number[],
    userId: number,
  ): Promise<{ quitadas: number }> {
    await this.assertEsGerenciaDeProyectos(userId);
    if (!workIds?.length) throw new BadRequestException('Debe seleccionar al menos una obra');

    const obras = await this.workRepository.find({
      where: workIds.map((workId) => ({ workId })),
    });

    for (const obra of obras) {
      const numero = (obra.recordNumber || '').trim();
      if (!numero) continue;
      const acta = await this.workActaRepository.findOne({
        where: { companyId, projectId: projectId ?? IsNull(), actaNumber: numero },
      });
      if (!acta?.esProvisional || acta.status !== ActaStatus.BORRADOR) {
        throw new BadRequestException(
          `La obra "${obra.name}" está en el acta ${numero}, que ya no es provisional`,
        );
      }
      obra.recordNumber = null as unknown as string;
    }

    await this.workRepository.save(obras);
    return { quitadas: obras.length };
  }

  /** Busca el acta provisional o la crea en borrador. */
  private async getOrCreateActaProvisional(
    companyId: number,
    projectId: number | null,
    actaNumber: string,
    userId: number,
  ): Promise<WorkActa> {
    const existente = await this.workActaRepository.findOne({
      where: { companyId, projectId: projectId ?? IsNull(), actaNumber },
    });
    if (existente) return existente;

    return this.workActaRepository.save(
      this.workActaRepository.create({
        companyId,
        projectId,
        actaNumber,
        status: ActaStatus.BORRADOR,
        esProvisional: true,
        createdBy: userId,
      }),
    );
  }

  /**
   * Gerencia de Proyectos pide autorización para comprar contra el acta provisional.
   *
   * Es lo único que abre la puerta a una requisición sin código de contabilidad,
   * así que la decisión no puede quedar en quien la pide: la toma Gerencia.
   */
  async solicitarRequisicionAnticipada(
    companyId: number,
    projectId: number | null,
    actaNumber: string,
    justificacion: string,
    userId: number,
  ): Promise<WorkActa> {
    const user = await this.assertEsGerenciaDeProyectos(userId);

    const motivo = (justificacion || '').trim();
    if (!motivo) {
      throw new BadRequestException(
        'Debe justificar por qué hay que comprar antes de tramitar el acta',
      );
    }

    const acta = await this.workActaRepository.findOne({
      where: { companyId, projectId: projectId ?? IsNull(), actaNumber },
    });
    if (!acta) throw new NotFoundException(`Acta "${actaNumber}" no encontrada`);
    if (acta.rqAnticipadaStatus === ActaRqAnticipadaStatus.PENDIENTE) {
      throw new BadRequestException('Ya hay una solicitud pendiente de autorización');
    }
    if (acta.rqAnticipadaStatus === ActaRqAnticipadaStatus.APROBADA) {
      throw new BadRequestException('La compra anticipada ya está autorizada');
    }

    const obras = await this.workRepository.count({
      where: { companyId, projectId: projectId ?? IsNull(), recordNumber: actaNumber },
    });
    if (!obras) {
      throw new BadRequestException(
        'El acta no tiene obras asignadas: primero agrupe las obras que se van a intervenir',
      );
    }

    acta.rqAnticipadaStatus = ActaRqAnticipadaStatus.PENDIENTE;
    acta.rqAnticipadaJustificacion = motivo;
    acta.rqAnticipadaMotivo = null;
    acta.rqAnticipadaSolicitadaPor = userId;
    acta.rqAnticipadaSolicitadaAt = new Date();
    acta.rqAnticipadaResueltaPor = null;
    acta.rqAnticipadaResueltaAt = null;
    await this.workActaRepository.save(acta);

    this.notificarRqAnticipada('solicitada', acta, user).catch(() => {});
    return acta;
  }

  /**
   * Gerencia autoriza o niega la compra anticipada.
   *
   * Autorizar es lo que habilita a crear la requisición sin código; negar exige
   * motivo, porque quien pidió tiene que saber qué corregir.
   */
  async resolverRequisicionAnticipada(
    companyId: number,
    projectId: number | null,
    actaNumber: string,
    aprobar: boolean,
    motivo: string | undefined,
    userId: number,
  ): Promise<WorkActa> {
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['role'],
    });
    if (user?.role?.nombreRol !== 'Gerencia') {
      throw new ForbiddenException('Solo Gerencia puede autorizar una compra anticipada');
    }

    const acta = await this.workActaRepository.findOne({
      where: { companyId, projectId: projectId ?? IsNull(), actaNumber },
    });
    if (!acta) throw new NotFoundException(`Acta "${actaNumber}" no encontrada`);
    if (acta.rqAnticipadaStatus !== ActaRqAnticipadaStatus.PENDIENTE) {
      throw new BadRequestException('No hay una solicitud pendiente sobre esta acta');
    }
    if (!aprobar && !(motivo || '').trim()) {
      throw new BadRequestException('Negar la compra anticipada exige un motivo');
    }

    acta.rqAnticipadaStatus = aprobar
      ? ActaRqAnticipadaStatus.APROBADA
      : ActaRqAnticipadaStatus.RECHAZADA;
    acta.rqAnticipadaMotivo = aprobar ? null : (motivo || '').trim();
    acta.rqAnticipadaResueltaPor = userId;
    acta.rqAnticipadaResueltaAt = new Date();
    await this.workActaRepository.save(acta);

    this.notificarRqAnticipada(aprobar ? 'aprobada' : 'rechazada', acta, user).catch(() => {});
    return acta;
  }

  /**
   * ¿Se puede crear una requisición sin código contra esta acta?
   *
   * Lo consulta Compras antes de dejar pasar una requisición sin código de
   * contabilidad. Devuelve el acta solo si Gerencia la autorizó.
   */
  async getActaConCompraAutorizada(
    companyId: number,
    projectId: number | null,
    actaNumber: string,
  ): Promise<WorkActa | null> {
    const acta = await this.workActaRepository.findOne({
      where: { companyId, projectId: projectId ?? IsNull(), actaNumber },
    });
    return acta?.rqAnticipadaStatus === ActaRqAnticipadaStatus.APROBADA ? acta : null;
  }

  /** Actas provisionales del municipio, con cuántas obras agrupan. */
  async getActasProvisionales(
    companyId: number,
    projectId: number | null,
  ): Promise<Array<WorkActa & { obras: number }>> {
    const actas = await this.workActaRepository.find({
      where: { companyId, projectId: projectId ?? IsNull(), esProvisional: true },
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      actas.map(async (acta) => ({
        ...acta,
        obras: await this.workRepository.count({
          where: {
            companyId,
            projectId: projectId ?? IsNull(),
            recordNumber: acta.actaNumber,
          },
        }),
      })),
    ) as Promise<Array<WorkActa & { obras: number }>>;
  }

  /**
   * Requisiciones anticipadas que siguen esperando el código de contabilidad.
   *
   * Es el vigilante del camino anticipado: si el acta nunca se tramita, la compra
   * se queda sin centro de costo y nadie se entera —el correo del enganche solo
   * sale cuando el acta se aprueba, así que el silencio es indistinguible del
   * caso normal—. Por eso la bandeja es global, no por municipio: sirve para ver
   * de un vistazo lo que se está quedando atrás.
   *
   * No filtra por antigüedad; devuelve los días y deja que la pantalla decida qué
   * resaltar.
   */
  async getRequisicionesSinCodigo(): Promise<
    Array<{
      requisitionId: number;
      requisitionNumber: string;
      empresa: string;
      municipio: string | null;
      actaNumber: string;
      actaStatus: string | null;
      estado: string;
      creadaPor: string | null;
      createdAt: string;
      dias: number;
    }>
  > {
    return this.requisitionRepository.query(`
      SELECT r.requisition_id                         AS "requisitionId",
             r.requisition_number                     AS "requisitionNumber",
             c.name                                   AS "empresa",
             p.name                                   AS "municipio",
             r.acta_number                            AS "actaNumber",
             a.status                                 AS "actaStatus",
             COALESCE(rs.name, rs.code, '')           AS "estado",
             u.nombre                                 AS "creadaPor",
             r.created_at                             AS "createdAt",
             (CURRENT_DATE - r.created_at::date)      AS "dias"
        FROM requisitions r
        JOIN companies c            ON c.company_id = r.company_id
        LEFT JOIN projects p        ON p.project_id = r.project_id
        LEFT JOIN requisition_statuses rs ON rs.status_id = r.status_id
        LEFT JOIN users u           ON u.user_id = r.created_by
        LEFT JOIN work_actas a      ON a.company_id = r.company_id
                                   AND a.acta_number = r.acta_number
                                   AND (a.project_id = r.project_id
                                        OR (a.project_id IS NULL AND r.project_id IS NULL))
       WHERE r.acta_number IS NOT NULL
         AND (r.codigo_obra IS NULL OR btrim(r.codigo_obra) = '')
       ORDER BY r.created_at ASC
    `);
  }

  /**
   * Bandeja de Gerencia: compras anticipadas esperando su autorización.
   *
   * Va sin filtro de municipio, como las otras bandejas del módulo. Quien
   * autoriza no tiene por qué adivinar en qué municipio quedó la solicitud: la
   * decisión llega a ella, no al revés.
   */
  async getComprasAnticipadasPendientes(): Promise<
    Array<{
      actaId: number;
      companyId: number;
      projectId: number | null;
      actaNumber: string;
      empresa: string;
      municipio: string | null;
      obras: number;
      justificacion: string | null;
      solicitadaPor: string | null;
      solicitadaAt: string | null;
      dias: number;
    }>
  > {
    return this.workActaRepository.query(
      `
      SELECT a.acta_id                              AS "actaId",
             a.company_id                           AS "companyId",
             a.project_id                           AS "projectId",
             a.acta_number                          AS "actaNumber",
             c.name                                 AS "empresa",
             p.name                                 AS "municipio",
             (SELECT COUNT(*)::int FROM works w
               WHERE w.company_id = a.company_id
                 AND w.record_number = a.acta_number
                 AND (w.project_id = a.project_id
                      OR (w.project_id IS NULL AND a.project_id IS NULL))) AS "obras",
             a.rq_anticipada_justificacion          AS "justificacion",
             u.nombre                               AS "solicitadaPor",
             a.rq_anticipada_solicitada_at          AS "solicitadaAt",
             (CURRENT_DATE - a.rq_anticipada_solicitada_at::date) AS "dias"
        FROM work_actas a
        JOIN companies c     ON c.company_id = a.company_id
        LEFT JOIN projects p ON p.project_id = a.project_id
        LEFT JOIN users u    ON u.user_id = a.rq_anticipada_solicitada_por
       WHERE a.rq_anticipada_status = $1
       ORDER BY a.rq_anticipada_solicitada_at ASC
    `,
      [ActaRqAnticipadaStatus.PENDIENTE],
    );
  }

  /** Correo de ida (a Gerencia) y de vuelta (a quien pidió). */
  private async notificarRqAnticipada(
    tipo: 'solicitada' | 'aprobada' | 'rechazada',
    acta: WorkActa,
    actor: User | null,
  ): Promise<void> {
    try {
      // El enlace por defecto de las actas apunta al Resumen de Acta, donde esto
      // no se decide. Se manda a la pantalla de actas provisionales, con el
      // municipio ya puesto, que es la única en la que hay botón para autorizar.
      const data = await this.buildActaNotificationData(acta, actor, {
        actionUrl: this.buildFrontendUrl(
          `/dashboard/levantamiento-obras/actas-provisionales?company=${acta.companyId}` +
            (acta.projectId != null ? `&project=${acta.projectId}` : ''),
        ),
      });

      if (tipo === 'solicitada') {
        const gerencia = await this.findActiveUsersByRoleNames(['Gerencia']);
        await this.notifyUniqueUsers(gerencia, (email, name) =>
          this.notificationsService.notifyRqAnticipadaSolicitada(
            email,
            name,
            data,
            acta.rqAnticipadaJustificacion || '',
          ),
        );
        return;
      }

      // La respuesta va a la persona que pidió, no al rol: es quien está esperando
      // para poder crear la requisición.
      if (!acta.rqAnticipadaSolicitadaPor) return;
      const solicitante = await this.userRepository.findOne({
        where: { userId: acta.rqAnticipadaSolicitadaPor },
      });
      if (!solicitante) return;
      await this.notifyUniqueUsers([solicitante], (email, name) =>
        this.notificationsService.notifyRqAnticipadaResuelta(
          email,
          name,
          data,
          tipo === 'aprobada',
          acta.rqAnticipadaMotivo || undefined,
        ),
      );
    } catch (e) {
      this.logger.warn(`No se pudo notificar la compra anticipada: ${(e as Error).message}`);
    }
  }

  /**
   * El Director Técnico envía el acta a presupuesto: marca el estado de presupuesto
   * en 'en_revision' y notifica por correo a la Directora Financiera.
   */
  async sendActaToBudget(
    companyId: number,
    projectId: number | null,
    actaNumber: string,
    userId: number,
  ): Promise<WorkActa> {
    const user = await this.userRepository.findOne({ where: { userId }, relations: ['role'] });
    const rol = user?.role?.nombreRol;
    if (rol !== 'Director Técnico' && rol !== 'Analista PMO') {
      throw new ForbiddenException('Solo el Director Técnico puede enviar el acta a presupuesto');
    }

    let acta = await this.workActaRepository.findOne({
      where: { companyId, projectId: projectId ?? IsNull(), actaNumber },
    });
    if (!acta) {
      acta = this.workActaRepository.create({
        companyId,
        projectId: projectId ?? null,
        actaNumber,
        status: ActaStatus.BORRADOR,
        createdBy: userId,
      });
    }

    if (acta.presupuestoStatus === ActaBudgetStatus.EN_REVISION) {
      throw new BadRequestException('El acta ya fue enviada a presupuesto y está en revisión');
    }

    acta.presupuestoStatus = ActaBudgetStatus.EN_REVISION;
    acta.presupuestoRechazoMotivo = null;
    const savedActa = await this.workActaRepository.save(acta);

    this.sendActaNotification('sent_to_budget', savedActa, { actor: user }).catch(() => {});

    return savedActa;
  }

  /**
   * La Directora Financiera aprueba o rechaza el presupuesto del acta
   * (presupuesto_status: en_revision → aprobado | rechazado). El rechazo exige motivo.
   * Notifica al Director Técnico el resultado.
   */
  async reviewActaBudget(
    companyId: number,
    projectId: number | null,
    actaNumber: string,
    userId: number,
    decision: 'aprobado' | 'rechazado',
    motivo?: string,
  ): Promise<WorkActa> {
    const user = await this.userRepository.findOne({ where: { userId }, relations: ['role'] });
    const rol = user?.role?.nombreRol;
    if (rol !== 'Director Financiero y Administrativo' && rol !== 'Analista PMO') {
      throw new ForbiddenException('Solo la Directora Financiera puede aprobar o rechazar el presupuesto del acta');
    }

    const acta = await this.workActaRepository.findOne({
      where: { companyId, projectId: projectId ?? IsNull(), actaNumber },
    });
    if (!acta) {
      throw new NotFoundException('Acta no encontrada');
    }
    if (acta.presupuestoStatus !== ActaBudgetStatus.EN_REVISION) {
      throw new BadRequestException('El presupuesto del acta no está en revisión');
    }

    if (decision === 'rechazado') {
      if (!motivo || !motivo.trim()) {
        throw new BadRequestException('Debe indicar el motivo del rechazo');
      }
      acta.presupuestoStatus = ActaBudgetStatus.RECHAZADO;
      acta.presupuestoRechazoMotivo = motivo.trim();
    } else {
      acta.presupuestoStatus = ActaBudgetStatus.APROBADO;
      acta.presupuestoRechazoMotivo = null;
    }

    const savedActa = await this.workActaRepository.save(acta);

    this.sendActaNotification(
      decision === 'aprobado' ? 'budget_approved' : 'budget_rejected',
      savedActa,
      { actor: user, comments: decision === 'rechazado' ? motivo?.trim() : undefined },
    ).catch(() => {});

    return savedActa;
  }

  /**
   * Cierra el presupuesto del acta cuando Gerencia aprueba el Presupuesto del Director.
   *
   * El acta quedaba colgada en 'en_revision' para siempre: `send-to-budget` la ponía ahí
   * y `review-budget` —el endpoint que la cerraría— no lo llama ninguna pantalla. La
   * aprobación real ocurre aguas abajo, cuando Gerencia deja el Presupuesto del Director
   * en 'final'; ese es el momento en que el acta se da por presupuestada.
   *
   * Es deliberadamente conservador: solo cierra actas en 'en_revision'. Si el acta nunca
   * se envió a presupuesto ('pendiente'), fue rechazada, o ya está aprobada, no la toca —
   * aprobar un presupuesto no puede inventar un envío que no ocurrió.
   */
  async closeActaBudgetFromDirectorBudget(
    link: {
      actaCompanyId?: number | null;
      actaProjectId?: number | null;
      actaNumber?: string | null;
      workId?: number | null;
    },
    userId: number,
  ): Promise<WorkActa | null> {
    const acta = await this.findActaForDirectorBudget(link);
    if (!acta || acta.presupuestoStatus !== ActaBudgetStatus.EN_REVISION) return null;

    acta.presupuestoStatus = ActaBudgetStatus.APROBADO;
    acta.presupuestoRechazoMotivo = null;
    const savedActa = await this.workActaRepository.save(acta);

    const user = await this.userRepository.findOne({ where: { userId }, relations: ['role'] });
    this.sendActaNotification('budget_approved', savedActa, { actor: user }).catch(() => {});

    return savedActa;
  }

  /**
   * Reabre el presupuesto del acta cuando Gerencia devuelve un presupuesto ya autorizado.
   *
   * Es el reverso exacto de `closeActaBudgetFromDirectorBudget`. Sin esto, devolver
   * dejaría al acta diciendo `aprobado` mientras su único presupuesto vuelve a borrador:
   * el acta afirmaría tener un presupuesto que ya no existe.
   *
   * El acta vuelve a la bandeja de la Directora Financiera, que es quien debe rehacerlo,
   * y se le avisa por correo.
   */
  async reopenActaBudgetFromDirectorBudget(
    link: {
      actaCompanyId?: number | null;
      actaProjectId?: number | null;
      actaNumber?: string | null;
      workId?: number | null;
    },
    userId: number,
  ): Promise<WorkActa | null> {
    const acta = await this.findActaForDirectorBudget(link, ActaBudgetStatus.APROBADO);
    if (!acta || acta.presupuestoStatus !== ActaBudgetStatus.APROBADO) return null;

    acta.presupuestoStatus = ActaBudgetStatus.EN_REVISION;
    acta.presupuestoRechazoMotivo = null;
    const savedActa = await this.workActaRepository.save(acta);

    const user = await this.userRepository.findOne({ where: { userId }, relations: ['role'] });
    this.sendActaNotification('sent_to_budget', savedActa, { actor: user }).catch(() => {});

    return savedActa;
  }

  /**
   * Encuentra el acta de un Presupuesto del Director. Tres caminos, de más a menos fiable:
   *
   * 1. Las columnas `acta_*` del presupuesto — la identidad completa (empresa, proyecto, número).
   * 2. La obra, cuando el presupuesto es de una sola (`work_id` → `record_number`).
   * 3. Solo el número, para los presupuestos agrupados anteriores a las columnas `acta_*`:
   *    se acepta únicamente si hay **una** acta con ese número en `estadoParaDesambiguar`.
   *    Ante ambigüedad devuelve null: tocar el acta equivocada es peor que no tocar ninguna.
   *
   * `estadoParaDesambiguar` solo interviene en el camino 3, y por eso lo eligen quienes
   * llaman: el cierre y la validación buscan un acta `en_revision`; la reapertura, una
   * `aprobado`.
   */
  async findActaForDirectorBudget(
    link: {
      actaCompanyId?: number | null;
      actaProjectId?: number | null;
      actaNumber?: string | null;
      workId?: number | null;
    },
    estadoParaDesambiguar: ActaBudgetStatus = ActaBudgetStatus.EN_REVISION,
  ): Promise<WorkActa | null> {
    if (link.actaCompanyId != null && link.actaNumber) {
      return this.workActaRepository.findOne({
        where: {
          companyId: link.actaCompanyId,
          projectId: link.actaProjectId ?? IsNull(),
          actaNumber: link.actaNumber,
        },
      });
    }

    if (link.workId != null) {
      const work = await this.workRepository.findOne({ where: { workId: link.workId } });
      if (work?.recordNumber) {
        return this.workActaRepository.findOne({
          where: {
            companyId: work.companyId,
            projectId: work.projectId ?? IsNull(),
            actaNumber: work.recordNumber,
          },
        });
      }
      return null;
    }

    if (link.actaNumber) {
      const candidatas = await this.workActaRepository.find({
        where: {
          actaNumber: link.actaNumber,
          presupuestoStatus: estadoParaDesambiguar,
        },
      });
      return candidatas.length === 1 ? candidatas[0] : null;
    }

    return null;
  }

  /**
   * Actas a las que todavía hay que hacerles el Presupuesto del Director
   * (bandeja de la Directora Financiera).
   *
   * «Pendiente» es literal: el acta está `en_revision` y **no existe** un
   * Presupuesto del Director para ella. En cuanto se le hace uno —aunque quede en
   * borrador— sale de la bandeja; a partir de ahí se sigue en la tabla de abajo,
   * que lo muestra con su estado, y en «Pendiente por Autorización». Sin esto el
   * acta se quedaba en la bandeja diciendo «realizar presupuesto» cuando el
   * presupuesto ya estaba hecho, porque el acta solo pasa a `aprobado` mucho
   * después, cuando Gerencia autoriza.
   *
   * El presupuesto se localiza por dos caminos, y basta con uno:
   *
   * 1. Las columnas `acta_*`, que son la identidad completa (empresa, proyecto,
   *    número). Es el camino de todo presupuesto hecho desde el 31/07/2026.
   * 2. Los anteriores a esa fecha, que no tienen `acta_*`: el número quedó en
   *    `work_name` y el municipio en `company_name`. Se comparan normalizados
   *    —sin tildes, sin el prefijo «Unión Temporal Alumbrado Público»— porque el
   *    mismo municipio aparece escrito de las dos formas.
   *
   * El camino 2 solo empareja cuando el municipio coincide, nunca por número
   * suelto: «01-2026» lo tienen a la vez Circasia, Pueblo Rico y Tarso, y sacar
   * de la bandeja el acta equivocada es peor que dejarla de más.
   */
  async getActasPendingBudget(): Promise<
    Array<{
      companyId: number;
      projectId: number | null;
      actaNumber: string;
      companyName: string | null;
      worksCount: number;
      updatedAt: Date;
    }>
  > {
    // Municipio comparable: minúsculas, sin el prefijo de la unión temporal y sin tildes.
    const norm = (col: string) =>
      `translate(lower(regexp_replace(coalesce(${col}, ''), '^\\s*uni.n temporal alumbrado p.blico\\s+', '', 'i')), 'áéíóúñ', 'aeioun')`;

    return this.workActaRepository.query(
      `
      SELECT
        a.company_id  AS "companyId",
        a.project_id  AS "projectId",
        a.acta_number AS "actaNumber",
        c.name        AS "companyName",
        a.updated_at  AS "updatedAt",
        (SELECT COUNT(*)::int
           FROM works w
          WHERE w.company_id = a.company_id
            AND w.project_id IS NOT DISTINCT FROM a.project_id
            AND w.record_number = a.acta_number) AS "worksCount"
      FROM work_actas a
      LEFT JOIN companies c ON c.company_id = a.company_id
      LEFT JOIN projects  p ON p.project_id = a.project_id
      WHERE a.presupuesto_status = $1
        AND NOT EXISTS (
          SELECT 1
          FROM director_budgets db
          WHERE (
                  db.acta_company_id = a.company_id
                  AND db.acta_project_id IS NOT DISTINCT FROM a.project_id
                  AND db.acta_number = a.acta_number
                )
             OR (
                  db.acta_company_id IS NULL
                  AND db.work_name = a.acta_number
                  AND db.company_name IS NOT NULL
                  AND ${norm('db.company_name')} = ${norm('COALESCE(p.name, c.name)')}
                )
        )
      ORDER BY a.updated_at DESC
      `,
      [ActaBudgetStatus.EN_REVISION],
    );
  }

  // ============================================
  // CRONOGRAMA DEL ACTA (Director de Proyecto → Director Técnico)
  // ============================================

  /** El Director de Proyecto envía el plan del cronograma a revisión del Director Técnico. */
  async submitActaCronograma(
    companyId: number,
    projectId: number | null,
    actaNumber: string,
    userId: number,
  ): Promise<WorkActa> {
    const user = await this.userRepository.findOne({ where: { userId }, relations: ['role'] });
    const rol = user?.role?.nombreRol;
    if (!rol?.startsWith('Director de Proyecto') && rol !== 'Analista PMO') {
      throw new ForbiddenException('Solo el Director de Proyecto puede enviar el cronograma a revisión');
    }

    let acta = await this.workActaRepository.findOne({
      where: { companyId, projectId: projectId ?? IsNull(), actaNumber },
    });
    if (!acta) {
      acta = this.workActaRepository.create({
        companyId,
        projectId: projectId ?? null,
        actaNumber,
        status: ActaStatus.BORRADOR,
        createdBy: userId,
      });
    }

    if (
      acta.cronogramaStatus !== ActaCronogramaStatus.PENDIENTE &&
      acta.cronogramaStatus !== ActaCronogramaStatus.RECHAZADO
    ) {
      throw new BadRequestException('El cronograma ya fue enviado a revisión');
    }

    acta.cronogramaStatus = ActaCronogramaStatus.EN_REVISION;
    acta.cronogramaRechazoMotivo = null;
    acta.createdBy = userId;
    const savedActa = await this.workActaRepository.save(acta);

    this.sendActaNotification('cronograma_submitted', savedActa, { actor: user }).catch(() => {});
    return savedActa;
  }

  /** El Director Técnico aprueba (habilita ejecución) o rechaza con motivo el plan del cronograma. */
  async reviewActaCronograma(
    companyId: number,
    projectId: number | null,
    actaNumber: string,
    userId: number,
    decision: 'aprobado' | 'rechazado',
    motivo?: string,
  ): Promise<WorkActa> {
    const user = await this.userRepository.findOne({ where: { userId }, relations: ['role'] });
    const rol = user?.role?.nombreRol;
    if (rol !== 'Director Técnico' && rol !== 'Analista PMO') {
      throw new ForbiddenException('Solo el Director Técnico puede aprobar o rechazar el cronograma');
    }

    const acta = await this.workActaRepository.findOne({
      where: { companyId, projectId: projectId ?? IsNull(), actaNumber },
    });
    if (!acta) throw new NotFoundException('Acta no encontrada');
    if (acta.cronogramaStatus !== ActaCronogramaStatus.EN_REVISION) {
      throw new BadRequestException('El cronograma del acta no está en revisión');
    }

    if (decision === 'rechazado') {
      if (!motivo || !motivo.trim()) {
        throw new BadRequestException('Debe indicar el motivo del rechazo');
      }
      acta.cronogramaStatus = ActaCronogramaStatus.RECHAZADO;
      acta.cronogramaRechazoMotivo = motivo.trim();
    } else {
      acta.cronogramaStatus = ActaCronogramaStatus.APROBADO;
      acta.cronogramaRechazoMotivo = null;
    }
    acta.cronogramaReviewedBy = userId;
    acta.cronogramaReviewedAt = new Date();

    const savedActa = await this.workActaRepository.save(acta);

    this.sendActaNotification(
      decision === 'aprobado' ? 'cronograma_approved' : 'cronograma_rejected',
      savedActa,
      { actor: user, comments: decision === 'rechazado' ? motivo?.trim() : undefined },
    ).catch(() => {});

    return savedActa;
  }

  /** Actas con cronograma en revisión (bandeja del Director Técnico). */
  async getActasPendingCronograma(): Promise<
    Array<{
      companyId: number;
      projectId: number | null;
      actaNumber: string;
      companyName: string | null;
      worksCount: number;
      updatedAt: Date;
    }>
  > {
    const actas = await this.workActaRepository.find({
      where: { cronogramaStatus: ActaCronogramaStatus.EN_REVISION },
      order: { updatedAt: 'DESC' },
    });
    if (actas.length === 0) return [];

    const companyIds = Array.from(new Set(actas.map((a) => a.companyId)));
    const companies = await this.companyRepository.findByIds(companyIds);
    const companyName = new Map(companies.map((c) => [c.companyId, c.name]));

    return Promise.all(
      actas.map(async (a) => ({
        companyId: a.companyId,
        projectId: a.projectId ?? null,
        actaNumber: a.actaNumber,
        companyName: companyName.get(a.companyId) ?? null,
        worksCount: await this.workRepository.count({
          where: { companyId: a.companyId, projectId: a.projectId ?? IsNull(), recordNumber: a.actaNumber },
        }),
        updatedAt: a.updatedAt,
      })),
    );
  }
}
