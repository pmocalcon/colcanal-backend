import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { CregService } from "./creg.service";
import {
  AddUcapApellidoDto,
  CreateCregUnitDto,
  RenameUcapApellidoDto,
  SaveCregCensoDto,
  SaveCregLiquidacionDto,
  SaveCregParametrizacionDto,
  SaveUcapCostSheetDto,
  UpsertCregConfigDto,
} from "./dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { Permissions } from "../../common/decorators/permissions.decorator";

function parseOptionalInt(value?: string): number | null {
  if (value === undefined || value === null || value === "" || value === "null") {
    return null;
  }
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

@ApiTags("CREG (Unidades Constructivas)")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("creg")
export class CregController {
  constructor(private readonly service: CregService) {}

  // ---- Configuracion por municipio ----

  @Get("config/:companyId")
  @Permissions("creg:unidades")
  @ApiOperation({ summary: "Obtener configuracion CREG del municipio" })
  getConfig(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.getConfig(companyId, parseOptionalInt(projectId));
  }

  @Put("config/:companyId")
  @Permissions("creg:unidades")
  @ApiOperation({ summary: "Guardar configuracion CREG del municipio" })
  upsertConfig(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Body() dto: UpsertCregConfigDto,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.upsertConfig(companyId, parseOptionalInt(projectId), dto);
  }

  // ---- Resumen agregado (dashboard) ----

  @Get("summary")
  @Permissions("creg:unidades", "creg:resumen")
  @ApiOperation({ summary: "Resumen agregado de UCAPs por municipio" })
  getSummary() {
    return this.service.getSummary();
  }

  // ---- Parametrizacion por municipio ----

  // El Censo fisico y la Liquidacion tambien leen de aqui: el rango de meses y
  // los factores (r, Vi, FAOM, IPP, % ambientales) viven en Parametros.
  @Get("parametrizacion/:companyId")
  @Permissions("creg:parametros", "creg:censo", "creg:liquidacion")
  @ApiOperation({ summary: "Obtener la parametrizacion CREG del municipio" })
  getParametrizacion(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.getParametrizacion(companyId, parseOptionalInt(projectId));
  }

  @Put("parametrizacion/:companyId")
  @Permissions("creg:parametros")
  @ApiOperation({ summary: "Guardar la parametrizacion CREG del municipio" })
  saveParametrizacion(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Body() dto: SaveCregParametrizacionDto,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.saveParametrizacion(
      companyId,
      parseOptionalInt(projectId),
      dto,
    );
  }

  // ---- Censo fisico por municipio ----

  // La Liquidacion toma de aqui las cantidades del mes liquidado.
  @Get("censo/:companyId")
  @Permissions("creg:censo", "creg:liquidacion")
  @ApiOperation({ summary: "Obtener el censo fisico del municipio" })
  getCenso(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.getCenso(companyId, parseOptionalInt(projectId));
  }

  @Put("censo/:companyId")
  @Permissions("creg:censo")
  @ApiOperation({ summary: "Guardar el censo fisico del municipio" })
  saveCenso(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Body() dto: SaveCregCensoDto,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.saveCenso(companyId, parseOptionalInt(projectId), dto);
  }

  // ---- Liquidacion mensual por municipio ----

  // La liquidacion se calcula con el censo y los Parametros del municipio;
  // aqui solo vive lo propio de cada mes (ajustes, IPP usado).
  @Get("liquidacion/:companyId")
  @Permissions("creg:liquidacion")
  @ApiOperation({ summary: "Obtener la liquidacion mensual del municipio" })
  getLiquidacion(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.getLiquidacion(companyId, parseOptionalInt(projectId));
  }

  @Put("liquidacion/:companyId")
  @Permissions("creg:liquidacion")
  @ApiOperation({ summary: "Guardar la liquidacion mensual del municipio" })
  saveLiquidacion(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Body() dto: SaveCregLiquidacionDto,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.saveLiquidacion(
      companyId,
      parseOptionalInt(projectId),
      dto,
    );
  }

  // ---- Hojas de costos (sobre UCAPs) ----

  // Lo consumen tanto Unidades constructivas como Resumen UCAP.
  @Get("units")
  @Permissions("creg:unidades", "creg:resumen")
  @ApiOperation({ summary: "Listar UCAPs con hoja de costos del municipio" })
  findAll(
    @Query("companyId", ParseIntPipe) companyId: number,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.findAll(companyId, parseOptionalInt(projectId));
  }

  @Post("units")
  @Permissions("creg:unidades")
  @ApiOperation({ summary: "Crear la UCAP junto con su hoja de costos" })
  createUnit(@Body() dto: CreateCregUnitDto) {
    return this.service.createUnit(dto);
  }

  @Get("units/:ucapId")
  @Permissions("creg:unidades")
  @ApiOperation({ summary: "Obtener la hoja de costos de una UCAP" })
  findOne(@Param("ucapId", ParseIntPipe) ucapId: number) {
    return this.service.findOne(ucapId);
  }

  @Put("units/:ucapId")
  @Permissions("creg:unidades")
  @ApiOperation({ summary: "Guardar la hoja de costos dentro de la UCAP" })
  saveSheet(
    @Param("ucapId", ParseIntPipe) ucapId: number,
    @Body() dto: SaveUcapCostSheetDto,
  ) {
    return this.service.saveSheet(ucapId, dto);
  }

  // ---- Apellidos/variantes de una UCAP ----

  @Get("units/:ucapId/apellidos")
  @Permissions("creg:unidades", "creg:censo")
  @ApiOperation({ summary: "Listar los apellidos/variantes de una UCAP" })
  listApellidos(@Param("ucapId", ParseIntPipe) ucapId: number) {
    return this.service.listApellidos(ucapId);
  }

  @Post("units/:ucapId/apellidos")
  @Permissions("creg:unidades", "creg:censo")
  @ApiOperation({ summary: "Agregar un apellido/variante a la UCAP" })
  addApellido(
    @Param("ucapId", ParseIntPipe) ucapId: number,
    @Body() dto: AddUcapApellidoDto,
  ) {
    return this.service.addApellido(ucapId, dto.apellido);
  }

  @Patch("apellidos/:apellidoId")
  @Permissions("creg:unidades", "creg:censo")
  @ApiOperation({ summary: "Renombrar un apellido/variante" })
  renameApellido(
    @Param("apellidoId", ParseIntPipe) apellidoId: number,
    @Body() dto: RenameUcapApellidoDto,
  ) {
    return this.service.renameApellido(apellidoId, dto.apellido);
  }

  @Delete("apellidos/:apellidoId")
  @Permissions("creg:unidades", "creg:censo")
  @ApiOperation({ summary: "Eliminar un apellido/variante" })
  deleteApellido(@Param("apellidoId", ParseIntPipe) apellidoId: number) {
    return this.service.deleteApellido(apellidoId);
  }

  @Delete("units/:ucapId/sheet")
  @Permissions("creg:unidades")
  @ApiOperation({ summary: "Eliminar la hoja de costos de una UCAP (sin borrar la UCAP)" })
  clearSheet(@Param("ucapId", ParseIntPipe) ucapId: number) {
    return this.service.clearSheet(ucapId);
  }

  @Delete("units/:ucapId")
  @Permissions("creg:unidades", "creg:censo")
  @ApiOperation({ summary: "Eliminar la UCAP por completo (libera el código)" })
  deleteUnit(@Param("ucapId", ParseIntPipe) ucapId: number) {
    return this.service.deleteUnit(ucapId);
  }
}
