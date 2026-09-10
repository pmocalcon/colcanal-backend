import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import { CONCEPTOS_ORDEN, TIPOS_ORDEN } from "../cep-conceptos";

const PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Lo digitado de un mes del CEP. */
export class GuardarCepMesDto {
  @ApiProperty({ description: "Municipio" })
  @IsInt()
  companyId: number;

  @ApiProperty({ example: "2026-08", description: "Mes del CEP, YYYY-MM" })
  @Matches(PERIODO, { message: "El periodo va como YYYY-MM." })
  periodo: string;

  /**
   * Se valida como objeto y no campo por campo a propósito.
   *
   * Las casillas del CEP son la forma del extracto de la fiducia, no un contrato con el
   * cliente: en 2015 había cuatro comercializadores y hoy hay ocho. Enumerarlas aquí
   * obligaría a tocar el DTO cada vez que entre uno nuevo. La forma la impone
   * `capturadoVacio()` al guardar, que rellena lo que falte y descarta lo que sobre.
   */
  @ApiProperty({ description: "Las casillas digitadas del extracto" })
  @IsObject()
  capturado: Record<string, any>;

  @ApiPropertyOptional({ description: "Por qué este mes está como está" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  nota?: string;
}

/** Una orden de pago de la fiducia. */
export class GuardarOrdenPagoDto {
  @ApiProperty({ description: "Municipio" })
  @IsInt()
  companyId: number;

  @ApiProperty({ example: "2026-08", description: "Mes del CEP al que se imputa" })
  @Matches(PERIODO, { message: "El periodo va como YYYY-MM." })
  periodo: string;

  @ApiProperty({ example: "2026-08-11", description: "Día en que la fiducia giró" })
  @IsDateString()
  fecha: string;

  @ApiProperty({ description: "Valor girado" })
  @IsNumber()
  valor: number;

  /**
   * El concepto se valida contra la lista cerrada.
   *
   * Es lo que empareja la orden con su columna del CEP. Una orden con el concepto
   * escrito de otra forma no suma en ninguna parte y no se queja: por eso no se acepta
   * texto libre.
   */
  @ApiProperty({ enum: CONCEPTOS_ORDEN })
  @IsIn(CONCEPTOS_ORDEN as string[], {
    message: `El concepto tiene que ser uno de: ${CONCEPTOS_ORDEN.join(", ")}`,
  })
  concepto: string;

  @ApiPropertyOptional({ enum: TIPOS_ORDEN })
  @IsOptional()
  @IsIn(TIPOS_ORDEN as unknown as string[])
  tipo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  numeroOrden?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  detalle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tercero?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  numeroOrdenMunicipio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaOrden?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaRecepcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaIngresoCuenta?: string;
}

/**
 * Los saldos con los que arranca un municipio.
 *
 * Se manda entero y no por partes: son cinco cifras que se leen del mismo renglón del
 * Excel, y guardar tres de las cinco deja los acumulados corridos sin que nada avise.
 */
export class GuardarArranqueCepDto {
  @ApiProperty({ description: "Municipio" })
  @IsInt()
  companyId: number;

  @ApiProperty({ example: "2026-01", description: "Primer mes que lleva el sistema" })
  @Matches(PERIODO, { message: "El periodo va como YYYY-MM." })
  desde: string;

  @ApiProperty({ description: "Saldo acumulado del mes anterior al arranque" })
  @IsNumber()
  saldoAcumulado: number;

  @ApiProperty({ description: "Egresos pendientes acumulados del mes anterior" })
  @IsNumber()
  egresosPendientesAcumulado: number;

  @ApiProperty({ description: "Saldo final acumulado del mes anterior" })
  @IsNumber()
  saldoFinalAcumulado: number;

  @ApiProperty({ description: "Rendimientos acumulados del mes anterior" })
  @IsNumber()
  rendimientosAcumulados: number;

  @ApiProperty({ description: "Saldo del extracto del mes anterior al arranque" })
  @IsNumber()
  saldoFiduciaAnterior: number;
}
