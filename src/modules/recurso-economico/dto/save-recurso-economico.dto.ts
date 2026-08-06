import { ApiProperty } from "@nestjs/swagger";
import { IsObject } from "class-validator";

export class SaveRecursoEconomicoDto {
  @ApiProperty({
    description:
      "Contenido completo del módulo: { anios: { '2026': { smmlv, proyectos } }, retenciones }",
  })
  @IsObject()
  data: Record<string, any>;
}
