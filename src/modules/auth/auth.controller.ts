import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  LoginResponseDto,
  UserResponseDto,
} from './dto/login-response.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión en el sistema',
    description: `
    Autentica a un usuario con correo electrónico corporativo y contraseña.

    ## Dominios de correo permitidos
    Solo se aceptan correos electrónicos del siguiente dominio corporativo:
    - **@canalcongroup.com** - Canal Con Group

    ## Usuarios de prueba disponibles

    ### 1. Gerencia (Aprueba requisiciones)
    - Email: \`gerencia@canalcongroup.com\`
    - Password: \`Canalco2025!\`
    - Rol: Gerencia

    ### 2. Director Técnico (Revisa y aprueba)
    - Email: \`director.tecnico@canalcongroup.com\`
    - Password: \`Canalco2025!\`
    - Rol: Director Técnico

    ### 3. Analista PMO (Crea requisiciones)
    - Email: \`analista.pmo@canalcongroup.com\`
    - Password: \`Canalco2025!\`
    - Rol: Analista PMO

    ### 4. PQRS El Cerrito (Crea requisiciones)
    - Email: \`pqrs.elcerrito@canalcongroup.com\`
    - Password: \`Canalco2025!\`
    - Rol: PQRS El Cerrito

    ### 5. Compras (Cotiza y gestiona)
    - Email: \`compras@canalcongroup.com\`
    - Password: \`Canalco2025!\`
    - Rol: Compras

    ### 6. Director PMO (Revisa requisiciones)
    - Email: \`director.pmo@canalcongroup.com\`
    - Password: \`Canalco2025!\`
    - Rol: Director PMO

    ## Cómo usar el API con Swagger

    1. **Ejecuta este endpoint** con uno de los usuarios de prueba
    2. **Copia el \`accessToken\`** de la respuesta
    3. **Haz clic en el botón "Authorize"** (candado) en la parte superior de la página
    4. **Pega el token** en el campo "Value" (sin el prefijo "Bearer")
    5. **Haz clic en "Authorize"** y luego en "Close"
    6. **¡Listo!** Ahora puedes probar todos los endpoints protegidos

    ## Tokens generados

    - **accessToken**: Válido por **1 hora**. Usar para todas las peticiones autenticadas.
    - **refreshToken**: Válido por **7 días**. Usar para renovar el accessToken sin volver a hacer login.

    ## Flujo de autenticación

    \`\`\`
    Cliente → POST /auth/login → Servidor
    Servidor → Valida credenciales y dominio de email
    Servidor → Genera accessToken (1h) y refreshToken (7d)
    Servidor → Retorna tokens + información del usuario
    Cliente → Guarda tokens y usa accessToken en header Authorization
    \`\`\`
    `,
  })
  @ApiResponse({
    status: 200,
    description:
      'Autenticación exitosa. Usa el accessToken para autorizar otras peticiones.',
    type: LoginResponseDto,
    schema: {
      example: {
        accessToken:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiZ2VyZW5jaWFAY2FuYWxjby5jb20iLCJpYXQiOjE3NjIzMTEwMjAsImV4cCI6MTc2MjMxNDYyMH0...',
        refreshToken:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiZ2VyZW5jaWFAY2FuYWxjby5jb20iLCJpYXQiOjE3NjIzMTEwMjAsImV4cCI6MTc2MjkxNTgyMH0...',
        user: {
          userId: 1,
          email: 'gerencia@canalco.com',
          nombre: 'Juan Carlos Rodríguez',
          cargo: 'Gerente General',
          rolId: 1,
          nombreRol: 'Gerencia',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Solicitud inválida. Puede deberse a:\n' +
      '- Dominio de correo no permitido (debe ser @canalco.com o @alumbrado.com)\n' +
      '- Formato de email inválido\n' +
      '- Contraseña muy corta (mínimo 6 caracteres)\n' +
      '- Campos obligatorios faltantes',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'El correo electrónico corporativo debe terminar en @canalco.com o @alumbrado.com',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description:
      'Credenciales inválidas. El correo o la contraseña son incorrectos',
    schema: {
      example: {
        statusCode: 401,
        message: 'Credenciales inválidas',
        error: 'Unauthorized',
      },
    },
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiOperation({
    summary: 'Renovar token de acceso',
    description: `
    Obtiene un nuevo \`accessToken\` utilizando un \`refreshToken\` válido.

    ## ¿Cuándo usar este endpoint?

    Usa este endpoint cuando:
    - Tu \`accessToken\` haya expirado (después de 1 hora)
    - Recibas un error 401 en otros endpoints
    - Quieras mantener la sesión del usuario sin pedirle que vuelva a hacer login

    ## Cómo funciona

    1. Envía el \`refreshToken\` que obtuviste en el login
    2. El servidor valida que el token sea válido y no haya expirado
    3. Si es válido, genera un nuevo \`accessToken\`
    4. Retorna el nuevo \`accessToken\` y un nuevo \`refreshToken\`

    ## Nota importante

    - El \`refreshToken\` es válido por **7 días**
    - Cada vez que lo uses, recibirás un nuevo \`refreshToken\`
    - Si el \`refreshToken\` ha expirado, el usuario deberá hacer login nuevamente

    ## Flujo recomendado

    \`\`\`
    Cliente intenta hacer petición → Recibe 401 Unauthorized
    Cliente → POST /auth/refresh con refreshToken
    Servidor → Valida refreshToken
    Servidor → Genera nuevo accessToken y refreshToken
    Cliente → Actualiza tokens guardados
    Cliente → Reintenta petición original con nuevo accessToken
    \`\`\`
    `,
  })
  @ApiResponse({
    status: 200,
    description:
      'Token renovado exitosamente. Usa el nuevo accessToken para continuar.',
    type: LoginResponseDto,
    schema: {
      example: {
        accessToken:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiZ2VyZW5jaWFAY2FuYWxjby5jb20iLCJpYXQiOjE3NjIzMTUwMjAsImV4cCI6MTc2MjMxODYyMH0...',
        refreshToken:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiZ2VyZW5jaWFAY2FuYWxjby5jb20iLCJpYXQiOjE3NjIzMTUwMjAsImV4cCI6MTc2MjkyMDgyMH0...',
        user: {
          userId: 1,
          email: 'gerencia@canalco.com',
          nombre: 'Juan Carlos Rodríguez',
          cargo: 'Gerente General',
          rolId: 1,
          nombreRol: 'Gerencia',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description:
      'Token de refresco inválido o expirado. El usuario debe hacer login nuevamente.',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid or expired refresh token',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Solicitud inválida. El refreshToken es requerido.',
    schema: {
      example: {
        statusCode: 400,
        message: ['El refresh token es obligatorio'],
        error: 'Bad Request',
      },
    },
  })
  async refresh(
    @CurrentUser() user: User,
    @Body() refreshTokenDto: RefreshTokenDto,
  ) {
    return this.authService.refreshToken(user);
  }

  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener perfil del usuario autenticado',
    description: `
    Retorna la información completa del perfil del usuario autenticado actualmente.

    ## ¿Para qué sirve este endpoint?

    - Obtener información actualizada del usuario después del login
    - Verificar que el token de autenticación es válido
    - Consultar el rol y permisos del usuario actual
    - Mostrar información del usuario en la interfaz (nombre, cargo, rol)

    ## Cómo probar este endpoint en Swagger

    1. **Hacer login primero**: Ejecuta \`POST /auth/login\` con uno de los usuarios de prueba
    2. **Copiar el accessToken** de la respuesta del login
    3. **Autorizar**: Haz clic en el botón **"Authorize"** (candado) en la parte superior
    4. **Pegar el token**: En el campo "Value", pega el accessToken (sin "Bearer")
    5. **Cerrar**: Haz clic en "Authorize" y luego en "Close"
    6. **Probar**: Haz clic en "Try it out" y "Execute" en este endpoint

    ## Información retornada

    El endpoint retorna:
    - **userId**: ID único del usuario
    - **email**: Correo corporativo
    - **nombre**: Nombre completo
    - **cargo**: Puesto en la organización
    - **rolId**: ID del rol asignado
    - **nombreRol**: Nombre del rol (Gerencia, Director PMO, etc.)

    ## Casos de uso

    \`\`\`typescript
    // Frontend: Obtener información del usuario al cargar la aplicación
    async function loadUserProfile() {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': \`Bearer \${token}\`
        }
      });
      const profile = await response.json();
      // Mostrar nombre y rol en la interfaz
      console.log(profile.nombre, profile.nombreRol);
    }
    \`\`\`
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil del usuario retornado exitosamente',
    type: UserResponseDto,
    schema: {
      example: {
        userId: 1,
        email: 'gerencia@canalco.com',
        nombre: 'Juan Carlos Rodríguez',
        cargo: 'Gerente General',
        rolId: 1,
        nombreRol: 'Gerencia',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description:
      'No autorizado. Puede deberse a:\n' +
      '- Token de acceso faltante en el header Authorization\n' +
      '- Token de acceso inválido o malformado\n' +
      '- Token de acceso expirado (válido por 1 hora)\n' +
      '- Usuario no encontrado o deshabilitado',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid or expired token',
        error: 'Unauthorized',
      },
    },
  })
  async getProfile(@CurrentUser() user: User) {
    return this.authService.getProfile(user.userId);
  }

  @Get('modules')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener módulos disponibles para el usuario',
    description: `
    Retorna todos los módulos del sistema con un flag indicando si el usuario tiene acceso.

    ## Módulos del sistema

    El sistema tiene los siguientes módulos:
    1. **Dashboard** - Pantalla principal
    2. **Compras** - Gestión de requisiciones, cotizaciones, órdenes y recepciones
    3. **Inventarios** - Gestión de inventario (próximamente)
    4. **Reportes** - Reportes y análisis (próximamente)
    5. **Usuarios** - Administración de usuarios
    6. **Proveedores** - Gestión de proveedores
    7. **Auditorías** - Registros de auditoría
    8. **Notificaciones** - Sistema de notificaciones

    ## Respuesta

    Cada módulo incluye:
    - **gestionId**: ID del módulo
    - **nombre**: Nombre del módulo
    - **slug**: Slug único para routing
    - **icono**: Nombre del ícono de lucide-react
    - **hasAccess**: true si el usuario tiene acceso, false si no

    ## Uso en el frontend

    Los módulos con \`hasAccess: false\` deben mostrarse con opacidad reducida
    y al hacer clic mostrar un mensaje: "No tiene permisos para acceder a este módulo."
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de módulos con indicador de acceso',
    schema: {
      example: [
        {
          gestionId: 1,
          nombre: 'Dashboard',
          slug: 'dashboard',
          icono: 'LayoutDashboard',
          hasAccess: true,
        },
        {
          gestionId: 2,
          nombre: 'Compras',
          slug: 'compras',
          icono: 'ShoppingCart',
          hasAccess: true,
        },
        {
          gestionId: 3,
          nombre: 'Inventarios',
          slug: 'inventarios',
          icono: 'Package',
          hasAccess: false,
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  async getUserModules(@CurrentUser() user: User) {
    return this.authService.getUserModules(user.userId);
  }
}
