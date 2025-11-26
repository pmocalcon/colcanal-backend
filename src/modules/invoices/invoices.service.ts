import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../../database/entities/invoice.entity';
import { PurchaseOrder } from '../../database/entities/purchase-order.entity';
import { Requisition } from '../../database/entities/requisition.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { SendToAccountingDto } from './dto/send-to-accounting.dto';
import { ReceivedByAccountingDto } from './dto/received-by-accounting.dto';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(PurchaseOrder)
    private purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(Requisition)
    private requisitionRepository: Repository<Requisition>,
  ) {}

  /**
   * Obtener todas las facturas de una orden de compra
   */
  async getInvoicesByPurchaseOrder(purchaseOrderId: number) {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { purchaseOrderId },
      relations: [
        'approvalStatus',
        'supplier',
        'requisition',
        'requisition.operationCenter',
        'requisition.operationCenter.company',
        'items',
        'items.requisitionItem',
        'items.requisitionItem.material',
      ],
    });

    if (!purchaseOrder) {
      throw new NotFoundException(
        `Orden de compra con ID ${purchaseOrderId} no encontrada`,
      );
    }

    const invoices = await this.invoiceRepository.find({
      where: { purchaseOrderId },
      relations: ['creator'],
      order: { createdAt: 'DESC' },
    });

    // Transform items to flatten material data
    const transformedItems = purchaseOrder.items?.map(item => ({
      purchaseOrderItemId: item.poItemId,
      materialId: item.requisitionItem?.material?.materialId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      iva: item.ivaAmount,
      total: item.totalAmount,
      material: item.requisitionItem?.material ? {
        materialId: item.requisitionItem.material.materialId,
        codigo: item.requisitionItem.material.code,
        descripcion: item.requisitionItem.material.description,
        unidadMedida: '-',
      } : null,
    }));

    return {
      purchaseOrder: {
        ...purchaseOrder,
        items: transformedItems,
      },
      invoices,
      summary: {
        totalInvoices: invoices.length,
        totalInvoicedAmount: purchaseOrder.totalInvoicedAmount,
        totalInvoicedQuantity: purchaseOrder.totalInvoicedQuantity,
        pendingAmount: Number(purchaseOrder.totalAmount) - Number(purchaseOrder.totalInvoicedAmount),
        invoiceStatus: purchaseOrder.invoiceStatus,
      },
    };
  }

  /**
   * Obtener todas las órdenes de compra disponibles para facturar
   * IMPORTANTE: Solo muestra OCs aprobadas Y con recepción de materiales completa
   */
  async getPurchaseOrdersForInvoicing(
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [purchaseOrders, total] = await this.purchaseOrderRepository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.requisition', 'requisition')
      .leftJoinAndSelect('requisition.status', 'requisitionStatus')
      .leftJoinAndSelect('requisition.operationCenter', 'operationCenter')
      .leftJoinAndSelect('operationCenter.company', 'company')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .leftJoinAndSelect('po.approvalStatus', 'approvalStatus')
      .leftJoinAndSelect('po.invoices', 'invoices')
      .leftJoinAndSelect('po.items', 'items')
      .where('approvalStatus.code = :status', { status: 'aprobada_gerencia' })
      .andWhere('requisitionStatus.code = :requisitionStatus', { requisitionStatus: 'recepcion_completa' })
      .skip(skip)
      .take(limit)
      .orderBy('po.createdAt', 'DESC')
      .getManyAndCount();

    // Agregar información de valores por defecto para cada OC
    const purchaseOrdersWithDefaults = purchaseOrders.map(po => {
      const totalQuantity = po.items?.reduce(
        (sum, item) => sum + Number(item.quantity),
        0,
      ) || 0;

      return {
        ...po,
        defaultInvoiceValues: {
          amount: po.totalAmount,
          materialQuantity: totalQuantity,
        },
      };
    });

    return {
      data: purchaseOrdersWithDefaults,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Crear una nueva factura
   * IMPORTANTE: Solo se puede crear una factura después de que la recepción de materiales esté completa
   */
  async create(userId: number, createInvoiceDto: CreateInvoiceDto) {
    const { purchaseOrderId, invoiceNumber, issueDate } = createInvoiceDto;

    // Verificar que la orden de compra exista y esté aprobada
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { purchaseOrderId },
      relations: ['approvalStatus', 'invoices', 'items', 'requisition', 'requisition.status'],
    });

    if (!purchaseOrder) {
      throw new NotFoundException(
        `Orden de compra con ID ${purchaseOrderId} no encontrada`,
      );
    }

    // Verificar que la orden esté aprobada por gerencia
    if (purchaseOrder.approvalStatus.code !== 'aprobada_gerencia') {
      throw new BadRequestException(
        'Solo se pueden registrar facturas para órdenes de compra aprobadas por gerencia',
      );
    }

    // NUEVA VALIDACIÓN: Verificar que la recepción de materiales esté completa
    if (purchaseOrder.requisition?.status?.code !== 'recepcion_completa') {
      throw new BadRequestException(
        'Solo se pueden registrar facturas después de que la recepción de materiales esté completa. ' +
        `Estado actual de la requisición: ${purchaseOrder.requisition?.status?.name || 'desconocido'}`,
      );
    }

    // Verificar que el número de factura no exista
    const existingInvoice = await this.invoiceRepository.findOne({
      where: { invoiceNumber },
    });

    if (existingInvoice) {
      throw new BadRequestException(
        `Ya existe una factura con el número ${invoiceNumber}`,
      );
    }

    // Verificar que no exceda el máximo de 3 facturas
    const invoiceCount = purchaseOrder.invoices?.length || 0;
    if (invoiceCount >= 3) {
      throw new BadRequestException(
        'Una orden de compra no puede tener más de 3 facturas',
      );
    }

    // Calcular cantidad total de la OC (suma de cantidades de los items)
    const totalQuantityFromPO = purchaseOrder.items?.reduce(
      (sum, item) => sum + Number(item.quantity),
      0,
    ) || 0;

    // Usar valores por defecto de la OC si no se especifican
    const finalAmount = createInvoiceDto.amount !== undefined
      ? Number(createInvoiceDto.amount)
      : Number(purchaseOrder.totalAmount);

    const finalMaterialQuantity = createInvoiceDto.materialQuantity !== undefined
      ? Number(createInvoiceDto.materialQuantity)
      : totalQuantityFromPO;

    // Calcular totales actuales
    const currentInvoicedAmount = Number(purchaseOrder.totalInvoicedAmount) || 0;

    // Verificar que no exceda el total de la orden
    const newTotalAmount = currentInvoicedAmount + finalAmount;

    if (newTotalAmount > Number(purchaseOrder.totalAmount)) {
      throw new BadRequestException(
        `El monto total de las facturas ($${newTotalAmount}) excede el total de la orden de compra ($${purchaseOrder.totalAmount})`,
      );
    }

    // Crear la factura con valores por defecto de la OC
    const invoice = this.invoiceRepository.create({
      purchaseOrderId,
      invoiceNumber,
      issueDate: new Date(issueDate),
      amount: finalAmount,
      materialQuantity: finalMaterialQuantity,
      createdBy: userId,
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);

    // Actualizar totales de la orden de compra
    await this.updatePurchaseOrderInvoiceTotals(purchaseOrderId);

    return this.invoiceRepository.findOne({
      where: { invoiceId: savedInvoice.invoiceId },
      relations: ['creator', 'purchaseOrder'],
    });
  }

  /**
   * Actualizar una factura
   */
  async update(invoiceId: number, updateInvoiceDto: UpdateInvoiceDto) {
    const invoice = await this.invoiceRepository.findOne({
      where: { invoiceId },
      relations: ['purchaseOrder', 'purchaseOrder.invoices'],
    });

    if (!invoice) {
      throw new NotFoundException(`Factura con ID ${invoiceId} no encontrada`);
    }

    // Verificar que no se haya enviado a contabilidad
    if (invoice.sentToAccounting) {
      throw new ForbiddenException(
        'No se puede editar una factura que ya fue enviada a contabilidad',
      );
    }

    // Si se está actualizando el número de factura, verificar que no exista
    if (updateInvoiceDto.invoiceNumber && updateInvoiceDto.invoiceNumber !== invoice.invoiceNumber) {
      const existingInvoice = await this.invoiceRepository.findOne({
        where: { invoiceNumber: updateInvoiceDto.invoiceNumber },
      });

      if (existingInvoice) {
        throw new BadRequestException(
          `Ya existe una factura con el número ${updateInvoiceDto.invoiceNumber}`,
        );
      }
    }

    // Si se está actualizando el monto o cantidad, verificar que no exceda el total
    if (updateInvoiceDto.amount !== undefined || updateInvoiceDto.materialQuantity !== undefined) {
      const newAmount = updateInvoiceDto.amount !== undefined ? Number(updateInvoiceDto.amount) : Number(invoice.amount);
      const newQuantity = updateInvoiceDto.materialQuantity !== undefined
        ? Number(updateInvoiceDto.materialQuantity)
        : Number(invoice.materialQuantity);

      // Calcular total sin esta factura
      const otherInvoicesAmount = invoice.purchaseOrder.invoices
        .filter(inv => inv.invoiceId !== invoiceId)
        .reduce((sum, inv) => sum + Number(inv.amount), 0);

      const otherInvoicesQuantity = invoice.purchaseOrder.invoices
        .filter(inv => inv.invoiceId !== invoiceId)
        .reduce((sum, inv) => sum + Number(inv.materialQuantity), 0);

      const totalAmount = otherInvoicesAmount + newAmount;
      const totalQuantity = otherInvoicesQuantity + newQuantity;

      if (totalAmount > Number(invoice.purchaseOrder.totalAmount)) {
        throw new BadRequestException(
          `El monto total de las facturas ($${totalAmount}) excede el total de la orden de compra ($${invoice.purchaseOrder.totalAmount})`,
        );
      }
    }

    // Actualizar la factura
    Object.assign(invoice, updateInvoiceDto);

    if (updateInvoiceDto.issueDate) {
      invoice.issueDate = new Date(updateInvoiceDto.issueDate);
    }

    const updatedInvoice = await this.invoiceRepository.save(invoice);

    // Recalcular totales de la orden de compra
    await this.updatePurchaseOrderInvoiceTotals(invoice.purchaseOrderId);

    return this.invoiceRepository.findOne({
      where: { invoiceId: updatedInvoice.invoiceId },
      relations: ['creator', 'purchaseOrder'],
    });
  }

  /**
   * Eliminar una factura
   */
  async remove(invoiceId: number) {
    const invoice = await this.invoiceRepository.findOne({
      where: { invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Factura con ID ${invoiceId} no encontrada`);
    }

    // Verificar que no se haya enviado a contabilidad
    if (invoice.sentToAccounting) {
      throw new ForbiddenException(
        'No se puede eliminar una factura que ya fue enviada a contabilidad',
      );
    }

    const purchaseOrderId = invoice.purchaseOrderId;
    await this.invoiceRepository.remove(invoice);

    // Recalcular totales de la orden de compra
    await this.updatePurchaseOrderInvoiceTotals(purchaseOrderId);

    return { message: 'Factura eliminada exitosamente' };
  }

  /**
   * Enviar facturas a contabilidad
   */
  async sendToAccounting(
    purchaseOrderId: number,
    sendToAccountingDto: SendToAccountingDto,
  ) {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { purchaseOrderId },
      relations: ['invoices'],
    });

    if (!purchaseOrder) {
      throw new NotFoundException(
        `Orden de compra con ID ${purchaseOrderId} no encontrada`,
      );
    }

    // Verificar que tenga facturas
    if (!purchaseOrder.invoices || purchaseOrder.invoices.length === 0) {
      throw new BadRequestException(
        'La orden de compra no tiene facturas registradas',
      );
    }

    // Verificar que las facturas completen el total de la orden
    if (purchaseOrder.invoiceStatus !== 'factura_completa') {
      throw new BadRequestException(
        'La suma de las facturas debe ser igual al total de la orden de compra para enviar a contabilidad',
      );
    }

    // Marcar todas las facturas como enviadas a contabilidad
    const sentDate = new Date(sendToAccountingDto.sentToAccountingDate);

    for (const invoice of purchaseOrder.invoices) {
      invoice.sentToAccounting = true;
      invoice.sentToAccountingDate = sentDate;
      await this.invoiceRepository.save(invoice);
    }

    // Actualizar estado de la orden de compra
    purchaseOrder.invoiceStatus = 'enviada_contabilidad';
    await this.purchaseOrderRepository.save(purchaseOrder);

    return {
      message: 'Facturas enviadas a contabilidad exitosamente',
      sentDate: sentDate.toISOString().split('T')[0],
      invoicesCount: purchaseOrder.invoices.length,
    };
  }

  /**
   * Actualizar totales facturados de una orden de compra
   */
  private async updatePurchaseOrderInvoiceTotals(purchaseOrderId: number) {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { purchaseOrderId },
      relations: ['invoices', 'items'],
    });

    if (!purchaseOrder) {
      return;
    }

    // Calcular totales facturados
    const totalInvoicedAmount = purchaseOrder.invoices?.reduce(
      (sum, invoice) => sum + Number(invoice.amount),
      0,
    ) || 0;

    const totalInvoicedQuantity = purchaseOrder.invoices?.reduce(
      (sum, invoice) => sum + Number(invoice.materialQuantity),
      0,
    ) || 0;

    // Calcular cantidad total esperada de la orden de compra
    const totalExpectedQuantity = purchaseOrder.items?.reduce(
      (sum, item) => sum + Number(item.quantity),
      0,
    ) || 0;

    // Determinar estado de facturación
    let invoiceStatus = 'sin_factura';

    if (totalInvoicedAmount > 0 || totalInvoicedQuantity > 0) {
      // Permitir pequeña tolerancia (1%) para errores de redondeo
      const amountComplete = totalInvoicedAmount >= Number(purchaseOrder.totalAmount) * 0.99;
      const quantityComplete = totalExpectedQuantity > 0
        ? totalInvoicedQuantity >= totalExpectedQuantity * 0.99
        : true; // Si no hay cantidad esperada, solo validar monto

      if (amountComplete && quantityComplete) {
        invoiceStatus = 'factura_completa';
      } else {
        invoiceStatus = 'facturacion_parcial';
      }
    }

    // Actualizar la orden de compra
    purchaseOrder.totalInvoicedAmount = totalInvoicedAmount;
    purchaseOrder.totalInvoicedQuantity = totalInvoicedQuantity;
    purchaseOrder.invoiceStatus = invoiceStatus;

    await this.purchaseOrderRepository.save(purchaseOrder);
  }

  /**
   * Obtener órdenes de compra con facturas enviadas a contabilidad pero pendientes de recibir
   */
  async getInvoicesPendingAccountingReception(
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [purchaseOrders, total] = await this.purchaseOrderRepository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.requisition', 'requisition')
      .leftJoinAndSelect('requisition.operationCenter', 'operationCenter')
      .leftJoinAndSelect('operationCenter.company', 'company')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .leftJoinAndSelect('po.approvalStatus', 'approvalStatus')
      .leftJoinAndSelect('po.invoices', 'invoices')
      .leftJoinAndSelect('invoices.creator', 'invoiceCreator')
      .where('po.invoiceStatus = :status', { status: 'enviada_contabilidad' })
      .skip(skip)
      .take(limit)
      .orderBy('po.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data: purchaseOrders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtener órdenes de compra con facturas ya recibidas por contabilidad
   */
  async getInvoicesReceivedByAccounting(
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [purchaseOrders, total] = await this.purchaseOrderRepository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.requisition', 'requisition')
      .leftJoinAndSelect('requisition.operationCenter', 'operationCenter')
      .leftJoinAndSelect('operationCenter.company', 'company')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .leftJoinAndSelect('po.approvalStatus', 'approvalStatus')
      .leftJoinAndSelect('po.invoices', 'invoices')
      .leftJoinAndSelect('invoices.creator', 'invoiceCreator')
      .leftJoinAndSelect('invoices.receivedByAccountingUser', 'receivedByUser')
      .where('po.invoiceStatus = :status', { status: 'recibida_contabilidad' })
      .skip(skip)
      .take(limit)
      .orderBy('po.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data: purchaseOrders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Marcar facturas como recibidas por contabilidad
   * Este es el paso final del proceso de facturación
   */
  async markAsReceivedByAccounting(
    purchaseOrderId: number,
    userId: number,
    receivedByAccountingDto: ReceivedByAccountingDto,
  ) {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { purchaseOrderId },
      relations: ['invoices'],
    });

    if (!purchaseOrder) {
      throw new NotFoundException(
        `Orden de compra con ID ${purchaseOrderId} no encontrada`,
      );
    }

    // Verificar que las facturas hayan sido enviadas a contabilidad
    if (purchaseOrder.invoiceStatus !== 'enviada_contabilidad') {
      throw new BadRequestException(
        'Solo se pueden marcar como recibidas las facturas que ya fueron enviadas a contabilidad. ' +
        `Estado actual: ${purchaseOrder.invoiceStatus}`,
      );
    }

    // Verificar que tenga facturas
    if (!purchaseOrder.invoices || purchaseOrder.invoices.length === 0) {
      throw new BadRequestException(
        'La orden de compra no tiene facturas registradas',
      );
    }

    // Marcar todas las facturas como recibidas por contabilidad
    const receivedDate = new Date(receivedByAccountingDto.receivedDate);

    for (const invoice of purchaseOrder.invoices) {
      invoice.receivedByAccounting = true;
      invoice.receivedByAccountingDate = receivedDate;
      invoice.receivedByAccountingUserId = userId;
      await this.invoiceRepository.save(invoice);
    }

    // Actualizar estado de la orden de compra al estado final
    purchaseOrder.invoiceStatus = 'recibida_contabilidad';
    await this.purchaseOrderRepository.save(purchaseOrder);

    return {
      message: 'Facturas marcadas como recibidas por contabilidad exitosamente',
      receivedDate: receivedDate.toISOString().split('T')[0],
      invoicesCount: purchaseOrder.invoices.length,
      receivedBy: userId,
    };
  }
}
