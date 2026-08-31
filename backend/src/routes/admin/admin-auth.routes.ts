// lapa-casa-hostel/backend/src/routes/admin/admin-auth.routes.ts
// ventana4 (bloque 2)
//
// Login del admin único, separado de admin.routes.ts a propósito: se
// monta ANTES del middleware authenticateToken en routes/index.ts (para
// poder pedir un token sin tener uno todavía), mientras que el resto de
// /admin/* sigue protegido.

import { Router } from 'express';
import { verifyPassword, generateToken } from '../../utils/encryption';
import { authenticateToken } from '../../middleware/auth';
import { redisCache } from '../../config/redis';
import { logger } from '../../utils/logger';
import { ApiResponse } from '../../utils/responses';

// M-03: prefijo para tokens revocados en Redis (TTL = expiración del token)
const REVOKED_PREFIX = 'revoked_token:';

// Sección 8 auditoría 17 secciones: convierte '24h'/'7d'/'90d' (mismo
// formato que ya usan JWT_EXPIRES_IN acá y en render.yaml) a milisegundos
// para el maxAge de la cookie -- antes estaba fijo en 90 días sin importar
// el TTL real configurado para el JWT, así que la cookie sobrevivía mucho
// más que el token válido dentro de ella.
function durationToMs(duration: string, fallbackMs: number): number {
  const match = /^(\d+)(d|h|m)$/.exec(duration.trim());
  if (!match) return fallbackMs;
  const value = Number(match[1]);
  const unitMs = { d: 86400000, h: 3600000, m: 60000 }[match[2] as 'd' | 'h' | 'm'];
  return value * unitMs;
}

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { password } = req.body as { password?: string };

    if (!password || typeof password !== 'string') {
      res.status(400).json(ApiResponse.error('password es requerido'));
      return;
    }

    const passwordHash = process.env.ADMIN_PASSWORD_HASH;
    if (!passwordHash) {
      logger.error('ADMIN_PASSWORD_HASH no configurado — login admin deshabilitado');
      res.status(500).json(ApiResponse.error('Login de administrador no configurado'));
      return;
    }

    const valid = await verifyPassword(password, passwordHash);
    if (!valid) {
      logger.warn('Intento de login admin fallido');
      res.status(401).json(ApiResponse.error('Credenciales inválidas'));
      return;
    }

    const payload = {
      userId: 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@lapacasario.com',
      role: 'admin' as const
    };

    const token = generateToken(payload, process.env.JWT_EXPIRES_IN || '24h');

    logger.info('Login admin exitoso');

    // M-02: emitir el JWT como httpOnly cookie — inaccesible desde JS,
    // elimina el vector XSS de robo de token desde localStorage.
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('lch_admin', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: durationToMs(process.env.JWT_EXPIRES_IN || '24h', 24 * 60 * 60 * 1000),
      path: '/',
    });

    // M-06: el JWT viaja solo en la cookie httpOnly de arriba -- devolverlo
    // también acá en el body reintroducía la superficie de robo por XSS que
    // esa cookie buscaba eliminar. Ningún cliente real (el panel admin
    // vanilla JS de backend/src/admin/) lee este campo: confirmado por
    // grep, se autentica solo con la cookie (ver api.js, credentials:
    // 'include' + checkSession()).
    //
    // Tampoco se emite refreshToken: se generaba acá y solo viajaba en este
    // mismo body (nunca en cookie), y no existe ningún endpoint /refresh
    // que lo consuma -- era una pieza de un flujo de refresh que nunca se
    // terminó de construir. El default de JWT_EXPIRES_IN ya se acortó de
    // 90d a 24h (ver sección 8 auditoría 17 secciones) para que un olvido
    // de configurar la env var en el dashboard de Render falle corto, no
    // largo. Un flujo de refresh completo (endpoint dedicado + cookie
    // propia, para poder tener un access token de vida aún más corta sin
    // forzar reloguearse tan seguido) sigue pendiente -- requiere probarlo
    // con sesión de navegador real, no algo verificable solo desde el código.
    res.status(200).json(
      ApiResponse.success(
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' },
        'Login exitoso'
      )
    );
  } catch (error) {
    next(error);
  }
});

// M-03: logout — revoca el token actual y el refreshToken si se envía.
// M-02: también limpia la cookie httpOnly (el token puede venir de ahí).
// El token queda en lista negra en Redis hasta que expire naturalmente.
router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    // El token puede llegar como Bearer header (scripts/API) o como cookie httpOnly (panel admin)
    const authHeader = req.headers['authorization'];
    const cookieToken = (req.cookies as Record<string, string> | undefined)?.['lch_admin'];
    const token = (authHeader && authHeader.split(' ')[1]) || cookieToken;

    if (token) {
      // TTL = 24h (access token) — suficiente para que expire y la entrada se limpie sola
      await redisCache.set(`${REVOKED_PREFIX}${token}`, '1', 86400);
    }

    const { refreshToken } = req.body as { refreshToken?: string };
    if (refreshToken) {
      // TTL = 7d (refresh token)
      await redisCache.set(`${REVOKED_PREFIX}${refreshToken}`, '1', 7 * 86400);
    }

    // M-02: eliminar la cookie httpOnly del navegador
    res.clearCookie('lch_admin', { httpOnly: true, sameSite: 'strict', path: '/' });

    logger.info('Logout admin — token revocado');
    res.status(200).json(ApiResponse.success(null, 'Sesión cerrada correctamente'));
  } catch (error) {
    next(error);
  }
});

export const adminAuthRouter = router;
export { REVOKED_PREFIX };
