import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Unique,
} from "typeorm";
import { Company } from "./company.entity";
import { Project } from "./project.entity";
import { UcapCostItem } from "./ucap-cost-item.entity";
import { UcapApellido } from "./ucap-apellido.entity";

/**
 * Unidad Constructiva (UCAP): valor, IPP y porcentajes de costo; base del censo, los presupuestos y la liquidación. Tiene hoja de costos y apellidos/variantes.
 */
@Entity("ucaps")
@Unique(["companyId", "projectId", "code"])
export class Ucap {
  @PrimaryGeneratedColumn({ name: "ucap_id" })
  ucapId: number;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "project_id", nullable: true })
  projectId: number;

  @Column({ type: "varchar", length: 50 })
  code: string;

  @Column({ type: "text" })
  description: string;

  // Grupo/categoría para agrupar UCAPs (LUMINARIAS, FOTOCONTROLES, ...). Lista fija en el front.
  @Column({ name: "grupo", type: "varchar", length: 60, nullable: true })
  grupo: string | null;

  @Column({ name: "rounded_value", type: "decimal", precision: 15, scale: 2 })
  roundedValue: number;

  @Column({ name: "initial_ipp", type: "decimal", precision: 10, scale: 2 })
  initialIpp: number;

  // ===== Hoja de costos CREG (costo de reposición a nuevo) =====
  // Porcentajes de costos indirectos (nullable: solo si tiene hoja CREG).
  @Column({ name: "pct_transport", type: "decimal", precision: 6, scale: 3, nullable: true })
  pctTransport: number | null;

  @Column({ name: "pct_engineering", type: "decimal", precision: 6, scale: 3, nullable: true })
  pctEngineering: number | null;

  @Column({ name: "pct_administration", type: "decimal", precision: 6, scale: 3, nullable: true })
  pctAdministration: number | null;

  @Column({ name: "pct_inspection", type: "decimal", precision: 6, scale: 3, nullable: true })
  pctInspection: number | null;

  @Column({ name: "pct_interventoria", type: "decimal", precision: 6, scale: 3, nullable: true })
  pctInterventoria: number | null;

  @Column({ name: "pct_financial", type: "decimal", precision: 6, scale: 3, nullable: true })
  pctFinancial: number | null;

  @Column({ name: "pct_retie_retilap", type: "decimal", precision: 6, scale: 3, nullable: true })
  pctRetieRetilap: number | null;

  @Column({ name: "pct_environmental", type: "decimal", precision: 6, scale: 3, nullable: true })
  pctEnvironmental: number | null;

  // IPP actual usado en la hoja (el IPP base es initialIpp = IPP del municipio).
  @Column({ name: "ipp_current", type: "decimal", precision: 10, scale: 2, nullable: true })
  ippCurrent: number | null;

  // Mes (1-12) y año en que fue creada la UCAP / hoja de costos.
  @Column({ name: "ucap_month", type: "int", nullable: true })
  ucapMonth: number | null;

  @Column({ name: "ucap_year", type: "int", nullable: true })
  ucapYear: number | null;

  // Potencia (W): nominal y pérdidas. La "potencia con pérdidas" es la suma.
  @Column({ name: "power_nominal", type: "int", nullable: true })
  powerNominal: number | null;

  @Column({ name: "power_losses", type: "int", nullable: true })
  powerLosses: number | null;

  /**
   * Eficiencia luminosa [Lm/W]. Distingue tecnologias dentro de un mismo grupo
   * (sodio 130 vs LED 160), asi que vive en la UCAP y no en Parametros. La
   * liquidacion la usa para escalar la anualidad de inversion (CINV).
   */
  @Column({ name: "efficiency_lm_w", type: "int", nullable: true })
  efficiencyLmW: number | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

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

  @OneToMany(() => UcapCostItem, (item) => item.ucap, { cascade: true })
  costItems: UcapCostItem[];

  // Apellidos/variantes de la UCAP (distinguen el origen: acta, otrosí, ...).
  @OneToMany(() => UcapApellido, (a) => a.ucap, { cascade: true })
  apellidos: UcapApellido[];
}
