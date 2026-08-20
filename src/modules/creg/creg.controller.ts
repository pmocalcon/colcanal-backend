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
  AprobarCregMesDto,
  CreateCregUnitDto,
  RenameUcapApellidoDto,
  SaveCregCensoDto,
  SaveCregLiquidacionDto,
  SaveCregIddOffDto,
  SaveCregFacturaEnergiaDto,
  SaveCregIddOnDto,
  SaveCregParametrizacionDto,
  SaveCregIppMensualDto,
  SaveUcapCostSheetDto,
  UpsertCregConfigDto,
} from "./dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

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

  @Get("comparador")
  @Permissions("creg:unidades", "creg:resumen")
  @ApiOperation({
    summary: "La misma UCAP en todos los municipios, para compararlas",
    description:
      "Solo lectura. Devuelve una matriz de códigos de UCAP por municipio con el " +
      "valor de cada uno (total con indirectos, sin IPP) y cuántas veces cabe el " +
      "menor en el mayor, que es lo que delata una UCAP mal cargada.",
  })
  getComparador() {
    return this.service.getComparador();
  }

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

  // ---- IPP mensual (global, no va por municipio) ----

  // Lo leen la Liquidacion y el Flujo de Caja de cualquier municipio, por eso el
  // GET abre los mismos permisos que la parametrizacion.
  @Get("ipp-mensual")
  @Permissions("creg:parametros", "creg:censo", "creg:liquidacion")
  @ApiOperation({ summary: "Serie del IPP mes a mes (global)" })
  getIppMensual() {
    return this.service.getIppMensual();
  }

  @Put("ipp-mensual")
  @Permissions("creg:parametros")
  @ApiOperation({ summary: "Guardar la serie del IPP mes a mes (global)" })
  saveIppMensual(@Body() dto: SaveCregIppMensualDto) {
    return this.service.saveIppMensual(dto);
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
    @CurrentUser("userId") userId: number,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.saveLiquidacion(
      companyId,
      parseOptionalInt(projectId),
      dto,
      userId,
    );
  }

  // ---- Cierre mensual: Liquidacion, ID OFF e ID ON ----

  // El permiso solo abre la pantalla; que sea el Director Tecnico lo valida el
  // servicio, que es quien conoce el rol.
  @Post("liquidacion/:companyId/aprobar")
  @Permissions("creg:liquidacion")
  @ApiOperation({ summary: "Aprobar y cerrar el mes liquidado (Director Tecnico)" })
  aprobarLiquidacion(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Body() dto: AprobarCregMesDto,
    @CurrentUser("userId") userId: number,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.aprobarMes(
      "liquidacion", companyId, parseOptionalInt(projectId), dto.ym, userId,
    );
  }

  @Post("liquidacion/:companyId/reabrir")
  @Permissions("creg:liquidacion")
  @ApiOperation({ summary: "Reabrir un mes liquidado ya cerrado (Director Tecnico)" })
  reabrirLiquidacion(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Body() dto: AprobarCregMesDto,
    @CurrentUser("userId") userId: number,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.reabrirMes(
      "liquidacion", companyId, parseOptionalInt(projectId), dto.ym, userId, dto.motivo,
    );
  }

  @Post("idd-off/:companyId/aprobar")
  @Permissions("creg:iddoff")
  @ApiOperation({ summary: "Aprobar y cerrar el mes de ID OFF (Director Tecnico)" })
  aprobarIddOff(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Body() dto: AprobarCregMesDto,
    @CurrentUser("userId") userId: number,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.aprobarMes(
      "idd-off", companyId, parseOptionalInt(projectId), dto.ym, userId,
    );
  }

  @Post("idd-off/:companyId/reabrir")
  @Permissions("creg:iddoff")
  @ApiOperation({ summary: "Reabrir un mes de ID OFF ya cerrado (Director Tecnico)" })
  reabrirIddOff(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Body() dto: AprobarCregMesDto,
    @CurrentUser("userId") userId: number,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.reabrirMes(
      "idd-off", companyId, parseOptionalInt(projectId), dto.ym, userId, dto.motivo,
    );
  }

  @Post("idd-on/:companyId/aprobar")
  @Permissions("creg:iddon")
  @ApiOperation({ summary: "Aprobar y cerrar el mes de ID ON (Director Tecnico)" })
  aprobarIddOn(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Body() dto: AprobarCregMesDto,
    @CurrentUser("userId") userId: number,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.aprobarMes(
      "idd-on", companyId, parseOptionalInt(projectId), dto.ym, userId,
    );
  }

  @Post("idd-on/:companyId/reabrir")
  @Permissions("creg:iddon")
  @ApiOperation({ summary: "Reabrir un mes de ID ON ya cerrado (Director Tecnico)" })
  reabrirIddOn(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Body() dto: AprobarCregMesDto,
    @CurrentUser("userId") userId: number,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.reabrirMes(
      "idd-on", companyId, parseOptionalInt(projectId), dto.ym, userId, dto.motivo,
    );
  }

  // ---- IDD OFF: indice de disponibilidad (apagadas) ----

  // La liquidacion lee el ID del mes para la anualidad de inversion, asi que
  // tambien puede consultarlo con su propio permiso.
  @Get("idd-off/:companyId")
  @Permissions("creg:iddoff", "creg:liquidacion")
  @ApiOperation({ summary: "Obtener las fallas y el indice de disponibilidad" })
  getIddOff(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.getIddOff(companyId, parseOptionalInt(projectId));
  }

  @Put("idd-off/:companyId")
  @Permissions("creg:iddoff")
  @ApiOperation({ summary: "Guardar las fallas del periodo (IDD OFF)" })
  saveIddOff(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Body() dto: SaveCregIddOffDto,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.saveIddOff(companyId, parseOptionalInt(projectId), dto);
  }

  // ---- Facturas de energia del comercializador ----

  @Get("factura-energia/:companyId")
  @Permissions("creg:liquidacion")
  @ApiOperation({ summary: "Obtener las facturas de energia del municipio" })
  getFacturaEnergia(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.getFacturaEnergia(companyId, parseOptionalInt(projectId));
  }

  @Put("factura-energia/:companyId")
  @Permissions("creg:liquidacion")
  @ApiOperation({ summary: "Guardar las facturas de energia del municipio" })
  saveFacturaEnergia(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Body() dto: SaveCregFacturaEnergiaDto,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.saveFacturaEnergia(
      companyId, parseOptionalInt(projectId), dto,
    );
  }

  // ---- ID ON: indice de disponibilidad (encendidas) ----

  @Get("idd-on/:companyId")
  @Permissions("creg:iddon", "creg:liquidacion")
  @ApiOperation({ summary: "Obtener las encendidas y el indice de disponibilidad" })
  getIddOn(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.getIddOn(companyId, parseOptionalInt(projectId));
  }

  @Put("idd-on/:companyId")
  @Permissions("creg:iddon")
  @ApiOperation({ summary: "Guardar las encendidas del periodo (ID ON)" })
  saveIddOn(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Body() dto: SaveCregIddOnDto,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.saveIddOn(companyId, parseOptionalInt(projectId), dto);
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

  // Una UCAP con hoja de costos queda cerrada. Reabrirla es del Director
  // Tecnico; el permiso solo abre la pantalla, el rol lo valida el servicio.
  @Post("units/:ucapId/reabrir")
  @Permissions("creg:unidades")
  @ApiOperation({ summary: "Reabrir una UCAP cerrada para editarla (Director Tecnico)" })
  reabrirUnit(
    @Param("ucapId", ParseIntPipe) ucapId: number,
    @CurrentUser("userId") userId: number,
  ) {
    return this.service.reabrirUnit(ucapId, userId);
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
