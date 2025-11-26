import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { SendToAccountingDto } from './dto/send-to-accounting.dto';
import { ReceivedByAccountingDto } from './dto/received-by-accounting.dto';
import { User } from '../../database/entities/user.entity';

@ApiTags('Invoices - Facturas')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get('purchase-orders/for-invoicing')
  @ApiOperation({
    summary: 'Listar órdenes de compra para facturar',
    description: 'Obtiene un listado de órdenes de compra aprobadas que pueden ser facturadas',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista obtenida exitosamente' })
  async getPurchaseOrdersForInvoicing(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    return this.invoicesService.getPurchaseOrdersForInvoicing(page, limit);
  }

  @Get('by-purchase-order/:purchaseOrderId')
  @ApiOperation({
    summary: 'Obtener facturas de una orden de compra',
    description: 'Obtiene todas las facturas asociadas a una orden de compra',
  })
  @ApiParam({ name: 'purchaseOrderId', type: Number })
  @ApiResponse({ status: 200, description: 'Facturas obtenidas exitosamente' })
  @ApiResponse({ status: 404, description: 'Orden de compra no encontrada' })
  async getInvoicesByPurchaseOrder(
    @Param('purchaseOrderId', ParseIntPipe) purchaseOrderId: number,
  ) {
    return this.invoicesService.getInvoicesByPurchaseOrder(purchaseOrderId);
  }

  @Post()
  @ApiOperation({
    summary: 'Crear una factura',
    description: 'Registra una nueva factura para una orden de compra. Máximo 3 facturas por orden.',
  })
  @ApiResponse({ status: 201, description: 'Factura creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o límite de facturas excedido' })
  @ApiResponse({ status: 404, description: 'Orden de compra no encontrada' })
  async create(
    @GetUser() user: User,
    @Body() createInvoiceDto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(user.userId, createInvoiceDto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar una factura',
    description: 'Actualiza los datos de una factura. No se puede editar si ya fue enviada a contabilidad.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Factura actualizada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'Factura ya enviada a contabilidad' })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(id, updateInvoiceDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar una factura',
    description: 'Elimina una factura. No se puede eliminar si ya fue enviada a contabilidad.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Factura eliminada exitosamente' })
  @ApiResponse({ status: 403, description: 'Factura ya enviada a contabilidad' })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.remove(id);
  }

  @Post('send-to-accounting/:purchaseOrderId')
  @ApiOperation({
    summary: 'Enviar facturas a contabilidad',
    description: 'Marca todas las facturas de una orden como enviadas a contabilidad. Solo si la suma de facturas = total de OC.',
  })
  @ApiParam({ name: 'purchaseOrderId', type: Number })
  @ApiResponse({ status: 200, description: 'Facturas enviadas exitosamente' })
  @ApiResponse({ status: 400, description: 'Las facturas no completan el total de la orden' })
  @ApiResponse({ status: 404, description: 'Orden de compra no encontrada' })
  async sendToAccounting(
    @Param('purchaseOrderId', ParseIntPipe) purchaseOrderId: number,
    @Body() sendToAccountingDto: SendToAccountingDto,
  ) {
    return this.invoicesService.sendToAccounting(purchaseOrderId, sendToAccountingDto);
  }

  // ============================================
  // ENDPOINTS PARA CONTABILIDAD
  // ============================================

  @Get('accounting/pending')
  @ApiOperation({
    summary: 'Listar facturas pendientes de recibir por contabilidad',
    description: 'Obtiene las órdenes de compra con facturas enviadas a contabilidad pero aún no marcadas como recibidas',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista obtenida exitosamente' })
  async getInvoicesPendingAccountingReception(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    return this.invoicesService.getInvoicesPendingAccountingReception(page, limit);
  }

  @Get('accounting/received')
  @ApiOperation({
    summary: 'Listar facturas ya recibidas por contabilidad',
    description: 'Obtiene las órdenes de compra con facturas que ya fueron marcadas como recibidas por contabilidad',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista obtenida exitosamente' })
  async getInvoicesReceivedByAccounting(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    return this.invoicesService.getInvoicesReceivedByAccounting(page, limit);
  }

  @Post('accounting/mark-received/:purchaseOrderId')
  @ApiOperation({
    summary: 'Marcar facturas como recibidas por contabilidad',
    description: 'Marca todas las facturas de una orden como recibidas por contabilidad. Este es el paso final del proceso de facturación.',
  })
  @ApiParam({ name: 'purchaseOrderId', type: Number })
  @ApiResponse({ status: 200, description: 'Facturas marcadas como recibidas exitosamente' })
  @ApiResponse({ status: 400, description: 'Las facturas no han sido enviadas a contabilidad' })
  @ApiResponse({ status: 404, description: 'Orden de compra no encontrada' })
  async markAsReceivedByAccounting(
    @Param('purchaseOrderId', ParseIntPipe) purchaseOrderId: number,
    @GetUser() user: User,
    @Body() receivedByAccountingDto: ReceivedByAccountingDto,
  ) {
    return this.invoicesService.markAsReceivedByAccounting(
      purchaseOrderId,
      user.userId,
      receivedByAccountingDto,
    );
  }
}
