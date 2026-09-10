import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

/**
 * Un mes del Control de Excedentes de un municipio: **solo lo que se digita**.
 *
 * Lo derivado no se guarda. Son veinticinco columnas encadenadas —el saldo de agosto
 * depende del de julio— y guardarlas obligaría a reescribir todos los meses siguientes
 * cada vez que alguien corrige uno viejo. Peor: si esa reescritura falla a la mitad, la
 * tabla queda con meses que no cuadran entre sí y nada lo dice. Se calcula al leer, con
 * `calcularSerieCep`, que es una función pura y siempre da lo mismo.
 *
 * Lo que sale de las órdenes de pago tampoco está aquí: se suma de `cep_ordenes_pago` en
 * el momento, para que registrar una orden actualice el mes sin tener que acordarse de
 * recalcular nada.
 */
@Entity("cep_meses")
// Un solo CEP por municipio y mes. La restricción va en la base y no solo en el
// servicio: dos filas del mismo mes duplicarían los ingresos sin que nada se queje.
@Unique("uq_cep_mes", ["companyId", "periodo"])
export class CepMes {
  @PrimaryGeneratedColumn({ name: "cep_id" })
  cepId: number;

  @Column({ name: "company_id", type: "int" })
  companyId: number;

  /** 'YYYY-MM'. */
  @Column({ name: "periodo", type: "varchar", length: 7 })
  periodo: string;

  /**
   * Lo capturado del extracto, con la forma de `CepCapturado`.
   *
   * Va en jsonb y no en cuarenta columnas porque el formato del extracto cambia: en 2015
   * había cuatro comercializadores y hoy hay ocho. Agregar uno tiene que ser una entrada
   * más en PAGADORES, no una migración sobre una tabla con la plata de once municipios.
   */
  @Column({ name: "capturado", type: "jsonb", default: () => "'{}'::jsonb" })
  capturado: Record<string, any>;

  /**
   * La nota de quien concilió, cuando el mes tiene algo que explicar.
   *
   * Existe porque el CEP marca meses como «Revisar» y la razón casi siempre es una sola
   * frase —«falta el extracto de Vatia», «doble giro de la concesión»— que hoy se pierde
   * en un correo. Sin ella el mes siguiente vuelve a preguntarse lo mismo.
   */
  @Column({ name: "nota", type: "text", nullable: true })
  nota: string | null;

  @Column({ name: "updated_by", type: "int", nullable: true })
  updatedBy: number | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
