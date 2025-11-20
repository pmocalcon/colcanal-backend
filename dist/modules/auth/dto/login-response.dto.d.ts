export declare class UserResponseDto {
    userId: number;
    email: string;
    nombre: string;
    cargo: string;
    rolId: number;
    nombreRol: string;
}
export declare class LoginResponseDto {
    accessToken: string;
    refreshToken: string;
    user: UserResponseDto;
}
