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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CompanyContactsService } from './company-contacts.service';
import { CreateCompanyContactDto } from './dto/create-company-contact.dto';
import { UpdateCompanyContactDto } from './dto/update-company-contact.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Company Contacts')
@ApiBearerAuth()
@Controller('company-contacts')
@UseGuards(JwtAuthGuard)
export class CompanyContactsController {
  constructor(private readonly contactsService: CompanyContactsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo contacto de compañía' })
  async create(@Body() createDto: CreateCompanyContactDto) {
    return await this.contactsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los contactos' })
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  async findAll(
    @Query('companyId') companyId?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const active = activeOnly === undefined || activeOnly === 'true';
    const company = companyId ? parseInt(companyId, 10) : undefined;
    return await this.contactsService.findAll(company, active);
  }

  @Get('company/:companyId')
  @ApiOperation({ summary: 'Obtener contactos por compañía' })
  async findByCompany(@Param('companyId', ParseIntPipe) companyId: number) {
    return await this.contactsService.findByCompany(companyId);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Obtener contactos por proyecto' })
  async findByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return await this.contactsService.findByProject(projectId);
  }

  @Get('company/:companyId/default')
  @ApiOperation({ summary: 'Obtener contacto por defecto de una compañía' })
  @ApiQuery({ name: 'projectId', required: false, type: Number })
  async findDefault(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query('projectId') projectId?: string,
  ) {
    const project = projectId ? parseInt(projectId, 10) : undefined;
    return await this.contactsService.findDefaultForCompany(companyId, project);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un contacto por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.contactsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un contacto' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCompanyContactDto,
  ) {
    return await this.contactsService.update(id, updateDto);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Establecer un contacto como default' })
  async setAsDefault(@Param('id', ParseIntPipe) id: number) {
    return await this.contactsService.setAsDefault(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un contacto' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.contactsService.remove(id);
    return { message: 'Contacto desactivado exitosamente' };
  }
}
