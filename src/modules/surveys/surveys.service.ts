import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SurveyReviewerAccess } from '../../database/entities/survey-reviewer-access.entity';
import { Work } from '../../database/entities/work.entity';
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
} from './dto';
import { BlockStatus } from '../../database/entities/survey.entity';

@Injectable()
export class SurveysService {
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
  ) {}

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

  async getWorks(companyId?: number, projectId?: number, createdBy?: number): Promise<Work[]> {
    const query = this.workRepository.createQueryBuilder('work')
      .leftJoinAndSelect('work.company', 'company')
      .leftJoinAndSelect('work.project', 'project')
      .leftJoinAndSelect('work.creator', 'creator');

    if (companyId) {
      query.andWhere('work.companyId = :companyId', { companyId });
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

    // Get Technical Director as assigned reviewer
    const technicalDirector = await this.userRepository.findOne({
      where: { cargo: 'Director Técnico', estado: true },
    });

    const survey = this.surveyRepository.create({
      workId: createSurveyDto.workId,
      projectCode,
      requestDate: createSurveyDto.requestDate ? new Date(createSurveyDto.requestDate) : undefined,
      surveyDate: createSurveyDto.surveyDate ? new Date(createSurveyDto.surveyDate) : undefined,
      receivedBy: createSurveyDto.receivedBy,
      assignedReviewerId: technicalDirector?.userId,
      previousMonthIpp: createSurveyDto.previousMonthIpp,
      requiresPhotometricStudies: createSurveyDto.requiresPhotometricStudies || false,
      requiresRetieCertification: createSurveyDto.requiresRetieCertification || false,
      requiresRetilapCertification: createSurveyDto.requiresRetilapCertification || false,
      requiresCivilWork: createSurveyDto.requiresCivilWork || false,
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
    if (updateSurveyDto.requiresPhotometricStudies !== undefined) survey.requiresPhotometricStudies = updateSurveyDto.requiresPhotometricStudies;
    if (updateSurveyDto.requiresRetieCertification !== undefined) survey.requiresRetieCertification = updateSurveyDto.requiresRetieCertification;
    if (updateSurveyDto.requiresRetilapCertification !== undefined) survey.requiresRetilapCertification = updateSurveyDto.requiresRetilapCertification;
    if (updateSurveyDto.requiresCivilWork !== undefined) survey.requiresCivilWork = updateSurveyDto.requiresCivilWork;
    if (updateSurveyDto.previousMonthIpp !== undefined) survey.previousMonthIpp = updateSurveyDto.previousMonthIpp;
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

  async getSurvey(surveyId: number): Promise<Survey> {
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

    return survey;
  }

  async getSurveys(filters: FilterSurveysDto): Promise<{ data: Survey[]; total: number; page: number; limit: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const query = this.surveyRepository.createQueryBuilder('survey')
      .leftJoinAndSelect('survey.work', 'work')
      .leftJoinAndSelect('work.company', 'company')
      .leftJoinAndSelect('work.project', 'project')
      .leftJoinAndSelect('survey.creator', 'creator')
      .leftJoinAndSelect('survey.assignedReviewer', 'assignedReviewer');

    if (filters.companyId) {
      query.andWhere('work.companyId = :companyId', { companyId: filters.companyId });
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

    const [data, total] = await query.skip(skip).take(limit).getManyAndCount();

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

    return this.getSurvey(surveyId);
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

    return this.getSurvey(surveyId);
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

    // Validar que el usuario es el Director Técnico asignado
    if (survey.assignedReviewerId && survey.assignedReviewerId !== userId) {
      throw new ForbiddenException(
        'Solo el Director Técnico asignado puede revisar este levantamiento',
      );
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

    return this.getSurvey(surveyId);
  }

  async approveAllBlocks(surveyId: number, userId: number): Promise<Survey> {
    const survey = await this.surveyRepository.findOne({
      where: { surveyId },
    });

    if (!survey) {
      throw new NotFoundException(`Survey with ID ${surveyId} not found`);
    }

    // Validar que el usuario es el Director Técnico asignado
    if (survey.assignedReviewerId && survey.assignedReviewerId !== userId) {
      throw new ForbiddenException(
        'Solo el Director Técnico asignado puede aprobar este levantamiento',
      );
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

    return this.getSurvey(surveyId);
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

    // Validar que el usuario es el Director Técnico asignado
    if (survey.assignedReviewerId && survey.assignedReviewerId !== userId) {
      throw new ForbiddenException(
        'Solo el Director Técnico asignado puede reabrir este levantamiento',
      );
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

    return this.getSurvey(surveyId);
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
    const userAccess = await this.getMyAccess(userId);
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

    // Apply filters
    if (filters.companyId) {
      query.andWhere('work.companyId = :companyId', { companyId: filters.companyId });
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

    // Transform to include calculated fields
    const data = surveys.map((survey) => ({
      surveyId: survey.surveyId,
      projectCode: survey.projectCode,
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

  private async generateProjectCode(companyId: number, projectId?: number): Promise<string> {
    const abbreviation = await this.getAbbreviation(companyId, projectId);
    const year = new Date().getFullYear().toString().slice(-2);

    // Count existing surveys for this company/project this year
    const query = this.surveyRepository.createQueryBuilder('survey')
      .innerJoin('survey.work', 'work')
      .where('work.companyId = :companyId', { companyId })
      .andWhere('survey.projectCode LIKE :pattern', { pattern: `${abbreviation}-%${year}` });

    if (projectId) {
      query.andWhere('work.projectId = :projectId', { projectId });
    }

    const count = await query.getCount();
    const sequence = (count + 1).toString().padStart(4, '0');

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
        observations: item.observations,
      }),
    );

    await this.travelExpenseRepository.save(expenses);
  }

  // ============================================
  // REVIEWER ACCESS METHODS
  // ============================================

  /**
   * Get the companies and projects the current user has access to review
   */
  async getMyAccess(userId: number): Promise<{
    companies: { companyId: number; name: string }[];
    projects: { projectId: number; name: string; companyId: number }[];
  }> {
    const accesses = await this.surveyReviewerAccessRepository.find({
      where: { userId },
      relations: ['company', 'project', 'project.company'],
    });

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
}
