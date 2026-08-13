import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { TalentoHumanoService } from "./talento-humano.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ROLES_TALENTO_HUMANO } from "./talento-humano.roles";

/**
 * Talento humano: personal, incapacidades, ausentismos y préstamos.
 *
 * Se cierra **por rol y no por permiso**, igual que Recurso Económico: no hay permisos
 * `talento:*` en la tabla y crearlos obligaría a tocar `roles_permisos` en producción
 * —donde las secuencias están desalineadas— para no ganar nada que el rol no resuelva.
 */
@ApiTags("Talento Humano")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("talento-humano")
export class TalentoHumanoController {
  constructor(private readonly service: TalentoHumanoService) {}

  // ── Personal ──

  @Get("personal")
  @Roles(...ROLES_TALENTO_HUMANO)
  @ApiOperation({ summary: "Base de personal, con filtros" })
  listPersonal(
    @Query("estado") estado?: string,
    @Query("area") area?: string,
    @Query("empresa") empresa?: string,
    @Query("buscar") buscar?: string,
  ) {
    return this.service.listPersonal({ estado, area, empresa, buscar });
  }

  @Get("personal/:id")
  @Roles(...ROLES_TALENTO_HUMANO)
  getPersona(@Param("id", ParseIntPipe) id: number) {
    return this.service.getPersona(id);
  }

  @Post("personal")
  @Roles(...ROLES_TALENTO_HUMANO)
  createPersona(@Body() body: Record<string, any>) {
    return this.service.createPersona(body);
  }

  @Patch("personal/:id")
  @Roles(...ROLES_TALENTO_HUMANO)
  updatePersona(@Param("id", ParseIntPipe) id: number, @Body() body: Record<string, any>) {
    return this.service.updatePersona(id, body);
  }

  @Delete("personal/:id")
  @Roles(...ROLES_TALENTO_HUMANO)
  @ApiOperation({ summary: "Marca la persona como INACTIVO (no la borra)" })
  inactivarPersona(@Param("id", ParseIntPipe) id: number) {
    return this.service.inactivarPersona(id);
  }

  // ── Incapacidades ──

  @Get("incapacidades")
  @Roles(...ROLES_TALENTO_HUMANO)
  @ApiOperation({ summary: "Incapacidades y su recobro, con filtros" })
  listIncapacidades(
    @Query("estado") estado?: string,
    @Query("entidad") entidad?: string,
    @Query("buscar") buscar?: string,
  ) {
    return this.service.listIncapacidades({ estado, entidad, buscar });
  }

  @Get("incapacidades/resumen")
  @Roles(...ROLES_TALENTO_HUMANO)
  @ApiOperation({ summary: "Cuánto hay por recobrar y recuperado, por estado" })
  resumen() {
    return this.service.resumenRecobro();
  }

  @Get("incapacidades/:id")
  @Roles(...ROLES_TALENTO_HUMANO)
  getIncapacidad(@Param("id", ParseIntPipe) id: number) {
    return this.service.getIncapacidad(id);
  }

  @Post("incapacidades")
  @Roles(...ROLES_TALENTO_HUMANO)
  createIncapacidad(@Body() body: Record<string, any>) {
    return this.service.createIncapacidad(body);
  }

  @Patch("incapacidades/:id")
  @Roles(...ROLES_TALENTO_HUMANO)
  updateIncapacidad(@Param("id", ParseIntPipe) id: number, @Body() body: Record<string, any>) {
    return this.service.updateIncapacidad(id, body);
  }

  @Delete("incapacidades/:id")
  @Roles(...ROLES_TALENTO_HUMANO)
  deleteIncapacidad(@Param("id", ParseIntPipe) id: number) {
    return this.service.deleteIncapacidad(id);
  }

  // ── Ausentismos ──

  @Get("ausentismos")
  @Roles(...ROLES_TALENTO_HUMANO)
  @ApiOperation({ summary: "Permisos concedidos, del más reciente al más viejo" })
  listAusentismos(
    @Query("motivo") motivo?: string,
    @Query("area") area?: string,
    @Query("desde") desde?: string,
    @Query("buscar") buscar?: string,
    @Query("limite") limite?: string,
  ) {
    return this.service.listAusentismos(
      { motivo, area, desde, buscar },
      limite ? Number(limite) : undefined,
    );
  }

  @Get("ausentismos/resumen")
  @Roles(...ROLES_TALENTO_HUMANO)
  @ApiOperation({ summary: "Horas de ausencia por motivo" })
  resumenAusentismos(@Query("desde") desde?: string) {
    return this.service.resumenAusentismos(desde);
  }

  @Get("ausentismos/:id")
  @Roles(...ROLES_TALENTO_HUMANO)
  getAusentismo(@Param("id", ParseIntPipe) id: number) {
    return this.service.getAusentismo(id);
  }

  @Post("ausentismos")
  @Roles(...ROLES_TALENTO_HUMANO)
  createAusentismo(@Body() body: Record<string, any>) {
    return this.service.createAusentismo(body);
  }

  @Patch("ausentismos/:id")
  @Roles(...ROLES_TALENTO_HUMANO)
  updateAusentismo(@Param("id", ParseIntPipe) id: number, @Body() body: Record<string, any>) {
    return this.service.updateAusentismo(id, body);
  }

  @Delete("ausentismos/:id")
  @Roles(...ROLES_TALENTO_HUMANO)
  deleteAusentismo(@Param("id", ParseIntPipe) id: number) {
    return this.service.deleteAusentismo(id);
  }

  // ── Préstamos ──

  @Get("prestamos")
  @Roles(...ROLES_TALENTO_HUMANO)
  @ApiOperation({ summary: "Cartera de préstamos; los que aún deben van primero" })
  listPrestamos(
    @Query("proyecto") proyecto?: string,
    @Query("conSaldo") conSaldo?: string,
    @Query("buscar") buscar?: string,
  ) {
    return this.service.listPrestamos({
      proyecto,
      conSaldo: conSaldo === undefined ? undefined : conSaldo === "true",
      buscar,
    });
  }

  @Get("prestamos/resumen")
  @Roles(...ROLES_TALENTO_HUMANO)
  @ApiOperation({ summary: "Prestado, cancelado y saldo pendiente" })
  resumenPrestamos() {
    return this.service.resumenPrestamos();
  }

  @Get("prestamos/:id")
  @Roles(...ROLES_TALENTO_HUMANO)
  @ApiOperation({ summary: "El préstamo con su historia de descuentos" })
  getPrestamo(@Param("id", ParseIntPipe) id: number) {
    return this.service.getPrestamo(id);
  }

  @Post("prestamos")
  @Roles(...ROLES_TALENTO_HUMANO)
  createPrestamo(@Body() body: Record<string, any>) {
    return this.service.createPrestamo(body);
  }

  @Post("prestamos/:id/pagos")
  @Roles(...ROLES_TALENTO_HUMANO)
  @ApiOperation({ summary: "Registra el descuento de un mes" })
  registrarPago(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { anio: number; mes: number; valor: number },
  ) {
    return this.service.registrarPago(id, body);
  }

  @Patch("prestamos/:id")
  @Roles(...ROLES_TALENTO_HUMANO)
  updatePrestamo(@Param("id", ParseIntPipe) id: number, @Body() body: Record<string, any>) {
    return this.service.updatePrestamo(id, body);
  }

  @Delete("prestamos/:id")
  @Roles(...ROLES_TALENTO_HUMANO)
  @ApiOperation({ summary: "Borra el préstamo y sus cuotas" })
  deletePrestamo(@Param("id", ParseIntPipe) id: number) {
    return this.service.deletePrestamo(id);
  }
}
