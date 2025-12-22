import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from './company.entity';
import { Project } from './project.entity';
import { OperationCenter } from './operation-center.entity';
import { ProjectCode } from './project-code.entity';
import { User } from './user.entity';
import { RequisitionItem } from './requisition-item.entity';
import { RequisitionLog } from './requisition-log.entity';
import { RequisitionStatus } from './requisition-status.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { RequisitionApproval } from './requisition-approval.entity';

@Entity('requisitions')
export class Requisition {
  @PrimaryGeneratedColumn({ name: 'requisition_id' })
  requisitionId: number;

  @Column({ name: 'requisition_number', type: 'varchar', length: 20, unique: true })
  requisitionNumber: string;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'project_id', nullable: true })
  projectId: number;

  @Column({ name: 'operation_center_id' })
  operationCenterId: number;

  @Column({ name: 'project_code_id', nullable: true })
  projectCodeId: number;

  @Column({ name: 'created_by' })
  createdBy: number;

  @Column({ name: 'status_id', default: 1 })
  statusId: number;

  @Column({ name: 'priority', type: 'varchar', length: 10, default: 'normal' })
  priority: 'alta' | 'normal';

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedBy: number;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt: Date;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date;

  @Column({ name: 'obra', type: 'varchar', length: 100, nullable: true })
  obra: string;

  @Column({ name: 'codigo_obra', type: 'varchar', length: 50, nullable: true })
  codigoObra: string;

  // Relaciones
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => OperationCenter)
  @JoinColumn({ name: 'operation_center_id' })
  operationCenter: OperationCenter;

  @ManyToOne(() => ProjectCode, { nullable: true })
  @JoinColumn({ name: 'project_code_id' })
  projectCode: ProjectCode;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => RequisitionStatus)
  @JoinColumn({ name: 'status_id' })
  status: RequisitionStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver: User;

  @OneToMany(() => RequisitionItem, (item) => item.requisition, {
    cascade: true,
  })
  items: RequisitionItem[];

  @OneToMany(() => RequisitionLog, (log) => log.requisition, {
    cascade: true,
  })
  logs: RequisitionLog[];

  @OneToMany(() => PurchaseOrder, (purchaseOrder) => purchaseOrder.requisition)
  purchaseOrders: PurchaseOrder[];

  @OneToMany(() => RequisitionApproval, (approval) => approval.requisition)
  approvals: RequisitionApproval[];
}
