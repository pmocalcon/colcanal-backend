import {
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ReceivedByAccountingDto {
  @ApiProperty({
    description: "Fecha en que contabilidad recibe las facturas",
    example: "2024-01-20",
  })
  @IsNotEmpty({
    message: "La fecha de recepción por contabilidad es requerida",
  })
  @IsDateString(
    {},
    { message: "La fecha debe ser una fecha válida (YYYY-MM-DD)" },
  )
  receivedDate: string;

  @ApiPropertyOptional({
    description: "Observaciones de contabilidad sobre la recepción",
    example: "Falta el soporte de retención, se recibe con salvedad",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message: "Las observaciones no pueden superar los 2000 caracteres",
  })
  observations?: string;
}

/**
 * Rechazo de las facturas por contabilidad: las devuelve a Compras.
 * A diferencia de la recepción, aquí el motivo es obligatorio — es lo único que
 * le dice a Compras qué corregir.
 */
export class RejectedByAccountingDto {
  @ApiProperty({
    description: "Motivo del rechazo. Se le muestra a Compras.",
    example: "La factura 12345 no coincide con el valor de la orden",
  })
  @IsNotEmpty({ message: "Debe indicar el motivo del rechazo" })
  @IsString()
  @MaxLength(2000, {
    message: "Las observaciones no pueden superar los 2000 caracteres",
  })
  observations: string;
}
