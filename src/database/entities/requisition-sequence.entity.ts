import {
  Entity,
  Column,
  PrimaryColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { RequisitionPrefix } from './requisition-prefix.entity';

@Entity('requisition_sequences')
export class RequisitionSequence {
  @PrimaryColumn({ name: 'prefix_id' })
  prefixId: number;

  @Column({ name: 'last_number', type: 'integer' })
  lastNumber: number;

  @OneToOne(() => RequisitionPrefix, (prefix) => prefix.requisitionSequence)
  @JoinColumn({ name: 'prefix_id' })
  requisitionPrefix: RequisitionPrefix;
}
