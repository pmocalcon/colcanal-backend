import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Requisition } from './requisition.entity';
import { RequisitionApproval } from './requisition-approval.entity';

@Entity('requisition_statuses')
export class RequisitionStatus {
  @PrimaryGeneratedColumn({ name: 'status_id' })
  statusId: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string;

  @Column({ type: 'integer', default: 0 })
  order: number;

  @OneToMany(() => Requisition, (requisition) => requisition.status)
  requisitions: Requisition[];

  @OneToMany(() => RequisitionApproval, (approval) => approval.previousStatus)
  approvalsAsPreviousStatus: RequisitionApproval[];

  @OneToMany(() => RequisitionApproval, (approval) => approval.newStatus)
  approvalsAsNewStatus: RequisitionApproval[];
}
