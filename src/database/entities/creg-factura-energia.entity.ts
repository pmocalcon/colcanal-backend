import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from "typeorm";

/**
 * Facturas de energía del municipio, una por mes.
 *
 * Misma forma que el resto del CREG: una fila por municipio (y proyecto, cuando
 * la empresa maneja varios) con un jsonb `{ meses: { 'YYYY-MM': {...} } }`, para
 * que agregar un componente del costo no pida migración.
 */
@Entity("creg_facturas_energia")
@Unique(["companyId", "projectId"])
export class CregFacturaEnergia {
  @PrimaryGeneratedColumn({ name: "factura_energia_id" })
  facturaEnergiaId: number;

  @Column({ name: "company_id", type: "int" })
  companyId: number;

  @Column({ name: "project_id", type: "int", nullable: true })
  projectId: number | null;

  @Column({ name: "data", type: "jsonb", default: () => "'{}'::jsonb" })
  data: Record<string, any>;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
