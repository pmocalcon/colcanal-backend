import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

/**
 * Talento humano — el visto bueno de una persona dentro de la nómina de un periodo.
 *
 * Antes de mandar la liquidación a Financiera, Talento Humano la revisa persona por
 * persona: busca la cédula, mira que la ficha esté completa y **digita a mano el neto a
 * pagar**. El sistema no acepta el visto bueno si lo digitado no coincide con lo que él
 * calculó, ni si a la ficha le falta algo para poder pagar.
 *
 * La digitación es el punto de todo esto: si el revisor solo tuviera que decir «sí», su
 * visto bueno no probaría que miró la cifra. Al tener que escribirla, un error de
 * cálculo o una cuenta cambiada salta antes de que salga la plata, no después.
 *
 * Tabla nueva y AISLADA, sin llaves foráneas, igual que el resto de las `th_*`.
 *
 * Guarda `netoCalculado` —lo que el sistema decía **en el momento** de validar— para poder
 * detectar que la nómina cambió después: si el periodo se reabre y se vuelve a generar,
 * el visto bueno de esa persona queda viejo y hay que repetirlo. Sin esta copia no habría
 * cómo distinguir «ya lo revisaron» de «lo revisaron sobre otra cifra».
 */
@Entity("th_validaciones_nomina")
@Index(["periodo", "personaId"], { unique: true })
export class ThValidacionNomina {
  @PrimaryGeneratedColumn({ name: "validacion_id" })
  validacionId: number;

  @Index()
  @Column({ type: "varchar", length: 7 })
  periodo: string;

  /**
   * Por persona y no por identificación: quien tiene contrato en varias empresas del
   * grupo liquida una fila por cada una y hay que dar el visto bueno a cada una.
   */
  @Column({ name: "persona_id", type: "int" })
  personaId: number;

  @Index()
  @Column({ type: "varchar", length: 30 })
  identificacion: string;

  @Column({ type: "varchar", length: 160 })
  nombre: string;

  /** Lo que el sistema calculó cuando se dio el visto bueno. */
  @Column({ name: "neto_calculado", type: "numeric", precision: 14, scale: 2 })
  netoCalculado: string;

  /** Lo que el revisor escribió. Iguales, o no se guarda. */
  @Column({ name: "neto_digitado", type: "numeric", precision: 14, scale: 2 })
  netoDigitado: string;

  @Column({ name: "validado_por", type: "varchar", length: 160, nullable: true })
  validadoPor: string | null;

  @Column({ name: "validado_en", type: "timestamptz", nullable: true })
  validadoEn: Date | null;

  @Column({ type: "text", nullable: true })
  observaciones: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
