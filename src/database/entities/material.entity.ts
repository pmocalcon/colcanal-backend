import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { MaterialGroup } from "./material-group.entity";
import { RequisitionItem } from "./requisition-item.entity";
import { MaterialPriceHistory } from "./material-price-history.entity";

/**
 * Material del catálogo (código, descripción, grupo); base de requisiciones y precios.
 */
@Entity("materials")
export class Material {
  @PrimaryGeneratedColumn({ name: "material_id" })
  materialId: number;

  @Column({ type: "text", unique: true })
  code: string;

  @Column({ type: "text" })
  description: string;

  @Column({ name: "group_id" })
  groupId: number;

  // Borrado lógico: al "eliminar" un material que ya se usó en levantamientos/
  // requisiciones se desactiva (isActive=false) en vez de borrarse, para no
  // romper los registros históricos que lo referencian.
  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @ManyToOne(() => MaterialGroup, (materialGroup) => materialGroup.materials)
  @JoinColumn({ name: "group_id" })
  materialGroup: MaterialGroup;

  @OneToMany(() => RequisitionItem, (item) => item.material)
  requisitionItems: RequisitionItem[];

  @OneToMany(() => MaterialPriceHistory, (price) => price.material)
  priceHistory: MaterialPriceHistory[];
}
