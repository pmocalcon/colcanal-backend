export default () => ({
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    username: process.env.DB_USERNAME || "canalco",
    password: process.env.DB_PASSWORD || "canalco",
    database: process.env.DB_DATABASE || "canalco",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "change-this-secret",
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || "change-this-refresh-secret",
    expiresIn: parseInt(process.env.JWT_EXPIRATION || "3600", 10),
    refreshExpiresIn: parseInt(
      process.env.JWT_REFRESH_EXPIRATION || "604800",
      10,
    ),
  },
  corporateEmailDomain:
    process.env.CORPORATE_EMAIL_DOMAIN || "@canalcongroup.com",
  // Correos que nunca son forzados a cambiar la contraseña temporal.
  // Coma-separados. Pensado para cuentas de representación (p. ej. la de la
  // representante legal) cuya clave se conserva por decisión de la empresa.
  passwordExemptEmails: (
    process.env.PASSWORD_EXEMPT_EMAILS ||
    "gerencia@canalcongroup.com,gerencia1@canalcongroup.com"
  )
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || "60", 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || "10", 10),
  },
});
