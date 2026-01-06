/**
 * Payload del token JWT
 */
export interface JwtPayload {
  sub: number;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Payload del refresh token
 */
export interface RefreshTokenPayload extends JwtPayload {
  tokenId?: string;
}
