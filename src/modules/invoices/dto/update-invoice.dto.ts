import { IsOptional, IsString, IsNumber, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateInvoiceDto {
  @IsOptional()
  @IsString({ message: 'El número de factura debe ser un texto' })
  invoiceNumber?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de emisión debe ser una fecha válida' })
  issueDate?: string;

  @IsOptional()
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Type(() => Number)
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  amount?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La cantidad de material debe ser un número' })
  @Type(() => Number)
  @Min(0.01, { message: 'La cantidad debe ser mayor a 0' })
  materialQuantity?: number;
}
