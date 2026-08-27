import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PagosService } from "./pagos.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PagosAccesoGuard } from "./pagos-acceso.guard";

/**
 * Solicitudes de pago y archivo del banco.
 *
 * **Más cerrado que el resto de Talento Humano**: no basta con el rol del área. Acá está
 * el archivo que se sube al portal bancario —cuenta por cuenta y cuánto se le gira a cada
 * quien— y eso lo ve quien hace el giro, no el área entera. Quién entra lo decide
 * `PagosAccesoGuard`.
 */
@ApiTags("Solicitudes de pago")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PagosAccesoGuard)
@Controller("pagos")
export class PagosController {
  constructor(private readonly service: PagosService) {}

  @Get("solicitudes")
  @ApiOperation({ summary: "Solicitudes de pago, con su número de líneas y su total" })
  list() {
    return this.service.list();
  }

  @Get("solicitudes/:id")
  @ApiOperation({ summary: "El detalle de una solicitud y qué le falta a cada línea" })
  get(@Param("id", ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @Get("solicitudes/:id/archivo-banco")
  @ApiOperation({
    summary: "Las filas del archivo plano del portal bancario, más las líneas que quedaron por fuera",
  })
  archivoBanco(@Param("id", ParseIntPipe) id: number) {
    return this.service.archivoBanco(id);
  }

  @Post("solicitudes")
  @ApiOperation({ summary: "Crea la solicitud; si se le pasa un periodo, la llena con la nómina" })
  crear(
    @Body()
    body: { fecha?: string; concepto?: string; periodo?: string | null; observaciones?: string | null },
    @CurrentUser("userId") userId: number,
  ) {
    return this.service.crear(body, userId);
  }

  @Post("solicitudes/:id/regenerar")
  @ApiOperation({ summary: "Bota las líneas y las vuelve a traer de la nómina del periodo" })
  regenerar(@Param("id", ParseIntPipe) id: number) {
    return this.service.regenerar(id);
  }

  @Post("solicitudes/:id/refrescar-bancarios")
  @ApiOperation({
    summary: "Completa banco, cuenta y nombre partido de las líneas incompletas, sin tocar las demás",
  })
  refrescar(@Param("id", ParseIntPipe) id: number) {
    return this.service.refrescarDatosBancarios(id);
  }

  @Patch("solicitudes/:id")
  @ApiOperation({ summary: "Cambia fecha, concepto, estado u observaciones" })
  actualizar(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { fecha?: string; concepto?: string; estado?: string; observaciones?: string | null },
  ) {
    return this.service.actualizar(id, body);
  }

  @Delete("solicitudes/:id")
  borrar(@Param("id", ParseIntPipe) id: number) {
    return this.service.borrar(id);
  }

  @Post("solicitudes/:id/lineas")
  @ApiOperation({ summary: "Agrega una línea, o edita la que venga con lineaId" })
  guardarLinea(@Param("id", ParseIntPipe) id: number, @Body() body: Record<string, any>) {
    return this.service.guardarLinea(id, body);
  }

  @Delete("solicitudes/:id/lineas/:lineaId")
  borrarLinea(
    @Param("id", ParseIntPipe) id: number,
    @Param("lineaId", ParseIntPipe) lineaId: number,
  ) {
    return this.service.borrarLinea(id, lineaId);
  }
}
