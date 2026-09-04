// lapa-casa-hostel/backend/src/middleware/csrf.ts
//
// Patrón "doble cookie" para los paneles de admin/owner. sameSite:'strict'
// en la cookie de sesión (ver admin-auth.routes.ts/owner-auth.routes.ts) ya
// bloquea que un sitio de terceros haga que el navegador la mande sola en
// una request cross-site -- esto es una segunda capa: el login además emite
// una cookie NO httpOnly con un token random, que el frontend debe leer y
// reenviar en el header `x-csrf-token`. Un sitio de terceros puede lograr
// que el navegador dispare la request, pero no puede LEER la cookie CSRF
// para copiarla al header (same-origin policy se lo impide), así que el
// header nunca va a coincidir.

import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function verifyCsrf(cookieName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    const cookieToken = (req.cookies as Record<string, string> | undefined)?.[cookieName];
    const headerToken = req.headers['x-csrf-token'];

    if (
      typeof cookieToken !== 'string' ||
      typeof headerToken !== 'string' ||
      !safeCompare(cookieToken, headerToken)
    ) {
      res.status(403).json({
        success: false,
        error: 'CSRF token inválido o ausente',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}
