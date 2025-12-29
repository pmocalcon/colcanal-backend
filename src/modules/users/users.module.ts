import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { Authorization } from '../../database/entities/authorization.entity';
import { Permission } from '../../database/entities/permission.entity';
import { RolePermission } from '../../database/entities/role-permission.entity';
import { RoleGestion } from '../../database/entities/role-gestion.entity';
import { UserGestion } from '../../database/entities/user-gestion.entity';
import { Gestion } from '../../database/entities/gestion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      Authorization,
      Permission,
      RolePermission,
      RoleGestion,
      UserGestion,
      Gestion,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
