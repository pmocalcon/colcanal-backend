import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CepService } from "./cep.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ROLES_PMO, ROLES_FACTURA } from "../../common/constants/roles.constants";
import { CONCEPTOS_ORDEN, PAGADORES, TIPOS_ORDEN } from "./cep-conceptos";
import { GuardarArranqueCepDto, GuardarCepMesDto, GuardarOrdenPagoDto } from "./dto/cep.dto";

/**
 * Control de Excedentes e Informe Financiero.
 *
 * **Escribir es del PMO; leer llega hasta los directores de proyecto.** Es la misma
 * división que ya tienen Factura y Contraste, y por la misma razón: el informe es lo que
 * el director le presenta a su municipio, así que tiene que poder abrirlo sin depender de
 * que alguien se lo exporte, pero la conciliación del extracto la hace una sola persona.
 *
 * Va por rol y no por permiso, como el resto del módulo: no existe un permiso `cep:*` en
 * la tabla y crearlo obligaría a tocar roles_permisos en producción para no ganar nada.
 */
@ApiTags("Recurso Económico · CEP")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller("recurso-economico/cep")
export class CepController {
  constructor(private readonly service: CepService) {}

  /** Las listas del formato: quién paga y por qué conceptos gira la fiducia. */
  @Get("catalogo")
  @Roles(...ROLES_FACTURA)
  @ApiOperation({ summary: "Pagadores, conceptos y tipos de orden" })
  catalogo() {
    return { pagadores: PAGADORES, conceptos: CONCEPTOS_ORDEN, tipos: TIPOS_ORDEN };
  }

  @Get(":companyId/anios")
  @Roles(...ROLES_FACTURA)
  @ApiOperation({ summary: "Los años con CEP cargado" })
  anios(@Param("companyId", ParseIntPipe) companyId: number) {
    return this.service.aniosDe(companyId);
  }

  @Get(":companyId")
  @Roles(...ROLES_FACTURA)
  @ApiOperation({ summary: "El CEP de un año, ya calculado" })
  cep(@Param("companyId", ParseIntPipe) companyId: number, @Query("anio") anio: string) {
    return this.service.cepDe(companyId, anio || String(new Date().getFullYear()));
  }

  @Get(":companyId/informe")
  @Roles(...ROLES_FACTURA)
  @ApiOperation({ summary: "El Informe Financiero (GC-001-F) de un año" })
  informe(@Param("companyId", ParseIntPipe) companyId: number, @Query("anio") anio: string) {
    return this.service.informeDe(companyId, anio || String(new Date().getFullYear()));
  }

  @Put("mes")
  @Roles(...ROLES_PMO)
  @ApiOperation({ summary: "Guardar lo digitado de un mes" })
  guardarMes(@Body() dto: GuardarCepMesDto, @CurrentUser() user: any) {
    return this.service.guardarMes(
      dto.companyId,
      dto.periodo,
      dto.capturado as any,
      dto.nota?.trim() || null,
      user?.userId,
    );
  }

  @Put("arranque")
  @Roles(...ROLES_PMO)
  @ApiOperation({ summary: "Fijar el mes y los saldos con los que arranca un municipio" })
  guardarArranque(@Body() dto: GuardarArranqueCepDto) {
    const { companyId, desde, ...saldos } = dto;
    return this.service.guardarArranque(companyId, desde, saldos);
  }

  // ── Órdenes de pago ────────────────────────────────────────────────────────

  @Get(":companyId/ordenes")
  @Roles(...ROLES_FACTURA)
  @ApiOperation({ summary: "Las órdenes de pago de un año o de un mes" })
  ordenes(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Query("anio") anio?: string,
    @Query("periodo") periodo?: string,
  ) {
    return this.service.ordenesDe(companyId, { anio, periodo });
  }

  @Post("ordenes")
  @Roles(...ROLES_PMO)
  @ApiOperation({ summary: "Registrar una orden de pago" })
  crearOrden(@Body() dto: GuardarOrdenPagoDto, @CurrentUser() user: any) {
    return this.service.crearOrden(dto as any, user?.userId);
  }

  @Put("ordenes/:ordenId")
  @Roles(...ROLES_PMO)
  @ApiOperation({ summary: "Corregir una orden de pago" })
  actualizarOrden(
    @Param("ordenId", ParseIntPipe) ordenId: number,
    @Body() dto: GuardarOrdenPagoDto,
  ) {
    return this.service.actualizarOrden(ordenId, dto as any);
  }

  @Delete("ordenes/:ordenId")
  @Roles(...ROLES_PMO)
  @ApiOperation({ summary: "Borrar una orden de pago" })
  borrarOrden(@Param("ordenId", ParseIntPipe) ordenId: number) {
    return this.service.borrarOrden(ordenId);
  }
}
