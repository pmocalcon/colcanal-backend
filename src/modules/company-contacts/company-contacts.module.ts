import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyContactsController } from './company-contacts.controller';
import { CompanyContactsService } from './company-contacts.service';
import { CompanyContact } from '../../database/entities/company-contact.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyContact])],
  controllers: [CompanyContactsController],
  providers: [CompanyContactsService],
  exports: [CompanyContactsService],
})
export class CompanyContactsModule {}
