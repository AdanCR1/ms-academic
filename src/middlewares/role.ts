import type { MiddlewareHandler } from 'hono';
import type { Env, Variables, UserRole } from '../types';
import { error } from '../utils/response';

export const requireRole = (
  allowedRoles: UserRole[]
): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> => {
  return async (c, next) => {
    const user = c.get('user');
    if (!user || !allowedRoles.includes(user.rol)) {
      return error(c, 403, 'Permisos insuficientes para este recurso');
    }
    await next();
  };
};