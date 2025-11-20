import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Company } from './company.entity';
import { Project } from './project.entity';
import { Requisition } from './requisition.entity';
import { PurchaseOrderSequence } from './purchase-order-sequence.entity';

@Entity('operation_centers')
export class OperationCenter {
  @PrimaryGeneratedColumn({ name: 'center_id' })
  centerId: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'project_id', nullable: true })
  projectId: number;

  @Column({ type: 'varchar', length: 3 })
  code: string;

  @ManyToOne(() => Company, (company) => company.operationCenters)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Project, (project) => project.operationCenters, {
    nullable: true,
  })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @OneToMany(() => Requisition, (requisition) => requisition.operationCenter)
  requisitions: Requisition[];

  @OneToMany(() => PurchaseOrderSequence, (sequence) => sequence.operationCenter)
  purchaseOrderSequences: PurchaseOrderSequence[];
}
