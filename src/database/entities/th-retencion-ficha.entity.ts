import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Talento humano — la tabla de retenciones: lo que cada persona puede restar de su
 * base gravable durante el año (Procedimiento 1, Art. 383 E.T.).
 *
 * Tabla nueva y AISLADA, sin llaves foráneas, igual que las demás `th_*`.
 *
 * Es **anual**, como el certificado de deducciones que el empleado entrega en enero y
 * que es el soporte de estas cifras ante la DIAN. Una fila por persona y año.
 *
 * Aquí NO se guarda nada que la nómina ya calcule. Los aportes obligatorios —salud,
 * pensión y fondo de solidaridad—, que son los ingresos no constitutivos de renta, se
 * toman de la liquidación del mes: repetirlos acá sería tener la misma cifra en dos
 * sitios y que un día dejaran de coincidir.
 *
 * @see retencion-fuente.ts — el cálculo que consume esta ficha.
 */
@Entity("th_retencion_fichas")
@Index("IDX_th_retencion_persona_anio", ["personaId", "anio"], { unique: true })
export class ThRetencionFicha {
  @PrimaryGeneratedColumn({ name: "retencion_id" })
  retencionId: number;

  /** Id plano de la persona, sin relación, como el resto de las tablas `th_*`. */
  @Column({ name: "persona_id", type: "int" })
  personaId: number;

  @Column({ type: "int" })
  anio: number;

  /**
   * Cómo se determina la deducción por intereses de vivienda o leasing habitacional.
   *
   * "FIJO" es la cifra del certificado bancario; "PORCENTAJE" liquida contra el total
   * devengado del mes. La hoja del contador lo anota al margen —«Valor fijo» en unos,
   * «es el 10 % del total devengado» en otros— porque cambia por persona.
   */
  @Column({ name: "vivienda_modo", type: "varchar", length: 12, default: "FIJO" })
  viviendaModo: "FIJO" | "PORCENTAJE";

  /** El valor mensual cuando el modo es FIJO. Tope: 100 UVT. */
  @Column({ name: "vivienda_valor", type: "numeric", precision: 14, scale: 2, default: 0 })
  viviendaValor: string;

  /** El porcentaje sobre el total devengado cuando el modo es PORCENTAJE. */
  @Column({ name: "vivienda_porcentaje", type: "numeric", precision: 6, scale: 2, default: 0 })
  viviendaPorcentaje: string;

  /** Pagos por dependientes. Tope: 32 UVT mensuales. */
  @Column({ type: "numeric", precision: 14, scale: 2, default: 0 })
  dependientes: string;

  /** Salud y medicina prepagada. Tope: 16 UVT mensuales. */
  @Column({ name: "medicina_prepagada", type: "numeric", precision: 14, scale: 2, default: 0 })
  medicinaPrepagada: string;

  /** Renta exenta: aportes a fondos de pensiones voluntarias (Art. 126-1 E.T.). */
  @Column({ name: "pensiones_voluntarias", type: "numeric", precision: 14, scale: 2, default: 0 })
  pensionesVoluntarias: string;

  /** Renta exenta: aportes a cuentas AFC (Art. 126-4 E.T.). */
  @Column({ type: "numeric", precision: 14, scale: 2, default: 0 })
  afc: string;

  /**
   * Si es false no se le practica retención y el cálculo se salta entero.
   *
   * Existe porque la fórmula ya devuelve cero para quien no llega al umbral: apagarlo
   * a mano es para los casos que la fórmula no puede saber, y así queda constancia de
   * que fue una decisión y no un descuido.
   */
  @Column({ type: "boolean", default: true })
  sujeto: boolean;

  @Column({ type: "text", nullable: true })
  observaciones: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
