import { Controller, Get, Put, Delete, Param, Body, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { UpsertDailyPlansDto } from './dto/upsert-daily-plans.dto';
import { UpsertMaterialLogsDto } from './dto/material-log.dto';
import { UpsertDailyExecutionDto, UpsertExecutionsDto } from './dto/execution.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Schedules (Cronogramas)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get('work/:workId/survey-materials')
  @Permissions('levantamientos:ver')
  @ApiOperation({ summary: 'Get aggregated survey materials for a work' })
  async getSurveyMaterials(@Param('workId', ParseIntPipe) workId: number) {
    return this.schedulesService.getSurveyMaterials(workId);
  }

  @Get('work/:workId/purchase-comparison')
  @Permissions('levantamientos:ver')
  @ApiOperation({ summary: 'Compare budget vs purchase orders per material for a work' })
  async getWorkPurchaseComparison(@Param('workId', ParseIntPipe) workId: number) {
    return this.schedulesService.getWorkPurchaseComparison(workId);
  }

  @Get('work/:workId')
  @Permissions('levantamientos:ver')
  @ApiOperation({ summary: 'Get or create schedule for a work' })
  async getByWork(@Param('workId', ParseIntPipe) workId: number) {
    return this.schedulesService.getOrCreateSchedule(workId);
  }

  @Put(':scheduleId')
  @Permissions('levantamientos:ver')
  @ApiOperation({ summary: 'Update schedule dates and executed quantities' })
  async update(
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedulesService.updateSchedule(scheduleId, dto);
  }

  @Get(':scheduleId/daily-plans')
  @Permissions('levantamientos:ver')
  @ApiOperation({ summary: 'Get daily planned quantities for a date range' })
  @ApiQuery({ name: 'from', example: '2026-05-19' })
  @ApiQuery({ name: 'to', example: '2026-05-25' })
  async getDailyPlans(
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.schedulesService.getDailyPlans(scheduleId, from, to);
  }

  @Put(':scheduleId/daily-plans')
  @Permissions('levantamientos:ver')
  @ApiOperation({ summary: 'Upsert daily planned quantities' })
  async upsertDailyPlans(
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
    @Body() dto: UpsertDailyPlansDto,
  ) {
    return this.schedulesService.upsertDailyPlans(scheduleId, dto);
  }

  @Get(':scheduleId/material-logs')
  @Permissions('levantamientos:ver')
  @ApiOperation({ summary: 'Get material usage logs for a schedule' })
  async getMaterialLogs(@Param('scheduleId', ParseIntPipe) scheduleId: number) {
    return this.schedulesService.getMaterialLogs(scheduleId);
  }

  @Put(':scheduleId/material-logs')
  @Permissions('levantamientos:ver')
  @ApiOperation({ summary: 'Save material usage logs (full replace)' })
  async upsertMaterialLogs(
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
    @Body() dto: UpsertMaterialLogsDto,
  ) {
    return this.schedulesService.upsertMaterialLogs(scheduleId, dto);
  }

  @Delete(':scheduleId/material-logs/:logId')
  @Permissions('levantamientos:ver')
  @ApiOperation({ summary: 'Delete a single material usage log' })
  async deleteMaterialLog(
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
    @Param('logId', ParseIntPipe) logId: number,
  ) {
    return this.schedulesService.deleteMaterialLog(scheduleId, logId);
  }

  @Put(':scheduleId/daily-execution')
  @Permissions('levantamientos:ver')
  @ApiOperation({ summary: 'Upsert daily executed quantities (Ejecución UCAPs)' })
  async upsertDailyExecution(
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
    @Body() dto: UpsertDailyExecutionDto,
  ) {
    return this.schedulesService.upsertDailyExecution(scheduleId, dto);
  }

  @Get(':scheduleId/executions')
  @Permissions('levantamientos:ver')
  @ApiOperation({ summary: 'Get execution records (materiales/actividades)' })
  @ApiQuery({ name: 'type', enum: ['material', 'activity'] })
  async getExecutions(
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
    @Query('type') type: 'material' | 'activity',
  ) {
    return this.schedulesService.getExecutions(scheduleId, type);
  }

  @Put(':scheduleId/executions')
  @Permissions('levantamientos:ver')
  @ApiOperation({ summary: 'Save execution records (full replace by type)' })
  async upsertExecutions(
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
    @Body() dto: UpsertExecutionsDto,
  ) {
    return this.schedulesService.upsertExecutions(scheduleId, dto);
  }
}
