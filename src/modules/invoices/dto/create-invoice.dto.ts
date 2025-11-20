import { IsNotEmpty, IsString, IsNumber, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceDto {
  @IsNotEmpty({ message: 'El ID de la orden de compra es requerido' })
  @IsNumber({}, { message: 'El ID de la orden de compra debe ser un número' })
  purchaseOrderId: number;

  @IsNotEmpty({ message: 'El número de factura es requerido' })
  @IsString({ message: 'El número de factura debe ser un texto' })
  invoiceNumber: string;

  @IsNotEmpty({ message: 'La fecha de emisión es requerida' })
  @IsDateString({}, { message: 'La fecha de emisión debe ser una fecha válida' })
  issueDate: string;

  @IsNotEmpty({ message: 'El monto es requerido' })
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Type(() => Number)
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  amount: number;

  @IsNotEmpty({ message: 'La cantidad de material es requerida' })
  @IsNumber({}, { message: 'La cantidad de material debe ser un número' })
  @Type(() => Number)
  @Min(0.01, { message: 'La cantidad debe ser mayor a 0' })
  materialQuantity: number;
}
