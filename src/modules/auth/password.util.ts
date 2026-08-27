import { randomInt } from "crypto";

// Sin caracteres ambiguos (O/0, I/l/1) para que la clave temporal se pueda
// dictar o copiar sin equívocos.
const MAYUS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MINUS = "abcdefghijkmnpqrstuvwxyz";
const NUMS = "23456789";
const TODOS = MAYUS + MINUS + NUMS;

/** Elige un carácter al azar de un alfabeto usando entropía criptográfica. */
function tomar(alfabeto: string): string {
  return alfabeto[randomInt(alfabeto.length)];
}

/**
 * Genera una contraseña temporal fuerte que cumple la regla del sistema
 * (mayúscula + minúscula + número, mínimo 8). Por defecto 12 caracteres.
 * Garantiza al menos uno de cada clase y luego baraja el resto.
 */
export function generarPasswordTemporal(longitud = 12): string {
  const largo = Math.max(8, longitud);
  const base = [tomar(MAYUS), tomar(MINUS), tomar(NUMS)];
  for (let i = base.length; i < largo; i++) {
    base.push(tomar(TODOS));
  }
  // Fisher–Yates con randomInt, para no dejar las clases fijas al inicio.
  for (let i = base.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [base[i], base[j]] = [base[j], base[i]];
  }
  return base.join("");
}
