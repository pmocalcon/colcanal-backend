import { Body, Controller, Delete, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { NominaService } from "./nomina.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ROLES_TALENTO_HUMANO } from "./talento-humano.roles";

/**
 * Nómina: novedades del mes y liquidación. Mismo cierre por rol que el resto de
 * Talento Humano — ver `talento-humano.controller.ts`.
 */
@ApiTags("Nómina")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("nomina")
export class NominaController {
  constructor(private readonly service: NominaService) {}

  @Get("periodos")
  @Roles(...ROLES_TALENTO_HUMANO)
  @ApiOperation({ summary: "Periodos con novedades o liquidación guardadas" })
  listPeriodos() {
    return this.service.listPeriodos();
  }

  @Get("novedades")
  @Roles(...ROLES_TALENTO_HUMANO)
  @ApiOperation({ summary: "Personal activo del periodo, con su novedad si ya la diligenciaron" })
  listNovedades(@Query("periodo") periodo: string) {
    return this.service.listNovedades(periodo);
  }

  @Post("novedades")
  @Roles(...ROLES_TALENTO_HUMANO)
  @ApiOperation({ summary: "Guarda (upsert) la novedad de un empleado en el periodo" })
  guardarNovedad(
    @Body()
    body: {
      periodo: string;
      personaId: number;
      identificacion: string;
      nombre: string;
      diasTrabajados?: number;
      horasExtrasValor?: string | number | null;
      recargoNocturnoValor?: string | number | null;
      bonificaciones?: string | number | null;
      embargo?: string | number | null;
      incapacidadEmpresa?: string | number | null;
      incapacidadEmpleado?: string | number | null;
      incapacidadOtros?: string | number | null;
      vacacionesHabiles?: string | number | null;
      vacacionesNoHabiles?: string | number | null;
      retencionFuente?: string | number | null;
      serviciosGruporecordar?: string | number | null;
      observaciones?: string | null;
    },
  ) {
    const { periodo, personaId, identificacion, nombre, ...campos } = body;
    return this.service.guardarNovedad(periodo, personaId, identificacion, nombre, campos);
  }

  @Get("liquidacion")
  @Roles(...ROLES_TALENTO_HUMANO)
  @ApiOperation({
    summary: "La nómina del periodo: guardada si ya se generó, o vista previa si se mandan smmlv/auxTransporte",
  })
  getNomina(
    @Query("periodo") periodo: string,
    @Query("smmlv") smmlv?: string,
    @Query("auxTransporte") auxTransporte?: string,
  ) {
    return this.service.getNomina(
      periodo,
      smmlv ? Number(smmlv) : undefined,
      auxTransporte ? Number(auxTransporte) : undefined,
    );
  }

  @Get("liquidacion/resumen")
  @Roles(...ROLES_TALENTO_HUMANO)
  @ApiOperation({ summary: "Totales del periodo: devengado, deducido y neto" })
  resumenNomina(
    @Query("periodo") periodo: string,
    @Query("smmlv") smmlv?: string,
    @Query("auxTransporte") auxTransporte?: string,
  ) {
    return this.service.resumenNomina(
      periodo,
      smmlv ? Number(smmlv) : undefined,
      auxTransporte ? Number(auxTransporte) : undefined,
    );
  }

  @Post("liquidacion/generar")
  @Roles(...ROLES_TALENTO_HUMANO)
  @ApiOperation({ summary: "Genera y guarda la liquidación del periodo (una sola vez)" })
  generarNomina(
    @Body() body: { periodo: string; smmlv: number; auxTransporte: number },
    @CurrentUser("userId") userId: number,
  ) {
    return this.service.generarNomina(body.periodo, body.smmlv, body.auxTransporte, userId);
  }

  @Delete("liquidacion")
  @Roles(...ROLES_TALENTO_HUMANO)
  @ApiOperation({ summary: "Reabre el periodo: borra la liquidación guardada para poder generarla de nuevo" })
  reabrirNomina(@Query("periodo") periodo: string) {
    return this.service.reabrirNomina(periodo);
  }
}
