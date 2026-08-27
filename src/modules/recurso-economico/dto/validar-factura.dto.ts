import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNumber, Matches, Min } from "class-validator";

/**
 * Lo que el director de proyecto manda para dar el visto bueno de una factura.
 *
 * Va el **valor** y no una casilla de «aprobado»: el control es que transcriba la cifra
 * mirando la factura física. Marcar una casilla se hace sin mirar; escribir el valor pago
 * obliga a tener el documento delante, y si no cuadra con lo que calculó el sistema no
 * pasa.
 */
export class ValidarFacturaDto {
  @ApiProperty({ example: "2026-07", description: "Mes de la factura, YYYY-MM" })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "El periodo va como YYYY-MM." })
  periodo: string;

  @ApiProperty({ description: "Municipio de la factura" })
  @IsInt()
  companyId: number;

  @ApiProperty({ description: "El valor pago que el director lee de la factura" })
  @IsNumber()
  @Min(1)
  valor: number;
}
