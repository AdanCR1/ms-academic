import type { MiddlewareHandler } from 'hono';
import type { Env, Variables, UserRole } from '../types';
import { error } from '../utils/response';

export const authMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (
  c,
  next
) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(c, 401, 'Token de autorización requerido');
  }

  const token = authHeader.substring(7);

  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return error(c, 401, 'Formato de JWT inválido');
    }

    // Decodificación segura en Cloudflare Workers
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const decodedStr = atob(padded);
    const payload = JSON.parse(decodedStr);

    const userId = payload.sub;

    if (!userId) {
      return error(c, 401, 'El token no contiene un identificador de usuario (sub)');
    }

    // URL base del microservicio de autenticación
    const rawBase = c.env?.MS_AUTH_URL;
    const fallbackBase = 'http://127.0.0.1:8787';
    const baseUrl = (rawBase || fallbackBase).trim().replace(/\/+$/, '');

    const fullPath = `${baseUrl}/internal/users/${encodeURIComponent(String(userId))}/validate`;

    let requestUrl: URL;
    try {
      requestUrl = new URL(fullPath);
    } catch {
      return error(c, 401, 'URL interna mal formada');
    }

    if (!c.env?.INTERNAL_SERVICE_SECRET) {
      return error(c, 500, 'Configuración incompleta');
    }

    const res = await fetch(requestUrl.toString(), {
      method: 'GET',
      headers: {
        'X-Internal-Secret': c.env.INTERNAL_SERVICE_SECRET,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      // AGREGA ESTO PARA DIAGNÓSTICO
      const errorDetails = await res.text();
      console.log(`[Fetch Error] Status: ${res.status}, URL: ${requestUrl.toString()}, Body: ${errorDetails}`);

      return error(c, 403, 'Usuario no autorizado o inactivo en el sistema');
    }

    const resJson = (await res.json()) as { success: boolean; data: any };
    const perfil = resJson.data;

    c.set('user', {
      id: perfil.id,
      email: perfil.correo,
      rol: perfil.rol as UserRole,
    });

    await next();
  } catch {
    return error(c, 401, 'Fallo en la validación de identidad');
  }
};