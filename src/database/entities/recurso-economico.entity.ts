import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
} from "typeorm";

/**
 * Recurso Económico: una sola fila para todo el sistema.
 *
 * A diferencia del CREG —que guarda una fila por municipio— aquí las dos tablas
 * (interventoría y retenciones) son la vista completa de los diez proyectos a la
 * vez: se leen y se editan juntas, así que partirlas por empresa obligaría a
 * diez consultas para pintar una tabla.
 *
 * El contenido va en `data` como jsonb, igual que el resto del CREG, para que
 * agregar un año o una retención nueva no pida migración.
 */
@Entity("recurso_economico")
export class RecursoEconomico {
  @PrimaryGeneratedColumn({ name: "recurso_id" })
  recursoId: number;

  /**
   * {
   *   anios: {
   *     "2026": {
   *       smmlv: 1750905,
   *       proyectos: { "<companyId>": { firma, smlv, iva, valorManual } }
   *     }
   *   },
   *   retenciones: { "<companyId>": { rteFte, rteIca, timbre, estampillas } }
   * }
   *
   * En retenciones, `null` es "no aplica" (la celda negra del archivo) y 0 es
   * "aplica, en cero": son cosas distintas y no pueden colapsarse.
   */
  @Column({ name: "data", type: "jsonb", default: () => "'{}'::jsonb" })
  data: Record<string, any>;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
