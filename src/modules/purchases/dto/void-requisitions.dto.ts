import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class VoidRequisitionsDto {
  @ApiProperty({
    description: "IDs de las requisiciones a anular",
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  ids: number[];

  @ApiProperty({
    description: "Motivo de la anulación",
    example: "Requisición duplicada",
    required: false,
  })
  @IsOptional()
  @IsString()
  comments?: string;
}
