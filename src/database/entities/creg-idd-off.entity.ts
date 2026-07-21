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
 * IDD OFF: indice de disponibilidad de las luminarias APAGADAS en el periodo.
 *
 * Es el origen del IDapagadas que multiplica la anualidad de inversion en la
 * liquidacion, asi que un dato mal cargado aqui mueve el valor a pagar del mes:
 *
 *   Wi x HSSi = (potencia con perdidas [W] x horas fuera de servicio) / 1000
 *   ID        = 1 - SUM(Wi x HSSi) / (WT x T)
 *
 * WT = potencia total instalada del periodo [kW]; T = horas del periodo
 * (p. ej. junio 2025: 30 dias x 12 h = 360).
 *
 * Las fallas hoy se capturan a mano; el origen previsto es una ruta de
 * SharePoint, pendiente de que la app de Graph tenga permiso de lectura.
 *
 * Se usa una columna JSON (mismo patron que creg_censos y creg_liquidaciones)
 * para ser aditivo y seguro con synchronize.
 *
 * data = {
 *   sumaMediaNoche?: boolean,  // +12 h de la noche del reporte en las Horas.
 *                              // Regla por proyecto: Puerto Asis no (mismo dia
 *                              // = 0); CT / Operacion General si (mismo dia =
 *                              // 12). Formula: (final - inicial [+1]) x 12.
 *   meses: {
 *     [YYYY-MM]: {
 *       wt?: number,        // potencia total instalada [kW]
 *       t?:  number,        // horas del periodo
 *       fallas: [{
 *         id: string,
 *         codigo?: string,
 *         potencia?: number,       // nominal [W]
 *         potenciaXl?: number,     // con perdidas [W]  <- el que pesa en Wi
 *         tecnologia?: string,
 *         localizacion?: string,
 *         barrio?: string,
 *         fechaInicial?: string,   // YYYY-MM-DD
 *         fechaFinal?: string,     // YYYY-MM-DD
 *       }]                         // horas y Wi x HSSi se derivan, no se guardan
 *     }
 *   }
 * }
 */
@Entity("creg_idd_off")
@Unique(["companyId", "projectId"])
export class CregIddOff {
  @PrimaryGeneratedColumn({ name: "idd_off_id" })
  iddOffId: number;

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
