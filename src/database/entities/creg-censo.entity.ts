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
 * Censo fisico por municipio (empresa/proyecto): matriz de cantidades por UCAP
 * y por mes, con rango de fechas (inicio/fin). Se guarda todo en una columna
 * JSON para ser aditivo/seguro con synchronize.
 *
 * data = {
 *   fechaInicio: "YYYY-MM-DD",
 *   fechaFinal:  "YYYY-MM-DD",
 *   mesInicial:  number,            // N° del primer mes (ej. 97)
 *   quantities:  { [ucapId]: { [YYYY-MM]: number } }
 * }
 */
@Entity("creg_censos")
@Unique(["companyId", "projectId"])
export class CregCenso {
  @PrimaryGeneratedColumn({ name: "censo_id" })
  censoId: number;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "project_id", type: "int", nullable: true })
  projectId: number | null;

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
