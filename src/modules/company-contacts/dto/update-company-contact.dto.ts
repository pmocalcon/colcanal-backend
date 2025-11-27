import { PartialType } from '@nestjs/swagger';
import { CreateCompanyContactDto } from './create-company-contact.dto';

export class UpdateCompanyContactDto extends PartialType(CreateCompanyContactDto) {}
