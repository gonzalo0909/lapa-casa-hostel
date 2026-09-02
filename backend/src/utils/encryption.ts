// lapa-casa-hostel/backend/src/utils/encryption.ts
//
// FIX (auditoría 2026-08-30): se eliminaron 13 exports sin ningún uso en
// todo el repo (hashPassword, verifyToken, generateRefreshToken,
// encryptData, decryptData, generateRandomToken, generateApiKey,
// hashData, maskSensitiveData, maskEmail, generateConfirmationCode,
// generateResetToken, verifyResetToken) -- scaffolding de funciones de
// auth/cifrado/reset-de-password que nunca se conectó a ningún flujo
// real (no existe cambio ni reset de contraseña admin: se valida contra
// ADMIN_PASSWORD_HASH vía env var). Quedan solo las 3 en uso real.
//
// hashPassword y generateTempPassword vuelven a agregarse acá (0031_
// apartment_owner_login.sql): a diferencia del admin único, cada
// administrador de apartamento SÍ necesita que la plataforma le genere
// una contraseña real al crearlo (ver apartment-owners.routes.ts).

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'staff' | 'guest' | 'owner';
  ownerId?: string;
}

const ENCRYPTION_CONFIG = {
  jwtExpiration: '24h',
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

// Contraseña temporal legible (evita 0/O/1/l/I -- confusión al transcribirla
// a mano por WhatsApp/email) para el primer login de un administrador nuevo.
// must_change_password fuerza que la reemplace antes de usar el resto del panel.
const TEMP_PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export const generateTempPassword = (length = 12): string => {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += TEMP_PASSWORD_ALPHABET[bytes[i] % TEMP_PASSWORD_ALPHABET.length];
  }
  return result;
};

export const generateToken = (
  payload: JWTPayload,
  expiresIn: string = ENCRYPTION_CONFIG.jwtExpiration
): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {throw new Error('JWT_SECRET not configured');}
  return (jwt.sign as any)(payload, secret, {
    expiresIn,
    issuer: 'lapa-casa-hostel',
    audience: 'lapa-casa-hostel-api',
  });
};

/** Uso interno de verifyHmacSignature -- no se exporta, nada más lo necesita. */
const generateHmacSignature = (data: string, secret: string): string =>
  crypto.createHmac('sha256', secret).update(data).digest('hex');

export const verifyHmacSignature = (data: string, signature: string, secret: string): boolean => {
  const expected = generateHmacSignature(data, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};
