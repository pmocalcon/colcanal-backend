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

/**
 * Configuracion CREG por municipio (empresa): porcentajes de costos indirectos
 * e IPP de referencia que se autocompletan al crear una unidad constructiva.
 * Los porcentajes se guardan como numero (ej: 15.00 = 15%).
 */
@Entity("creg_municipio_configs")
@Unique(["companyId", "projectId"])
export class CregMunicipioConfig {
  @PrimaryGeneratedColumn({ name: "config_id" })
  configId: number;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "project_id", type: "int", nullable: true })
  projectId: number | null;

  @Column({ name: "pct_engineering", type: "decimal", precision: 6, scale: 3, default: 15 })
  pctEngineering: number;

  @Column({ name: "pct_administration", type: "decimal", precision: 6, scale: 3, default: 2 })
  pctAdministration: number;

  @Column({ name: "pct_inspection", type: "decimal", precision: 6, scale: 3, default: 7 })
  pctInspection: number;

  @Column({ name: "pct_interventoria", type: "decimal", precision: 6, scale: 3, default: 7 })
  pctInterventoria: number;

  @Column({ name: "pct_financial", type: "decimal", precision: 6, scale: 3, default: 11.3 })
  pctFinancial: number;

  @Column({ name: "ipp_base", type: "decimal", precision: 10, scale: 2, nullable: true })
  ippBase: number | null;

  @Column({ name: "ipp_current", type: "decimal", precision: 10, scale: 2, nullable: true })
  ippCurrent: number | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @ManyToOne(() => Company)
  @JoinColumn({ name: "company_id" })
  company: Company;
}
