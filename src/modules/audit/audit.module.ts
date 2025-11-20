import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { RequisitionLog } from '../../database/entities/requisition-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RequisitionLog])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
