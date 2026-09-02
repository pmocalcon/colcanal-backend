import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

/**
 * Talento humano — las cifras del año que usa la nómina.
 *
 * Tabla nueva y AISLADA, sin llaves foráneas, igual que las demás `th_*`.
 *
 * En el Excel esto era la fila de constantes encima de la hoja NÓMINA (`D5` el mínimo,
 * `D6` el auxilio) y en el sistema estaba escrito a mano en la pantalla de Nómina, así
 * que cada 1º de enero había que acordarse de cambiarlo en dos sitios. Acá queda una
 * fila por año: al liquidar se toma la del año del periodo.
 *
 * Se guarda solo lo que el Gobierno decreta. Los múltiplos que la hoja tenía al lado
 * —dos mínimos para el auxilio de transporte, cuatro para el FSP— no se guardan porque
 * se calculan, y tenerlos escritos fue justo lo que dejó pasar el error del FSP: la
 * fórmula apuntaba a la celda de dos mínimos y multiplicaba por cuatro, cobrando desde
 * ocho.
 */
@Entity("th_parametros_nomina")
export class ThParametroNomina {
  @PrimaryGeneratedColumn({ name: "parametro_id" })
  parametroId: number;

  /** Una fila por año. La nómina de un periodo usa la del año de ese periodo. */
  @Index({ unique: true })
  @Column({ type: "int" })
  anio: number;

  /** Salario mínimo mensual legal vigente. */
  @Column({ type: "numeric", precision: 14, scale: 2 })
  smmlv: string;

  /** Auxilio de transporte mensual, para quien devenga menos de dos mínimos. */
  @Column({ name: "auxilio_transporte", type: "numeric", precision: 14, scale: 2 })
  auxilioTransporte: string;

  /**
   * UVT del año. La retención en la fuente se calcula entera en UVT —los tramos del
   * Art. 383, los topes de las deducciones— y sin ella no hay retención posible.
   *
   * Va aquí y no en la tabla de retenciones porque es una cifra que decreta la DIAN
   * una vez al año, igual que el mínimo y el auxilio: es un parámetro del año, no algo
   * de cada persona.
   */
  @Column({ type: "numeric", precision: 14, scale: 2, default: 0 })
  uvt: string;

  @Column({ type: "text", nullable: true })
  observaciones: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
