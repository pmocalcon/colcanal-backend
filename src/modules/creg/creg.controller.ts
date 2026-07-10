import {
  Controller,
  Get,
  Post,
  Put,
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
  CreateCregUnitDto,
  SaveCregCensoDto,
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

  // El Censo fisico tambien lee de aqui: el rango de meses vive en Parametros.
  @Get("parametrizacion/:companyId")
  @Permissions("creg:parametros", "creg:censo")
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

  @Get("censo/:companyId")
  @Permissions("creg:censo")
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

  @Delete("units/:ucapId")
  @Permissions("creg:unidades")
  @ApiOperation({ summary: "Eliminar la hoja de costos de una UCAP" })
  clearSheet(@Param("ucapId", ParseIntPipe) ucapId: number) {
    return this.service.clearSheet(ucapId);
  }
}
