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
import { WorkActa, ActaStatus, ActaBudgetStatus, ActaCronogramaStatus } from '../../database/entities/work-acta.entity';
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
        where: { companyId: acta.companyId, recordNumber: acta.actaNumber },
        relations: ['project', 'creator'],
      }),
      acta.createdBy
        ? this.userRepository.findOne({ where: { userId: acta.createdBy } })
        : Promise.resolve(null),
    ]);

    const firstWork = works[0];

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
      actionUrl: this.buildFrontendUrl(`/dashboard/levantamiento-obras/acta/${encodeURIComponent(acta.actaNumber)}`),
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

  async getSurveys(filters: FilterSurveysDto): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const query = this.surveyRepository.createQueryBuilder('survey')
      .leftJoinAndSelect('survey.work', 'work')
      .leftJoinAndSelect('work.company', 'company')
      .leftJoinAndSelect('work.project', 'project')
      .leftJoinAndSelect('survey.creator', 'creator')
      .leftJoinAndSelect('survey.assignedReviewer', 'assignedReviewer')
      .leftJoinAndSelect('survey.materialItems', 'materialItems')
      .leftJoinAndSelect('materialItems.material', 'material');

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
      .map((s) => ({ companyId: s.work!.companyId, actaNumber: s.work!.recordNumber }));
    const actaMap = await this.getActaProjectCodeMap(actaPairs);

    const data = surveys.map((survey) => ({
      ...survey,
      surveyNumber: survey.projectCode,
      projectCode:
        survey.work?.companyId != null && survey.work?.recordNumber
          ? actaMap.get(`${survey.work.companyId}|${survey.work.recordNumber}`) || null
          : null,
    }));

    return { data, total, page, limit };
  }

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

    if (reviewDto.action === ReviewAction.APPROVE) {
      if (!reviewDto.previousMonthIpp) {
        throw new BadRequestException('Previous month IPP is required for approval');
      }
      survey.previousMonthIpp = reviewDto.previousMonthIpp;
      survey.status = SurveyStatus.APPROVED;
    } else {
      if (!reviewDto.rejectionComments) {
        throw new BadRequestException('Rejection comments are required');
      }
      survey.rejectionComments = reviewDto.rejectionComments;
      survey.status = SurveyStatus.REJECTED;
    }

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

    // Get UCAPs
    const query = this.ucapRepository.createQueryBuilder('ucap')
      .where('ucap.companyId = :companyId', { companyId })
      .andWhere('ucap.isActive = true');

    if (projectId) {
      query.andWhere('(ucap.projectId = :projectId OR ucap.projectId IS NULL)', { projectId });
    }

    query.orderBy('ucap.code', 'ASC');

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
  ): Promise<{ workId: number; value: number }[]> {
    const ids = (workIds || []).filter((n) => Number.isInteger(n));
    if (ids.length === 0) return [];

    // Valor = TOTAL AJUSTADO del presupuesto del levantamiento (igual que el detalle):
    //   por cada survey: SUBTOTAL = Σ(unit_value × quantity)  (sin mano de obra)
    //   factor IPP = survey.previous_month_ipp / ipp_initial_value (proyecto o empresa)
    //   total ajustado = SUBTOTAL × factor
    // Se aplica el factor por survey (cada levantamiento tiene su IPP) y se suma por obra.
    const rows: any[] = await this.surveyRepository.query(
      `SELECT s.work_id AS work_id,
              COALESCE(SUM(
                sub.total_base *
                CASE
                  WHEN bi.base_ipp > 0 AND s.previous_month_ipp IS NOT NULL AND s.previous_month_ipp > 0
                  THEN s.previous_month_ipp / bi.base_ipp
                  ELSE 1
                END
              ), 0)::float AS value
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

    const valueMap = new Map<number, number>(
      rows.map((r) => [Number(r.work_id), Number(r.value)]),
    );

    return ids.map((workId) => ({
      workId,
      value: Math.round(valueMap.get(workId) || 0),
    }));
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

    // Validar que el usuario es el Director Técnico asignado o tiene rol privilegiado
    if (survey.assignedReviewerId && survey.assignedReviewerId !== userId) {
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

  async approveAllBlocks(surveyId: number, userId: number): Promise<Survey> {
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
          'Solo el Director Técnico asignado puede aprobar este levantamiento',
        );
      }
    }

    // Approve all blocks
    survey.budgetStatus = BlockStatus.APPROVED;
    survey.investmentStatus = BlockStatus.APPROVED;
    survey.materialsStatus = BlockStatus.APPROVED;
    survey.travelExpensesStatus = BlockStatus.APPROVED;

    // Clear any previous comments
    survey.budgetComments = undefined;
    survey.investmentComments = undefined;
    survey.materialsComments = undefined;
    survey.travelExpensesComments = undefined;

    // Update global status
    survey.status = SurveyStatus.APPROVED;
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

    const query = this.surveyRepository.createQueryBuilder('survey')
      .leftJoinAndSelect('survey.work', 'work')
      .leftJoinAndSelect('work.company', 'company')
      .leftJoinAndSelect('work.project', 'project')
      .leftJoinAndSelect('survey.creator', 'creator')
      .leftJoinAndSelect('survey.assignedReviewer', 'assignedReviewer')
      .leftJoinAndSelect('survey.reviewer', 'reviewer')
      .leftJoinAndSelect('survey.budgetItems', 'budgetItems')
      .leftJoinAndSelect('budgetItems.ucap', 'ucap')
      .leftJoinAndSelect('survey.investmentItems', 'investmentItems')
      .leftJoinAndSelect('survey.materialItems', 'materialItems')
      .leftJoinAndSelect('materialItems.material', 'material')
      .leftJoinAndSelect('survey.travelExpenses', 'travelExpenses');

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
      .map((s) => ({ companyId: s.work!.companyId, actaNumber: s.work!.recordNumber }));
    const actaMapDb = await this.getActaProjectCodeMap(actaPairsDb);

    // Transform to include calculated fields
    const data = surveys.map((survey) => ({
      surveyId: survey.surveyId,
      surveyNumber: survey.projectCode,
      projectCode:
        survey.work?.companyId != null && survey.work?.recordNumber
          ? actaMapDb.get(`${survey.work.companyId}|${survey.work.recordNumber}`) || null
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

      // Budget summary
      budgetItems: survey.budgetItems,
      budgetTotal: survey.budgetItems?.reduce(
        (sum, item) => sum + Number(item.budgetedValue || 0),
        0,
      ),

      // Investment items
      investmentItems: survey.investmentItems,

      // Materials
      materialItems: survey.materialItems,

      // Travel expenses
      travelExpenses: survey.travelExpenses,

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
   * Mapa de código de contabilidad por acta, con clave compuesta `${companyId}|${actaNumber}`.
   * El número de acta se reutiliza entre municipios, así que se debe consultar por empresa+número.
   */
  private async getActaProjectCodeMap(
    pairs: Array<{ companyId: number; actaNumber: string }>,
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const uniquePairs = new Map<string, { companyId: number; actaNumber: string }>();
    for (const p of pairs) {
      if (p.companyId == null || !p.actaNumber) continue;
      uniquePairs.set(`${p.companyId}|${p.actaNumber}`, p);
    }
    if (uniquePairs.size === 0) return map;

    const qb = this.workActaRepository
      .createQueryBuilder('acta')
      .select(['acta.companyId', 'acta.actaNumber', 'acta.projectCode']);
    const ors: string[] = [];
    const params: Record<string, number | string> = {};
    let i = 0;
    for (const p of uniquePairs.values()) {
      ors.push(`(acta.companyId = :c${i} AND acta.actaNumber = :a${i})`);
      params[`c${i}`] = p.companyId;
      params[`a${i}`] = p.actaNumber;
      i++;
    }
    qb.where(`(${ors.join(' OR ')})`, params);

    const actas = await qb.getMany();
    actas.forEach((a) => {
      if (a.projectCode) map.set(`${a.companyId}|${a.actaNumber}`, a.projectCode);
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

  async getWorkActa(companyId: number, actaNumber: string): Promise<WorkActa | null> {
    return this.workActaRepository.findOne({ where: { companyId, actaNumber } });
  }

  async getWorkActas(pairs: Array<{ companyId: number; actaNumber: string }>): Promise<WorkActa[]> {
    const valid = pairs.filter((p) => p.companyId != null && p.actaNumber);
    if (!valid.length) return [];
    const qb = this.workActaRepository.createQueryBuilder('acta');
    const ors: string[] = [];
    const params: Record<string, number | string> = {};
    valid.forEach((p, i) => {
      ors.push(`(acta.companyId = :c${i} AND acta.actaNumber = :a${i})`);
      params[`c${i}`] = p.companyId;
      params[`a${i}`] = p.actaNumber;
    });
    return qb.where(`(${ors.join(' OR ')})`, params).getMany();
  }

  async submitActaForReview(companyId: number, actaNumber: string, userId: number): Promise<WorkActa> {
    const user = await this.userRepository.findOne({ where: { userId }, relations: ['role'] });
    const rol = user?.role?.nombreRol;
    if (!rol?.startsWith('Director de Proyecto') && rol !== 'Analista PMO') {
      throw new ForbiddenException('Solo el Director de Proyecto puede enviar el acta a revisión');
    }

    let acta = await this.workActaRepository.findOne({ where: { companyId, actaNumber } });
    if (!acta) {
      acta = this.workActaRepository.create({
        companyId,
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

    const acta = await this.workActaRepository.findOne({ where: { companyId, actaNumber } });
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
    actaNumber: string,
    projectCode: string,
    userId: number,
  ): Promise<WorkActa> {
    const user = await this.userRepository.findOne({ where: { userId }, relations: ['role'] });
    const rol = user?.role?.nombreRol;
    if (rol !== 'Gerencia de Proyectos' && rol !== 'Analista PMO') {
      throw new ForbiddenException('Solo la Gerencia de Proyectos puede aprobar el acta');
    }

    const acta = await this.workActaRepository.findOne({ where: { companyId, actaNumber } });
    if (!acta) throw new NotFoundException(`Acta "${actaNumber}" no encontrada`);
    if (acta.status !== ActaStatus.EN_APROBACION) {
      throw new BadRequestException('El acta no está pendiente de aprobación por Gerencia');
    }

    acta.status = ActaStatus.APROBADA;
    acta.projectCode = projectCode;
    acta.approvedBy = userId;
    acta.approvedAt = new Date();
    await this.workActaRepository.save(acta);

    this.sendActaNotification('approved', acta, { actor: user }).catch(() => {});

    return acta;
  }

  /**
   * El Director Técnico envía el acta a presupuesto: marca el estado de presupuesto
   * en 'en_revision' y notifica por correo a la Directora Financiera.
   */
  async sendActaToBudget(companyId: number, actaNumber: string, userId: number): Promise<WorkActa> {
    const user = await this.userRepository.findOne({ where: { userId }, relations: ['role'] });
    const rol = user?.role?.nombreRol;
    if (rol !== 'Director Técnico' && rol !== 'Analista PMO') {
      throw new ForbiddenException('Solo el Director Técnico puede enviar el acta a presupuesto');
    }

    let acta = await this.workActaRepository.findOne({ where: { companyId, actaNumber } });
    if (!acta) {
      acta = this.workActaRepository.create({
        companyId,
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

    const acta = await this.workActaRepository.findOne({ where: { companyId, actaNumber } });
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
   * Actas con presupuesto en revisión (bandeja de la Directora Financiera).
   * Devuelve datos mínimos para listar: empresa, número, # obras y fecha.
   */
  async getActasPendingBudget(): Promise<
    Array<{
      companyId: number;
      actaNumber: string;
      companyName: string | null;
      worksCount: number;
      updatedAt: Date;
    }>
  > {
    const actas = await this.workActaRepository.find({
      where: { presupuestoStatus: ActaBudgetStatus.EN_REVISION },
      order: { updatedAt: 'DESC' },
    });
    if (actas.length === 0) return [];

    const companyIds = Array.from(new Set(actas.map((a) => a.companyId)));
    const companies = await this.companyRepository.findByIds(companyIds);
    const companyName = new Map(companies.map((c) => [c.companyId, c.name]));

    const result = await Promise.all(
      actas.map(async (a) => ({
        companyId: a.companyId,
        actaNumber: a.actaNumber,
        companyName: companyName.get(a.companyId) ?? null,
        worksCount: await this.workRepository.count({
          where: { companyId: a.companyId, recordNumber: a.actaNumber },
        }),
        updatedAt: a.updatedAt,
      })),
    );
    return result;
  }

  // ============================================
  // CRONOGRAMA DEL ACTA (Director de Proyecto → Director Técnico)
  // ============================================

  /** El Director de Proyecto envía el plan del cronograma a revisión del Director Técnico. */
  async submitActaCronograma(companyId: number, actaNumber: string, userId: number): Promise<WorkActa> {
    const user = await this.userRepository.findOne({ where: { userId }, relations: ['role'] });
    const rol = user?.role?.nombreRol;
    if (!rol?.startsWith('Director de Proyecto') && rol !== 'Analista PMO') {
      throw new ForbiddenException('Solo el Director de Proyecto puede enviar el cronograma a revisión');
    }

    let acta = await this.workActaRepository.findOne({ where: { companyId, actaNumber } });
    if (!acta) {
      acta = this.workActaRepository.create({
        companyId,
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

    const acta = await this.workActaRepository.findOne({ where: { companyId, actaNumber } });
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
        actaNumber: a.actaNumber,
        companyName: companyName.get(a.companyId) ?? null,
        worksCount: await this.workRepository.count({
          where: { companyId: a.companyId, recordNumber: a.actaNumber },
        }),
        updatedAt: a.updatedAt,
      })),
    );
  }
}
