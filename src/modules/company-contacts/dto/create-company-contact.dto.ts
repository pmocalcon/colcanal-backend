import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEmail,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompanyContactDto {
  @ApiProperty({ description: 'ID de la compañía', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  companyId: number;

  @ApiPropertyOptional({ description: 'ID del proyecto (opcional)', example: 1 })
  @IsNumber()
  @IsOptional()
  projectId?: number;

  @ApiProperty({ description: 'NIT de la compañía', example: '900123456-7' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  nit: string;

  @ApiProperty({ description: 'Razón social', example: 'Canales & Contactos S.A.S.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  businessName: string;

  @ApiPropertyOptional({ description: 'Dirección', example: 'Calle 123 #45-67' })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ description: 'Teléfono', example: '3001234567' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Email', example: 'contacto@empresa.com' })
  @IsEmail()
  @IsOptional()
  @MaxLength(100)
  email?: string;

  @ApiPropertyOptional({ description: 'Ciudad', example: 'Bogotá' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Persona de contacto', example: 'Juan Pérez' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  contactPerson?: string;

  @ApiPropertyOptional({ description: 'Es el contacto por defecto', default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
