import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ObrasAuditService } from "./obras-audit.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { Permissions } from "../../common/decorators/permissions.decorator";

/**
 * Auditoría del módulo de obras. Solo lectura, igual que la de compras.
 *
 * Cuelga de `/audit/obras` y no del módulo de obras a propósito: la puerta es la gestión
 * `auditorias`, no la de obras. Quien audita —Gerencia, la Dirección Financiera, el
 * PMO— no necesariamente puede tocar una obra, y quien las crea no por eso audita.
 */
@ApiTags("Auditorías · Obras")
@Controller("audit/obras")
@UseGuards(JwtAuthGuard, PermissionsGuard)
// La misma gestion que abre la entrada del menu, exigida tambien en el servidor: son
// cinco roles (Gerencia, Director PMO, Direccion Financiera, Analista PMO y Compras) y
// ninguno mas tiene por que poder pedir el expediente de todas las obras por la URL.
@Permissions("auditorias:ver")
@ApiBearerAuth("JWT-auth")
export class ObrasAuditController {
  constructor(private readonly obrasAudit: ObrasAuditService) {}

  @Get("actas")
  @ApiOperation({
    summary: "Listado de actas con sus cuatro carriles",
    description: `
    Una fila por acta con el estado del acta, del presupuesto, del cronograma y del
    permiso de compra anticipada, además de cuántas obras agrupa, cuánto valen y cuándo
    se movió por última vez.

    El valor es el mismo del «Resumen de Acta» (presupuesto del levantamiento ajustado
    por IPP): la auditoría no puede sumar distinto que la pantalla que audita.
    `,
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "companyName", required: false, type: String })
  @ApiQuery({ name: "actaNumber", required: false, type: String })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "fromDate", required: false, type: String })
  @ApiQuery({ name: "toDate", required: false, type: String })
  @ApiResponse({ status: 200, description: "Listado obtenido exitosamente" })
  async getActas(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("companyName") companyName?: string,
    @Query("actaNumber") actaNumber?: string,
    @Query("status") status?: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ) {
    return this.obrasAudit.getActas({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      companyName,
      actaNumber,
      status,
      fromDate,
      toDate,
    });
  }

  @Get("obras")
  @ApiOperation({
    summary: "Listado de obras con el estado de su levantamiento",
    description: `
    Una fila por obra: código, municipio, acta que la agrupa, estado del levantamiento,
    cuántos de sus cinco bloques están aprobados y quién lo revisó.

    \`busqueda\` cruza código y nombre con el mismo texto, porque quien audita teclea
    «PA-12» o «parque principal» sin saber cuál de los dos campos está mirando.
    `,
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "companyName", required: false, type: String })
  @ApiQuery({ name: "actaNumber", required: false, type: String })
  @ApiQuery({ name: "busqueda", required: false, type: String })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "fromDate", required: false, type: String })
  @ApiQuery({ name: "toDate", required: false, type: String })
  @ApiResponse({ status: 200, description: "Listado obtenido exitosamente" })
  async getObras(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("companyName") companyName?: string,
    @Query("actaNumber") actaNumber?: string,
    @Query("busqueda") busqueda?: string,
    @Query("status") status?: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ) {
    return this.obrasAudit.getObras({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      companyName,
      actaNumber,
      busqueda,
      status,
      fromDate,
      toDate,
    });
  }

  @Get("acta/:actaId")
  @ApiOperation({
    summary: "Línea de tiempo de un acta",
    description: `
    La historia completa del acta: el estado de sus cuatro carriles, las obras que
    agrupa y todos sus movimientos en orden.

    Cada movimiento dice de dónde sale. **registrado** lo anotó la bitácora cuando
    ocurrió y responde por su fecha y su autor; **reconstruido** se dedujo de las
    columnas de la fila porque es anterior a la bitácora, y de esos solo sobrevive el
    último movimiento de cada carril. La pantalla tiene que mostrar la diferencia.

    Devuelve además los festivos, para que el navegador mida el tiempo entre pasos en
    días hábiles con la misma cuenta que la auditoría de compras.
    `,
  })
  @ApiResponse({ status: 200, description: "Detalle obtenido exitosamente" })
  @ApiResponse({ status: 404, description: "Acta no encontrada" })
  async getActaDetalle(@Param("actaId", ParseIntPipe) actaId: number) {
    return this.obrasAudit.getActaDetalle(actaId);
  }

  @Get("obra/:workId")
  @ApiOperation({
    summary: "Línea de tiempo de una obra",
    description: `
    La historia de la obra y de su levantamiento, con el estado y el reparo de cada uno
    de los cinco bloques, y los movimientos en orden con su origen.
    `,
  })
  @ApiResponse({ status: 200, description: "Detalle obtenido exitosamente" })
  @ApiResponse({ status: 404, description: "Obra no encontrada" })
  async getObraDetalle(@Param("workId", ParseIntPipe) workId: number) {
    return this.obrasAudit.getObraDetalle(workId);
  }

  @Get("stats")
  @ApiOperation({
    summary: "Estadísticas de obras, actas y levantamientos",
    description: `
    Totales por estado, movimientos por acción, y **desde cuándo existe la bitácora**:
    ese dato es el que permite decirle a quien audita hasta dónde llega lo que consta.
    `,
  })
  @ApiResponse({ status: 200, description: "Estadísticas obtenidas exitosamente" })
  async getStats() {
    return this.obrasAudit.getStats();
  }
}
