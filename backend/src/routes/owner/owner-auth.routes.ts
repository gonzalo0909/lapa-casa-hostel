// lapa-casa-hostel/backend/src/routes/owner/owner-auth.routes.ts
//
// Login de administradores de apartamento (0031_apartment_owner_login.sql).
// Separado del admin único (admin-auth.routes.ts) a propósito: misma
// razón que ese archivo -- se monta ANTES del middleware de auth para
// poder pedir un token sin tener uno todavía, con su propia cookie
// (lch_owner) para no pisar una sesión de admin en el mismo navegador.
//
// La contraseña la genera la plataforma al crear el administrador (ver
// apartment-owners.routes.ts) y viaja una sola vez en texto plano en esa
// respuesta -- acá solo se valida contra el hash. must_change_password
// obliga a cambiarla en el primer login antes de poder usar el resto del
// panel (el frontend decide qué mostrar según ese flag en la respuesta).

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { verifyPassword, hashPassword, generateToken } from '../../utils/encryption';
import { authenticateOwnerToken } from '../../middleware/auth';
import { redisCache } from '../../config/redis';
import { logger } from '../../utils/logger';
import { ApiResponse } from '../../utils/responses';
import { validate } from '../../middleware/validation';

const REVOKED_PREFIX = 'revoked_token:';

const LoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const ChangePasswordSchema = z.object({
  newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

const router = Router();

// ─── POST /owner-auth — login ────────────────────────────────────────────────

router.post('/', validate(LoginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as z.infer<typeof LoginSchema>;

    const owner = await prisma.apartmentOwner.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    // mismo mensaje genérico si no existe el email o si la contraseña no
    // matchea -- no confirmar qué emails están registrados
    if (!owner || !owner.isActive || !owner.passwordHash) {
      logger.warn('Intento de login de administrador fallido', { email });
      res.status(401).json(ApiResponse.error('Credenciales inválidas'));
      return;
    }

    const valid = await verifyPassword(password, owner.passwordHash);
    if (!valid) {
      logger.warn('Intento de login de administrador fallido', { email });
      res.status(401).json(ApiResponse.error('Credenciales inválidas'));
      return;
    }

    await prisma.apartmentOwner.update({
      where: { id: owner.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = {
      userId: owner.id,
      email: owner.email,
      role: 'owner' as const,
      ownerId: owner.id,
    };

    const token = generateToken(payload, process.env.JWT_EXPIRES_IN || '24h');

    logger.info('Login de administrador exitoso', { ownerId: owner.id });

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('lch_owner', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.status(200).json(
      ApiResponse.success(
        {
          fullName: owner.fullName,
          email: owner.email,
          mustChangePassword: owner.mustChangePassword,
        },
        'Login exitoso'
      )
    );
  } catch (error) {
    next(error);
  }
});

// ─── POST /owner-auth/change-password ────────────────────────────────────────

router.post(
  '/change-password',
  authenticateOwnerToken,
  validate(ChangePasswordSchema),
  async (req, res, next) => {
    try {
      const { newPassword } = req.body as z.infer<typeof ChangePasswordSchema>;
      const ownerId = req.user?.ownerId;
      if (!ownerId) {
        res.status(401).json(ApiResponse.error('Access token required'));
        return;
      }

      const passwordHash = await hashPassword(newPassword);

      await prisma.apartmentOwner.update({
        where: { id: ownerId },
        data: { passwordHash, mustChangePassword: false },
      });

      logger.info('Administrador cambió su contraseña', { ownerId });

      res.status(200).json(ApiResponse.success(null, 'Contraseña actualizada'));
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /owner-auth/logout ──────────────────────────────────────────────────

router.post('/logout', authenticateOwnerToken, async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const cookieToken = (req.cookies as Record<string, string> | undefined)?.['lch_owner'];
    const token = (authHeader && authHeader.split(' ')[1]) || cookieToken;

    if (token) {
      await redisCache.set(`${REVOKED_PREFIX}${token}`, '1', 86400);
    }

    res.clearCookie('lch_owner', { httpOnly: true, sameSite: 'strict', path: '/' });

    logger.info('Logout de administrador', { ownerId: req.user?.ownerId });
    res.status(200).json(ApiResponse.success(null, 'Sesión cerrada correctamente'));
  } catch (error) {
    next(error);
  }
});

export const ownerAuthRouter = router;
