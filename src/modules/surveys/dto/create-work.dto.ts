import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWorkDto {
  @ApiProperty({
    description: 'ID of the company (UTAP) for this work',
    example: 3,
    type: Number,
  })
  @IsNumber({}, { message: 'companyId must be a valid number' })
  @Type(() => Number)
  companyId: number;

  @ApiProperty({
    description: 'ID of the project (only for Canales & Contactos)',
    example: 2,
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'projectId must be a valid number' })
  @Type(() => Number)
  projectId?: number;

  @ApiProperty({
    description: 'Name of the work',
    example: 'Plazoleta - Alto de la Cruz',
  })
  @IsString({ message: 'name must be a string' })
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Address of the work',
    example: 'Barrio Alto de la Cruz',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiProperty({
    description: 'Neighborhood or township',
    example: 'Barrio Centro',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  neighborhood?: string;

  @ApiProperty({
    description: 'Sector or village',
    example: 'Alto de la Cruz',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sectorVillage?: string;

  @ApiProperty({
    description: 'Zone type',
    example: 'Urbano',
    enum: ['Urbano', 'Rural'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  zone?: string;

  @ApiProperty({
    description: 'Type of area to illuminate',
    example: 'Plazoleta',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  areaType?: string;

  @ApiProperty({
    description: 'Type of request',
    example: 'Expansión',
    enum: ['Expansión', 'Modernización', 'Mantenimiento'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  requestType?: string;

  @ApiProperty({
    description: 'Record number (Número de Acta) - generates workCode automatically',
    example: '03-2025',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  recordNumber?: string;

  @ApiProperty({
    description: 'Name of the requesting user',
    example: 'Alcalde',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  userName?: string;

  @ApiProperty({
    description: 'Requesting entity or institution',
    example: 'Municipio',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  requestingEntity?: string;

  @ApiProperty({
    description: 'User address',
    example: 'Calle Principal #10-20',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  userAddress?: string;

  @ApiProperty({
    description: 'Filing number (No. Radicado)',
    example: 'RAD-2025-001',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  filingNumber?: string;
}
