import { IsNotEmpty, IsDateString } from 'class-validator';

export class SendToAccountingDto {
  @IsNotEmpty({ message: 'La fecha de envío a contabilidad es requerida' })
  @IsDateString({}, { message: 'La fecha debe ser una fecha válida (YYYY-MM-DD)' })
  sentToAccountingDate: string;
}
