import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { RecursoEconomicoService } from "./recurso-economico.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { ROLES_PMO } from "../../common/constants/roles.constants";
import { SaveRecursoEconomicoDto } from "./dto/save-recurso-economico.dto";

/**
 * Recurso Económico: interventoría por año y retenciones por proyecto.
 *
 * El módulo es exclusivo del PMO —Analista y Director, que tienen el mismo
 * alcance—, así que se cierra por rol y no por permiso: no hay un permiso
 * `recurso:*` en la tabla y crear uno obligaría a tocar roles_permisos en
 * producción para no ganar nada.
 */
@ApiTags("Recurso Económico")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller("recurso-economico")
export class RecursoEconomicoController {
  constructor(private readonly service: RecursoEconomicoService) {}

  @Get()
  @Roles(...ROLES_PMO)
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
