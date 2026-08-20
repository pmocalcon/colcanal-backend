import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AprobacionesController } from './aprobaciones.controller';
import { AprobacionesService } from './aprobaciones.service';
import { User } from '../../database/entities/user.entity';

/**
 * Bandeja única de Gerencia.
 *
 * No importa ningún otro módulo: lee las tablas directamente y devuelve listas.
 * Es lo que le permite reunir seis flujos de cuatro módulos sin encadenarlos
 * entre sí ni arriesgar dependencias circulares.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AprobacionesController],
  providers: [AprobacionesService],
})
export class AprobacionesModule {}
