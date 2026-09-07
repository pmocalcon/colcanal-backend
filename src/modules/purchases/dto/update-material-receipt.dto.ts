import {
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateMaterialReceiptDto {
  @ApiProperty({
    description: "Nueva cantidad recibida",
    required: false,
    example: 8,
  })
  /**
   * Se admite el cero al **corregir**, no al registrar.
   *
   * Registrar una recepción de cero no tiene sentido —no llegó nada, no hay nada que
   * registrar—, pero corregir una a cero sí: es lo que hay que hacer cuando se anotó
   * la llegada de un material que al final no llegó. Con el mínimo en 0.01 esa
   * corrección era imposible y la recepción equivocada se quedaba, porque tampoco hay
   * forma de borrarla: la orden quedaba dada por recibida para siempre.
   *
   * El renglón se conserva con su observación en vez de desaparecer, que para auditar
   * es lo correcto: queda el rastro de que se anotó y de que se corrigió.
   */
  @IsOptional()
  @IsNumber()
  @Min(0, { message: "La cantidad no puede ser negativa" })
  quantityReceived?: number;

  @ApiProperty({
    description: "Nueva fecha de recepción (YYYY-MM-DD)",
    required: false,
    example: "2025-11-07",
  })
  @IsOptional()
  @IsDateString()
  receivedDate?: string;

  @ApiProperty({
    description: "Nuevas observaciones",
    required: false,
    example: "Material revisado y almacenado",
  })
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiProperty({
    description: "Nueva justificación de sobreentrega (solo si aplica)",
    required: false,
    example: "Proveedor corrigió el envío",
  })
  @IsOptional()
  @IsString()
  overdeliveryJustification?: string;
}
