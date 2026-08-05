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
 * Liquidacion mensual por municipio (empresa/proyecto), Res. CREG 123 de 2011.
 *
 * Casi todo se CALCULA al vuelo: las cantidades salen del censo fisico y los
 * parametros (r, Vi, FAOM, IPP, % ambientales...) de la hoja de Parametros.
 * Aqui solo se guarda lo propio de cada mes liquidado: los ajustes manuales y
 * el IPP del mes usado, para dejar constancia de con que se liquido.
 *
 * Se usa una columna JSON (mismo patron que creg_censos) para ser aditivo y
 * seguro con synchronize.
 *
 * data = {
 *   meses: {
 *     [YYYY-MM]: {
 *       ippMes?:     number,   // IPP(m-1) usado en el mes liquidado
 *       ajusteAom?:  number,   // AJUSTE AOM (puede ser negativo)
 *       ajusteInv?:  number,   // AJUSTE INVERSION
 *       observacion?: string,
 *
 *       // Aprobacion del mes (solo Director Tecnico). Un mes aprobado queda
 *       // congelado: saveLiquidacion conserva lo guardado e ignora lo que
 *       // llegue para ese mes.
 *       aprobado?:        true,
 *       aprobadoEn?:      string,  // ISO
 *       aprobadoPor?:     number,  // userId
 *       aprobadoPorNombre?: string,
 *     }
 *   }
 * }
 */
@Entity("creg_liquidaciones")
@Unique(["companyId", "projectId"])
export class CregLiquidacion {
  @PrimaryGeneratedColumn({ name: "liquidacion_id" })
  liquidacionId: number;

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
