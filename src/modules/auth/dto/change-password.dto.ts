import { IsString, MinLength, Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/** Regla única de robustez de contraseña, compartida por todo el módulo. */
export const PASSWORD_MIN = 8;
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
export const PASSWORD_RULE_MSG =
  "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número";

export class ChangePasswordDto {
  @ApiProperty({
    description: "Contraseña actual del usuario",
    example: "Canalco2025!",
  })
  @IsString()
  passwordActual: string;

  @ApiProperty({
    description: PASSWORD_RULE_MSG,
    example: "MiClaveNueva7",
    minLength: PASSWORD_MIN,
  })
  @IsString()
  @MinLength(PASSWORD_MIN, {
    message: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`,
  })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_RULE_MSG })
  passwordNueva: string;
}
