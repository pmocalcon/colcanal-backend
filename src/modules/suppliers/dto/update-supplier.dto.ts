import { PartialType } from '@nestjs/swagger';
import { CreateSupplierDto } from './create-supplier.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {
  @ApiPropertyOptional({
    description: 'Estado del proveedor (activo/inactivo)',
    example: true,
  })
  @IsBoolean({ message: 'El estado debe ser verdadero o falso' })
  @IsOptional()
  isActive?: boolean;
}
