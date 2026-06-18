import {
  Controller,
  Get,
  Post,
  Put,
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
} from '@nestjs/swagger';
import { DirectorBudgetsService } from './director-budgets.service';
import {
  CreateDirectorBudgetDto,
  UpdateDirectorBudgetDto,
  FilterDirectorBudgetsDto,
  UpdateBudgetStatusDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Director Budgets (Presupuesto Director)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('director-budgets')
export class DirectorBudgetsController {
  constructor(private readonly service: DirectorBudgetsService) {}

  @Post()
  @Permissions('levantamientos:crear')
  @ApiOperation({ summary: 'Create a director budget' })
  @ApiResponse({ status: 201 })
  async create(
    @Body() dto: CreateDirectorBudgetDto,
    @CurrentUser('userId') userId: number,
  ) {
    return this.service.create(dto, userId);
  }

  @Put(':id')
  @Permissions('levantamientos:crear')
  @ApiOperation({ summary: 'Update a director budget' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDirectorBudgetDto,
    @CurrentUser('userId') userId: number,
  ) {
    return this.service.update(id, dto, userId);
  }

  @Get()
  @Permissions('levantamientos:ver', 'levantamientos:presupuesto', 'levantamientos:revisar', 'levantamientos:autorizar', 'levantamientos:aprobar')
  @ApiOperation({ summary: 'List director budgets' })
  async findAll(@Query() filters: FilterDirectorBudgetsDto) {
    return this.service.findAll(filters);
  }

  @Get(':id')
  @Permissions('levantamientos:ver', 'levantamientos:presupuesto', 'levantamientos:revisar', 'levantamientos:autorizar', 'levantamientos:aprobar')
  @ApiOperation({ summary: 'Get a single director budget' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id/status')
  @Permissions('levantamientos:revisar', 'levantamientos:autorizar', 'levantamientos:aprobar', 'levantamientos:presupuesto')
  @ApiOperation({ summary: 'Update budget status (draft → en_revision → final). Aprobar/rechazar: solo Gerencia' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBudgetStatusDto,
    @CurrentUser('userId') userId: number,
  ) {
    return this.service.updateStatus(id, dto.status, userId);
  }
}
