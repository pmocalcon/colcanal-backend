import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { Ucap } from "./ucap.entity";

/**
 * Apellido/variante de una UCAP: una misma UCAP (misma descripción y hoja de
 * costos) puede tener varios apellidos para distinguir su origen — p. ej.
 * "Acta 001-2024", "Otrosí No. 6" — y capturar el censo por separado en cada uno.
 *
 * Reemplaza la antigua columna `apellido` (1 sola) de la tabla `ucaps`.
 */
@Entity("ucap_apellidos")
@Index(["ucapId"])
export class UcapApellido {
  @PrimaryGeneratedColumn({ name: "apellido_id" })
  apellidoId: number;

  @Column({ name: "ucap_id" })
  ucapId: number;

  @Column({ name: "apellido", type: "varchar", length: 120 })
  apellido: string;

  // Orden de presentación dentro de la UCAP.
  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @ManyToOne(() => Ucap, (ucap) => ucap.apellidos, { onDelete: "CASCADE" })
  @JoinColumn({ name: "ucap_id" })
  ucap: Ucap;
}
