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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { GestionConocimientoService } from "./gestion-conocimiento.service";
import { CreateSolicitudDto, UpdateSolicitudDto, TransitionDto } from "./dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

/**
 * Gestión del conocimiento — solicitudes de los formatos por gestión.
 * Solo requiere sesión (JwtAuthGuard), igual que el módulo de Auditorías: no hay
 * permiso granular propio todavía.
 */
@ApiTags("Gestión del conocimiento")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("gestion-conocimiento/solicitudes")
export class GestionConocimientoController {
  constructor(private readonly service: GestionConocimientoService) {}

  @Post()
  @ApiOperation({ summary: "Crear una solicitud de un formato" })
  @ApiResponse({ status: 201 })
  async create(
    @Body() dto: CreateSolicitudDto,
    @CurrentUser("userId") userId: number,
  ) {
    return this.service.create(dto, userId);
  }

  /**
   * Lo que ya se sabe de una cédula, para prellenar el encabezado de un formato.
   *
   * Va antes de `@Get(":id")` porque si no, «ficha» lo tomaría como un id y fallaría al
   * convertirlo a número.
   *
   * Sin `@Roles`: los formatos de Talento Humano los diligencia cualquier empleado, y si
   * el prellenado pidiera permisos que ellos no tienen, la casilla no serviría justo para
   * quien la va a usar. El salario es lo único que se recorta por rol, y eso lo decide el
   * servicio.
   */
  @Get("ficha")
  @ApiOperation({ summary: "Datos de una persona para prellenar un formato" })
  @ApiQuery({ name: "identificacion", required: true, type: String })
  async ficha(
    @Query("identificacion") identificacion: string,
    @CurrentUser("userId") userId: number,
  ) {
    return this.service.fichaParaFormato(identificacion, userId);
  }

  @Get()
  @ApiOperation({ summary: "Listar solicitudes (filtra por gestión y por propias)" })
  @ApiQuery({ name: "gestion", required: false, type: String })
  @ApiQuery({ name: "mine", required: false, type: String, description: "1 = solo las del usuario" })
  async findAll(
    @CurrentUser("userId") userId: number,
    @Query("gestion") gestion?: string,
    @Query("mine") mine?: string,
  ) {
    return this.service.findAll(gestion, mine === "1" || mine === "true", userId);
  }

  // Va antes de @Get(":id") por ruta y además es POST: así no lo captura el
  // comodín del id, que lo mandaría al ParseIntPipe.
  @Post("vencimientos/revisar")
  @ApiOperation({
    summary:
      "Revisar ahora los vencimientos de contratos y avisar a la Dirección Administrativa",
  })
  async revisarVencimientos() {
    return this.service.revisarVencimientos();
  }

  @Post(":id/requisicion-poliza")
  @ApiOperation({
    summary:
      "Solicitar la requisición de la póliza sin mover el flujo (contratos ya firmados)",
  })
  async solicitarRequisicionPoliza(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("userId") userId: number,
  ) {
    return this.service.solicitarRequisicionPoliza(id, userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener una solicitud" })
  async findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Actualizar el cuerpo de una solicitud (solo en borrador)" })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateSolicitudDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(":id/transicion")
  @ApiOperation({ summary: "Ejecutar una acción del flujo de Jurídica" })
  async transition(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: TransitionDto,
    @CurrentUser("userId") userId: number,
  ) {
    return this.service.transition(id, dto.accion, userId, dto.motivo, dto.data);
  }

  @Patch(":id/checklist")
  @ApiOperation({ summary: "Guardar la Lista de Chequeo de Documentos (GA-25-F)" })
  async saveChecklist(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { checklist: Record<string, any> },
    @CurrentUser("userId") userId: number,
  ) {
    return this.service.saveChecklist(id, body.checklist ?? {}, userId);
  }

  @Patch(":id/documento")
  @ApiOperation({ summary: "Guardar un documento de fase 2 (designación de supervisor / acta de inicio)" })
  async saveDocumento(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { key: string; data: Record<string, any> },
    @CurrentUser("userId") userId: number,
  ) {
    return this.service.saveDocumento(id, body.key, body.data ?? {}, userId);
  }

  @Patch(":id/poliza")
  @ApiOperation({
    summary:
      "Aprobar o rechazar la requisición de la póliza (solo Dirección Administrativa y Financiera)",
  })
  async resolverPoliza(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { decision: "aprobar" | "rechazar"; comentario?: string },
    @CurrentUser("userId") userId: number,
  ) {
    return this.service.resolverPolizaRequisicion(
      id,
      userId,
      body.decision,
      body.comentario,
    );
  }

  @Delete(":id")
  @ApiOperation({ summary: "Eliminar una solicitud" })
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.service.remove(id);
    return { message: "Solicitud eliminada" };
  }
}
