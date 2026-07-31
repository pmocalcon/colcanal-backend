import { ApiProperty } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateSolicitudDto {
  @ApiProperty({ description: "Gestión del formato", example: "juridica" })
  @IsString()
  @MaxLength(60)
  gestion: string;

  @ApiProperty({ description: "Código del formato", example: "GTH-002-F", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  formato?: string;

  @ApiProperty({ description: "Estado", example: "borrador", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  estado?: string;

  @ApiProperty({ description: "Cuerpo del formato diligenciado", required: false })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

export class UpdateSolicitudDto {
  @ApiProperty({ description: "Cuerpo del formato diligenciado", required: false })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

export class TransitionDto {
  @ApiProperty({ description: "Acción del flujo", example: "aprobar_gerencia" })
  @IsString()
  @MaxLength(40)
  accion: string;

  @ApiProperty({ description: "Motivo (obligatorio en devoluciones/rechazos)", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivo?: string;

  @ApiProperty({
    description:
      "Datos adicionales del paso (p. ej. en el anticipo 'registrar_pago': fecha de pago y quién recibe).",
    required: false,
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
