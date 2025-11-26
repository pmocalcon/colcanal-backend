import { IsNotEmpty, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReceivedByAccountingDto {
  @ApiProperty({
    description: 'Fecha en que contabilidad recibe las facturas',
    example: '2024-01-20',
  })
  @IsNotEmpty({ message: 'La fecha de recepción por contabilidad es requerida' })
  @IsDateString({}, { message: 'La fecha debe ser una fecha válida (YYYY-MM-DD)' })
  receivedDate: string;
}
