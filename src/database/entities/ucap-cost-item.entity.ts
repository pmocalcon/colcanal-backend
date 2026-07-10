import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Ucap } from "./ucap.entity";

export type UcapCostSection =
  | "material"
  | "transporte"
  | "obra_civil"
  | "montaje";

/**
 * Línea de la hoja de costos CREG de una UCAP.
 * section:
 *  - "material"   -> suministro en sitio (referencia al catálogo de materiales)
 *  - "transporte" -> transporte de herramienta y equipo en sitio (parte del suministro)
 *  - "obra_civil" -> costo de obra civil
 *  - "montaje"    -> mano de obra de montaje (liniero, ingeniero coordinador, etc.)
 */
@Entity("ucap_cost_items")
export class UcapCostItem {
  @PrimaryGeneratedColumn({ name: "item_id" })
  itemId: number;

  @Column({ name: "ucap_id" })
  ucapId: number;

  @Column({ type: "varchar", length: 20 })
  section: UcapCostSection;

  @Column({ name: "material_id", type: "int", nullable: true })
  materialId: number | null;

  @Column({ type: "text" })
  name: string;

  @Column({ type: "varchar", length: 30, default: "UND" })
  unit: string;

  @Column({ type: "decimal", precision: 12, scale: 3, default: 0 })
  quantity: number;

  @Column({ name: "unit_price", type: "decimal", precision: 15, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder: number;

  @ManyToOne(() => Ucap, (ucap) => ucap.costItems, { onDelete: "CASCADE" })
  @JoinColumn({ name: "ucap_id" })
  ucap: Ucap;
}
