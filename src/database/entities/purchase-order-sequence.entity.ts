import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OperationCenter } from './operation-center.entity';

@Entity('purchase_order_sequences')
export class PurchaseOrderSequence {
  @PrimaryGeneratedColumn({ name: 'sequence_id' })
  sequenceId: number;

  @Column({ name: 'operation_center_id', unique: true })
  operationCenterId: number;

  @Column({ name: 'last_number', type: 'integer', default: 0 })
  lastNumber: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => OperationCenter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'operation_center_id' })
  operationCenter: OperationCenter;
}
