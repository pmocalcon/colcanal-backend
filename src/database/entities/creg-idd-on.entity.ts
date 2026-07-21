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
 * ID ON: indice de disponibilidad de las luminarias ENCENDIDAS en el periodo,
 * es decir prendidas cuando deberian estar apagadas.
 *
 * Hoja hermana de creg_idd_off. La estructura del calculo es la misma, pero
 * cambian tres cosas:
 *
 *   1. La duracion sale de fecha + HORA (una luminaria prendida de dia se mide
 *      en horas, no en dias), no de (final - inicial) x 12.
 *   2. La columna de energia se llama Qi x Ti en vez de Wi x HSSi.
 *   3. Aparecen TEEn (tarifa $/kWh) y VCEEIn (valor del consumo por
 *      indisponibilidad), que la hoja de apagadas no tiene.
 *
 *   Qi x Ti = (potencia con perdidas [W] x horas encendida) / 1000
 *   ID      = 1 - SUM(Qi x Ti) / (WT x T)          <- verificado: =1-L8/(L9*L11)
 *   VCEEIn  = SUM(Qi x Ti) x TEEn                  <- INFERIDO, sin verificar
 *
 * WT = potencia total instalada del periodo [kW]; T = horas del periodo
 * (junio 2025: 30 dias x 12 h = 360, verificado: =12*30).
 *
 * Tabla propia en vez de un discriminador dentro de creg_idd_off: con
 * synchronize activo, crear una tabla es aditivo, mientras que tocar el UNIQUE
 * de una tabla existente no lo es.
 *
 * data = {
 *   meses: {
 *     [YYYY-MM]: {
 *       wt?:   number,   // potencia total instalada [kW]
 *       t?:    number,   // horas del periodo
 *       teen?: number,   // tarifa de suministro nivel de tension 2 [$/kWh]
 *       fallas: [{
 *         id: string,
 *         codigo?: string,
 *         potencia?: number,       // nominal [W]
 *         potenciaXl?: number,     // con perdidas [W]  <- el que pesa en Qi
 *         localizacion?: string,
 *         barrio?: string,
 *         fechaInicial?: string,   // YYYY-MM-DD
 *         fechaFinal?: string,     // YYYY-MM-DD
 *         horaInicial?: string,    // HH:MM
 *         horaFinal?: string,      // HH:MM
 *       }]                         // horas y Qi x Ti se derivan, no se guardan
 *     }
 *   }
 * }
 */
@Entity("creg_idd_on")
@Unique(["companyId", "projectId"])
export class CregIddOn {
  @PrimaryGeneratedColumn({ name: "idd_on_id" })
  iddOnId: number;

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
