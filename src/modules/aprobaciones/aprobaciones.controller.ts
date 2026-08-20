import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AprobacionesService } from './aprobaciones.service';

@ApiTags('Aprobaciones')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('aprobaciones')
export class AprobacionesController {
  constructor(private readonly aprobacionesService: AprobacionesService) {}

  /**
   * No lleva `@Permissions` a propósito: no hay un permiso que describa «firmar lo
   * de toda la empresa». La restricción es de rol y la aplica el servicio.
   */
  @Get('pendientes')
  @ApiOperation({
    summary: 'Todo lo que espera la firma de Gerencia, agrupado por origen',
    description:
      'Solo lectura. Reúne requisiciones, órdenes de compra, presupuestos, compras ' +
      'anticipadas, contratos y anticipos. Las acciones se ejecutan contra los ' +
      'endpoints de cada módulo, que son los que validan quién puede y desde qué estado.',
  })
  async getPendientes(@CurrentUser('userId') userId: number) {
    return this.aprobacionesService.getPendientes(userId);
  }
}
