import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DirectorBudget } from './director-budget.entity';
import { Material } from './material.entity';

@Entity('director_budget_items')
export class DirectorBudgetItem {
  @PrimaryGeneratedColumn({ name: 'item_id' })
  itemId: number;

  @Column({ name: 'budget_id' })
  budgetId: number;

  @Column({ name: 'item_order' })
  itemOrder: number;

  @Column({ name: 'material_id', nullable: true })
  materialId: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  codigo: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true })
  cantidad: number;

  @Column({ name: 'vr_unitario', type: 'decimal', precision: 15, scale: 2, nullable: true })
  vrUnitario: number;

  @Column({ name: 'cant_bodega', type: 'decimal', precision: 15, scale: 4, nullable: true })
  cantBodega: number;

  @Column({ name: 'costo_transporte', type: 'decimal', precision: 15, scale: 2, nullable: true })
  costoTransporte: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  ejecutado: number;

  @Column({ name: 'has_iva', type: 'boolean', default: true })
  hasIva: boolean;

  @ManyToOne(() => DirectorBudget, (b) => b.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budget_id' })
  budget: DirectorBudget;

  @ManyToOne(() => Material, { nullable: true })
  @JoinColumn({ name: 'material_id' })
  material: Material;
}
