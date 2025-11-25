import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../database/entities/user.entity';
import { Gestion } from '../../database/entities/gestion.entity';
import { RoleGestion } from '../../database/entities/role-gestion.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Gestion)
    private gestionRepository: Repository<Gestion>,
    @InjectRepository(RoleGestion)
    private roleGestionRepository: Repository<RoleGestion>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    try {
      const { email, password } = loginDto;

      // Validate corporate email domain
      const allowedDomains = ['@canalco.com', '@alumbrado.com', '@canalcongroup.com'];
      const emailDomain = '@' + email.split('@')[1];

      if (!allowedDomains.includes(emailDomain)) {
        throw new BadRequestException(
          `El correo electrónico corporativo debe terminar en ${allowedDomains.join(', ')}`,
        );
      }

      // Find user with role
      const user = await this.userRepository.findOne({
        where: { email },
        relations: ['role'],
      });

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user is active
      if (!user.estado) {
        throw new UnauthorizedException('User account is inactive');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate tokens
      const payload = { sub: user.userId, email: user.email };
      const accessToken = this.jwtService.sign(payload, {
        secret: this.configService.get('jwt.secret') || 'change-this-secret',
        expiresIn: `${this.configService.get('jwt.expiresIn') || 3600}s`,
      });

      const refreshToken = this.jwtService.sign(payload, {
        secret:
          this.configService.get('jwt.refreshSecret') ||
          'change-this-refresh-secret',
        expiresIn: `${this.configService.get('jwt.refreshExpiresIn') || 604800}s`,
      });

      // Hash and store refresh token
      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
      await this.userRepository.update(user.userId, {
        refreshToken: hashedRefreshToken,
      });

      return {
        accessToken,
        refreshToken,
        user: {
          userId: user.userId,
          email: user.email,
          nombre: user.nombre,
          cargo: user.cargo,
          rolId: user.rolId,
          nombreRol: user.role.nombreRol,
        },
      };
    } catch (error) {
      // If it's already an HTTP exception, re-throw it
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      // For any other error, throw a generic BadRequestException
      throw new BadRequestException('An error occurred during login');
    }
  }

  async refreshToken(user: User) {
    const payload = { sub: user.userId, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.secret'),
      expiresIn: `${this.configService.get('jwt.expiresIn')}s`,
    });

    return {
      accessToken,
    };
  }

  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { password, refreshToken, ...userWithoutSensitiveData } = user;

    return userWithoutSensitiveData;
  }

  async getUserModules(userId: number) {
    // Get user with role
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Get all gestiones (modules)
    const allGestiones = await this.gestionRepository.find({
      order: { gestionId: 'ASC' },
    });

    // Get role gestiones for this user's role
    const roleGestiones = await this.roleGestionRepository.find({
      where: { rolId: user.rolId },
    });

    // Create a set of gestionIds that the role has access to
    const allowedGestionIds = new Set(
      roleGestiones.map((rg) => rg.gestionId),
    );

    // Map all gestiones and mark which ones are accessible
    return allGestiones.map((gestion) => ({
      gestionId: gestion.gestionId,
      nombre: gestion.nombre,
      slug: gestion.slug,
      icono: gestion.icono,
      hasAccess: allowedGestionIds.has(gestion.gestionId),
    }));
  }
}
