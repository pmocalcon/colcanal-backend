import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Schedule } from './schedule.entity';

/**
 * Registro de EJECUCIÓN (lo real) para materiales y actividades de un cronograma.
 * Tabla genérica: exec_type distingue 'material' | 'activity'.
 * - Materiales: item_key = código de material, label = descripción, unit = unidad.
 * - Actividades: item_key = id de fila de actividad, label = nombre de la actividad.
 * Una fila con execution_date NULL conserva la etiqueta/nombre aunque no tenga cantidades diarias.
 */
@Entity('schedule_executions')
@Index(['scheduleId', 'execType'])
export class ScheduleExecution {
  @PrimaryGeneratedColumn({ name: 'execution_id' })
  executionId: number;

  @Column({ name: 'schedule_id' })
  scheduleId: number;

  @Column({ name: 'exec_type', type: 'varchar', length: 20 })
  execType: 'material' | 'activity';

  @Column({ name: 'item_key', type: 'varchar', length: 100 })
  itemKey: string;

  @Column({ name: 'label', type: 'text', nullable: true })
  label: string | null;

  @Column({ name: 'unit_of_measure', type: 'varchar', length: 50, nullable: true })
  unitOfMeasure: string | null;

  @Column({ name: 'execution_date', type: 'date', nullable: true })
  executionDate: string | null;

  @Column({ name: 'quantity', type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 15, scale: 2, nullable: true })
  unitPrice: number | null;

  @ManyToOne(() => Schedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule: Schedule;
}
