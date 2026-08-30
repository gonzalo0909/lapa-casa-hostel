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

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'staff' | 'guest';
}

const ENCRYPTION_CONFIG = {
  jwtExpiration: '24h',
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (
  payload: JWTPayload,
  expiresIn: string = ENCRYPTION_CONFIG.jwtExpiration
): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
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
