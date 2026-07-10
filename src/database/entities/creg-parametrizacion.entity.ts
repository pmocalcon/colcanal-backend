import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from "typeorm";
import { Company } from "./company.entity";
import { Project } from "./project.entity";

/**
 * Hoja de parametrizacion CREG por municipio (empresa/proyecto).
 * Guarda todos los parametros generales, impuestos, vida util y la tabla
 * FAOML/FAOMn por año en una sola columna JSON, para no crear decenas de
 * columnas y ser aditivo/seguro con synchronize.
 */
@Entity("creg_parametrizaciones")
@Unique(["companyId", "projectId"])
export class CregParametrizacion {
  @PrimaryGeneratedColumn({ name: "param_id" })
  paramId: number;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "project_id", type: "int", nullable: true })
  projectId: number | null;

  // Estructura libre (ver defaults en el frontend): general, parametros,
  // impuestos, vida util y filas de la tabla FAOML/FAOMn.
  @Column({ name: "data", type: "jsonb", nullable: true })
  data: Record<string, any> | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @ManyToOne(() => Company)
  @JoinColumn({ name: "company_id" })
  company: Company;

  @ManyToOne(() => Project)
  @JoinColumn({ name: "project_id" })
  project: Project;
}
