// lapa-casa-hostel/backend/src/routes/admin/admin-auth.routes.ts
// ventana4 (bloque 2)
//
// Login del admin único, separado de admin.routes.ts a propósito: se
// monta ANTES del middleware authenticateToken en routes/index.ts (para
// poder pedir un token sin tener uno todavía), mientras que el resto de
// /admin/* sigue protegido.

import { Router } from 'express';
import { z } from 'zod';
import {
  verifyPassword,
  generateToken,
  durationToMs,
  durationToSeconds,
  generateCsrfToken,
} from '../../utils/encryption';
import { authenticateToken } from '../../middleware/auth';
import { verifyCsrf } from '../../middleware/csrf';
import { redisCache } from '../../config/redis';
import { logger } from '../../utils/logger';
import { ApiResponse } from '../../utils/responses';
import { validate } from '../../middleware/validation';

const LoginSchema = z.object({
  password: z.string().min(1),
});

// M-03: prefijo para tokens revocados en Redis (TTL = expiración del token)
const REVOKED_PREFIX = 'revoked_token:';

const router = Router();

router.post('/', validate(LoginSchema), async (req, res, next) => {
  try {
    const { password } = req.body as z.infer<typeof LoginSchema>;

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
      email: process.env.ADMIN_EMAIL || 'lapalandiarj@gmail.com',
      role: 'admin' as const,
    };

    const token = generateToken(payload, process.env.JWT_EXPIRES_IN || '24h');

    logger.info('Login admin exitoso');

    // M-02: emitir el JWT como httpOnly cookie — inaccesible desde JS,
    // elimina el vector XSS de robo de token desde localStorage.
    const isProd = process.env.NODE_ENV === 'production';
    const cookieMaxAge = durationToMs(process.env.JWT_EXPIRES_IN || '24h', 24 * 60 * 60 * 1000);
    res.cookie('lch_admin', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: cookieMaxAge,
      path: '/',
    });

    // Cookie CSRF (patrón doble cookie, ver middleware/csrf.ts) -- a
    // propósito NO httpOnly, el frontend necesita leerla para reenviarla en
    // el header x-csrf-token de cada request que modifica datos.
    res.cookie('lch_admin_csrf', generateCsrfToken(), {
      httpOnly: false,
      secure: isProd,
      sameSite: 'strict',
      maxAge: cookieMaxAge,
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
    res
      .status(200)
      .json(
        ApiResponse.success({ expiresIn: process.env.JWT_EXPIRES_IN || '24h' }, 'Login exitoso'),
      );
  } catch (error) {
    next(error);
  }
});

// M-03: logout — revoca el token actual y el refreshToken si se envía.
// M-02: también limpia la cookie httpOnly (el token puede venir de ahí).
// El token queda en lista negra en Redis hasta que expire naturalmente.
router.post('/logout', authenticateToken, verifyCsrf('lch_admin_csrf'), async (req, res, next) => {
  try {
    // El token puede llegar como Bearer header (scripts/API) o como cookie httpOnly (panel admin)
    const authHeader = req.headers['authorization'];
    const cookieToken = (req.cookies as Record<string, string> | undefined)?.['lch_admin'];
    const token = (authHeader && authHeader.split(' ')[1]) || cookieToken;

    if (token) {
      // TTL de la blacklist = TTL real del JWT (auditoría 17 secciones,
      // sección 15): antes estaba fijo en 86400s (24h) sin importar
      // JWT_EXPIRES_IN -- si ese valor se configura a más de 24h, el token
      // "revocado" volvía a ser válido apenas la entrada de Redis expiraba,
      // aunque el JWT real siguiera vigente.
      await redisCache.set(
        `${REVOKED_PREFIX}${token}`,
        '1',
        durationToSeconds(process.env.JWT_EXPIRES_IN || '24h', 86400),
      );
    }

    const { refreshToken } = req.body as { refreshToken?: string };
    if (refreshToken) {
      // Vestigial: no existe ningún endpoint /refresh que emita ni consuma
      // este token (ver comentario en el login de arriba) -- se mantiene el
      // no-op por compatibilidad hacia atrás si algún cliente viejo todavía
      // lo envía, sin agregarle lógica nueva.
      await redisCache.set(`${REVOKED_PREFIX}${refreshToken}`, '1', 7 * 86400);
    }

    // M-02: eliminar la cookie httpOnly del navegador
    res.clearCookie('lch_admin', { httpOnly: true, sameSite: 'strict', path: '/' });
    res.clearCookie('lch_admin_csrf', { httpOnly: false, sameSite: 'strict', path: '/' });

    logger.info('Logout admin — token revocado');
    res.status(200).json(ApiResponse.success(null, 'Sesión cerrada correctamente'));
  } catch (error) {
    next(error);
  }
});

export const adminAuthRouter = router;
export { REVOKED_PREFIX };
