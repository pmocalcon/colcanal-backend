import { Body, Controller, Delete, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ValidacionNominaService } from "./validacion-nomina.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ROLES_TALENTO_HUMANO, ROLES_ENVIAR_NOMINA } from "./talento-humano.roles";

/**
 * Validación de la nómina: buscar a una persona, darle el visto bueno y mandar el mes a
 * Financiera.
 *
 * Revisar lo puede hacer cualquiera de Talento Humano; **mandarla no**. Ese último paso
 * queda en una lista más corta porque es el que dispara el pago: ver la nómina y
 * autorizarla no son la misma responsabilidad.
 */
@ApiTags("Validación de nómina")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("nomina/validacion")
export class ValidacionNominaController {
  constructor(private readonly service: ValidacionNominaService) {}

  @Get("estado")
  @Roles(...ROLES_TALENTO_HUMANO)
  @ApiOperation({ summary: "Cómo va el periodo: cuántas revisadas, qué falta y si ya se mandó" })
  estado(@Query("periodo") periodo: string) {
    return this.service.estado(periodo);
  }

  @Get("persona")
  @Roles(...ROLES_TALENTO_HUMANO)
  @ApiOperation({
    summary: "Busca una cédula en la nómina del periodo; devuelve una entrada por contrato",
  })
  buscar(@Query("periodo") periodo: string, @Query("identificacion") identificacion: string) {
    return this.service.buscar(periodo, identificacion);
  }

  @Post()
  @Roles(...ROLES_TALENTO_HUMANO)
  @ApiOperation({
    summary: "Da el visto bueno; falla si el neto digitado no coincide o si la ficha está incompleta",
  })
  validar(
    @Body()
    body: { periodo: string; personaId: number; netoDigitado: number; observaciones?: string | null },
    @CurrentUser("userId") userId: number,
  ) {
    return this.service.validar(
      body.periodo,
      body.personaId,
      Number(body.netoDigitado),
      body.observaciones ?? null,
      userId,
    );
  }

  @Delete()
  @Roles(...ROLES_TALENTO_HUMANO)
  @ApiOperation({ summary: "Quita el visto bueno de una persona para poder revisarla de nuevo" })
  quitar(@Query("periodo") periodo: string, @Query("personaId") personaId: string) {
    return this.service.quitarValidacion(periodo, Number(personaId));
  }

  @Post("enviar")
  @Roles(...ROLES_ENVIAR_NOMINA)
  @ApiOperation({ summary: "Manda la liquidación del periodo a la Coordinación Financiera" })
  enviar(@Body() body: { periodo: string }, @CurrentUser("userId") userId: number) {
    return this.service.enviar(body.periodo, userId);
  }

  @Delete("enviar")
  @Roles(...ROLES_ENVIAR_NOMINA)
  @ApiOperation({ summary: "Anula el envío para poder volver a revisar y mandar" })
  anular(@Query("periodo") periodo: string) {
    return this.service.anularEnvio(periodo);
  }
}
