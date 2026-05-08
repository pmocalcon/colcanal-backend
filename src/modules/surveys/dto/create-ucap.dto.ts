import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateUcapDto {
  @ApiProperty({ description: 'Company ID' })
  @Type(() => Number)
  @IsNumber()
  companyId: number;

  @ApiProperty({ description: 'Project ID (optional)', required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  projectId?: number;

  @ApiProperty({ description: 'UCAP code (unique per company)' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'UCAP description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Rounded value (unit cost)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  roundedValue: number;

  @ApiProperty({ description: 'Initial IPP value' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  initialIpp: number;
}
