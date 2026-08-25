import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

/**
 * Talento humano — planillas de horas extras ya aprobadas.
 *
 * Tabla nueva y AISLADA, sin llaves foráneas, igual que las demás `th_*`.
 *
 * Nace cuando Gerencia de Proyectos aprueba la planilla del formato **GTH-016-F** (G.
 * de talento humano): el formato es el papel que recorre las cuatro firmas; esto es lo
 * que queda listo para que Dirección Administrativa lo lleve a nómina. El detalle día a
 * día vive en `th_horas_extras_detalle`.
 */
@Entity("th_horas_extras")
export class ThHorasExtra {
  @PrimaryGeneratedColumn({ name: "horas_extra_id" })
  horasExtraId: number;

  @Index()
  @Column({ type: "varchar", length: 30, nullable: true })
  identificacion: string | null;

  @Index()
  @Column({ type: "varchar", length: 160 })
  nombre: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  cargo: string | null;

  @Column({ type: "numeric", precision: 14, scale: 2, nullable: true })
  salario: string | null;

  /** Texto libre, tal como se diligencia en la planilla: «Agosto 2026». */
  @Column({ type: "varchar", length: 60, nullable: true })
  periodo: string | null;

  @Column({ name: "valor_hora", type: "numeric", precision: 14, scale: 2, nullable: true })
  valorHora: string | null;

  /** Suma de las horas de todos los renglones, sin recargo. */
  @Column({ name: "total_horas", type: "numeric", precision: 8, scale: 2, nullable: true })
  totalHoras: string | null;

  /** Cada renglón por su recargo y por el valor hora, sumado. Es lo que se lleva a nómina. */
  @Column({ name: "total_liquidacion", type: "numeric", precision: 14, scale: 2, nullable: true })
  totalLiquidacion: string | null;

  @Column({ type: "text", nullable: true })
  observaciones: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
