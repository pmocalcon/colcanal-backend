import { Body, Controller, Delete, Get, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { RecursoEconomicoService } from "./recurso-economico.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { ROLES_PMO, ROLES_FACTURA } from "../../common/constants/roles.constants";
import { SaveRecursoEconomicoDto } from "./dto/save-recurso-economico.dto";
import { ValidarFacturaDto } from "./dto/validar-factura.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

/**
 * Recurso Económico: interventoría por año y retenciones por proyecto.
 *
 * El módulo es del PMO —Analista y Director, que tienen el mismo alcance—, así que se
 * cierra por rol y no por permiso: no hay un permiso `recurso:*` en la tabla y crear uno
 * obligaría a tocar roles_permisos en producción para no ganar nada.
 *
 * A los **directores de proyecto** se les abre únicamente lo de la factura: leer el
 * módulo —sin verlo, necesitan las cifras contra las que comparan— y estampar el visto
 * bueno de un municipio y un mes por su propio endpoint. Guardar el bloque completo es
 * solo del PMO.
 *
 * Antes compartían el `PUT`, porque el módulo guarda un jsonb único y no había dónde
 * escribir solo una parte. Eso dejaba que un director, con la pantalla desactualizada,
 * sobrescribiera la interventoría y las retenciones sin querer. `validarFactura` toca un
 * único campo y el nombre del revisor lo pone el servidor.
 */
@ApiTags("Recurso Económico")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller("recurso-economico")
export class RecursoEconomicoController {
  constructor(private readonly service: RecursoEconomicoService) {}

  @Get()
  @Roles(...ROLES_FACTURA)
  @ApiOperation({ summary: "Interventoría y retenciones, con la lista de proyectos" })
  get() {
    return this.service.get();
  }

  @Put()
  @Roles(...ROLES_PMO)
  @ApiOperation({ summary: "Guardar interventoría y retenciones" })
  save(@Body() dto: SaveRecursoEconomicoDto) {
    return this.service.save(dto.data);
  }

  /**
   * El visto bueno del director sobre una factura.
   *
   * El PMO también entra: es quien tiene que poder desatascar un mes si el director está
   * incapacitado o de vacaciones. Que pueda no quiere decir que deba —queda su nombre en
   * la constancia, no el del director—.
   */
  @Post("factura/visto")
  @Roles(...ROLES_FACTURA)
  @ApiOperation({ summary: "Dar el visto bueno a una factura, sin tocar nada más" })
  validarFactura(@Body() dto: ValidarFacturaDto, @CurrentUser() user: any) {
    return this.service.validarFactura(dto.periodo, dto.companyId, dto.valor, {
      nombre: user?.nombre || user?.email || "—",
      rol: user?.role?.nombreRol,
    });
  }

  @Delete("factura/visto")
  @Roles(...ROLES_FACTURA)
  @ApiOperation({ summary: "Quitar el visto bueno de una factura" })
  quitarVistoFactura(
    @Query("periodo") periodo: string,
    @Query("companyId") companyId: string,
  ) {
    return this.service.quitarVistoFactura(periodo, Number(companyId));
  }

  /**
   * Solo el valor de interventoría, para el Flujo de Caja.
   *
   * El módulo es del PMO, pero esta cifra la consume el FCM y ahí entra todo el
   * que puede ver la liquidación: si dependiera del rol, dos personas verían
   * flujos distintos del mismo municipio. Por eso va por permiso y en solo
   * lectura, sin exponer retenciones ni SMLV.
   */
  @Get("interventoria")
  @Permissions("creg:liquidacion")
  @ApiOperation({ summary: "Valor mensual de interventoría por año y proyecto" })
  interventoria() {
    return this.service.interventoria();
  }
}
