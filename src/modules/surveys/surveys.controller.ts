import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SurveysService } from './surveys.service';
import {
  CreateWorkDto,
  UpdateWorkDto,
  CreateSurveyDto,
  UpdateSurveyDto,
  ReviewSurveyDto,
  FilterSurveysDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Surveys (Levantamiento de Obras)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  // ============================================
  // WORK (OBRA) ENDPOINTS
  // ============================================

  @Post('works')
  @ApiOperation({ summary: 'Create a new work (obra)' })
  @ApiResponse({ status: 201, description: 'Work created successfully' })
  async createWork(
    @Body() createWorkDto: CreateWorkDto,
    @CurrentUser('userId') userId: number,
  ) {
    return this.surveysService.createWork(createWorkDto, userId);
  }

  @Get('works')
  @ApiOperation({ summary: 'Get all works' })
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @ApiQuery({ name: 'projectId', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of works' })
  async getWorks(
    @Query('companyId') companyId?: number,
    @Query('projectId') projectId?: number,
  ) {
    return this.surveysService.getWorks(companyId, projectId);
  }

  @Get('works/:id')
  @ApiOperation({ summary: 'Get a work by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Work details' })
  async getWork(@Param('id', ParseIntPipe) id: number) {
    return this.surveysService.getWork(id);
  }

  @Put('works/:id')
  @ApiOperation({ summary: 'Update a work' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Work updated successfully' })
  async updateWork(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWorkDto: UpdateWorkDto,
    @CurrentUser('userId') userId: number,
  ) {
    return this.surveysService.updateWork(id, updateWorkDto, userId);
  }

  @Delete('works/:id')
  @ApiOperation({ summary: 'Delete a work' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Work deleted successfully' })
  async deleteWork(@Param('id', ParseIntPipe) id: number) {
    await this.surveysService.deleteWork(id);
    return { message: 'Work deleted successfully' };
  }

  // ============================================
  // SURVEY (LEVANTAMIENTO) ENDPOINTS
  // ============================================

  @Post()
  @ApiOperation({ summary: 'Create a new survey (levantamiento)' })
  @ApiResponse({ status: 201, description: 'Survey created successfully' })
  async createSurvey(
    @Body() createSurveyDto: CreateSurveyDto,
    @CurrentUser('userId') userId: number,
  ) {
    return this.surveysService.createSurvey(createSurveyDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all surveys with filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of surveys' })
  async getSurveys(@Query() filters: FilterSurveysDto) {
    return this.surveysService.getSurveys(filters);
  }

  @Get('for-review')
  @ApiOperation({ summary: 'Get surveys pending review (for Technical Director)' })
  @ApiResponse({ status: 200, description: 'List of surveys pending review' })
  async getSurveysForReview() {
    return this.surveysService.getSurveysForReview();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a survey by ID with all details' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Survey details with all related items' })
  async getSurvey(@Param('id', ParseIntPipe) id: number) {
    return this.surveysService.getSurvey(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a survey' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Survey updated successfully' })
  async updateSurvey(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSurveyDto: UpdateSurveyDto,
    @CurrentUser('userId') userId: number,
  ) {
    return this.surveysService.updateSurvey(id, updateSurveyDto, userId);
  }

  @Patch(':id/submit')
  @ApiOperation({ summary: 'Submit survey for review' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Survey submitted for review' })
  async submitForReview(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('userId') userId: number,
  ) {
    return this.surveysService.submitForReview(id, userId);
  }

  @Patch(':id/review')
  @ApiOperation({ summary: 'Review a survey (approve/reject)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Survey reviewed successfully' })
  async reviewSurvey(
    @Param('id', ParseIntPipe) id: number,
    @Body() reviewDto: ReviewSurveyDto,
    @CurrentUser('userId') userId: number,
  ) {
    return this.surveysService.reviewSurvey(id, reviewDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a survey' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Survey deleted successfully' })
  async deleteSurvey(@Param('id', ParseIntPipe) id: number) {
    await this.surveysService.deleteSurvey(id);
    return { message: 'Survey deleted successfully' };
  }

  // ============================================
  // UCAP ENDPOINTS
  // ============================================

  @Get('ucaps/:companyId')
  @ApiOperation({ summary: 'Get UCAPs for a company' })
  @ApiParam({ name: 'companyId', type: Number })
  @ApiQuery({ name: 'projectId', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of UCAPs' })
  async getUcaps(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query('projectId') projectId?: number,
  ) {
    return this.surveysService.getUcaps(companyId, projectId);
  }
}
