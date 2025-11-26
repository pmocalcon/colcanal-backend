import { IsNotEmpty, IsString, IsNumber, IsDateString, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'ID de la orden de compra',
    example: 1,
  })
  @IsNotEmpty({ message: 'El ID de la orden de compra es requerido' })
  @IsNumber({}, { message: 'El ID de la orden de compra debe ser un número' })
  purchaseOrderId: number;

  @ApiProperty({
    description: 'Número de factura del proveedor',
    example: 'FV-001-2024',
  })
  @IsNotEmpty({ message: 'El número de factura es requerido' })
  @IsString({ message: 'El número de factura debe ser un texto' })
  invoiceNumber: string;

  @ApiProperty({
    description: 'Fecha de emisión de la factura',
    example: '2024-01-15',
  })
  @IsNotEmpty({ message: 'La fecha de emisión es requerida' })
  @IsDateString({}, { message: 'La fecha de emisión debe ser una fecha válida' })
  issueDate: string;

  @ApiPropertyOptional({
    description: 'Monto de la factura. Si no se especifica, se usa el total de la orden de compra',
    example: 5000000.00,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Type(() => Number)
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  amount?: number;

  @ApiPropertyOptional({
    description: 'Cantidad de material. Si no se especifica, se usa la cantidad total de la orden de compra',
    example: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: 'La cantidad de material debe ser un número' })
  @Type(() => Number)
  @Min(0.01, { message: 'La cantidad debe ser mayor a 0' })
  materialQuantity?: number;
}
