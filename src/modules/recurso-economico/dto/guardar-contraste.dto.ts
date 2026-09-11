import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsObject, IsOptional, Matches } from "class-validator";

/**
 * Lo que la pantalla de Contraste manda al guardar.
 *
 * Los dos bloques se validan como objeto y no campo por campo. Es la misma razón que en
 * el CEP: su forma la imponen los lectores de documentos —el de la factura DIAN, el de la
 * orden del municipio—, que cambian cuando cambia un formato, y enumerarla aquí
 * obligaría a tocar el DTO cada vez. El servicio los normaliza al guardar, quedándose
 * solo con los campos que conoce y con un tope de renglones, así que lo que sobre no
 * entra al jsonb.
 */
export class GuardarContrasteDto {
  @ApiProperty({ example: "2026-07", description: "Mes de la factura, YYYY-MM" })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "El periodo va como YYYY-MM." })
  periodo: string;

  @ApiProperty({ description: "Municipio del contraste" })
  @IsInt()
  companyId: number;

  @ApiPropertyOptional({ description: "El contraste con la factura electrónica" })
  @IsOptional()
  @IsObject()
  factura?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "El contraste con la orden de pago del municipio" })
  @IsOptional()
  @IsObject()
  orden?: Record<string, unknown>;
}
