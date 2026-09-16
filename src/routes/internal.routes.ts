import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { getSupabaseAdmin } from '../config/supabase';
import { success, error } from '../utils/response';

export const internalRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

internalRoutes.use('*', async (c, next) => {
  const secretHeader = c.req.header('X-Internal-Secret');
  if (!secretHeader || secretHeader !== c.env.INTERNAL_SERVICE_SECRET) {
    return error(c, 403, 'Acceso inter-servicio no autorizado');
  }
  await next();
});

// Endpoint para que MS3 transicione informes
internalRoutes.patch('/informes/:id/estado', async (c) => {
  const informeId = c.req.param('id');
  const body = await c.req.json().catch(() => null);

  if (!body || !body.nuevo_estado || !body.usuario_id) {
    return error(c, 400, 'Faltan parámetros requeridos');
  }

  const supabase = getSupabaseAdmin(c.env);

  const { data: actual, error: findError } = await supabase
    .from('informes')
    .select('estado')
    .eq('id', informeId)
    .single();

  if (findError || !actual) {
    return error(c, 404, 'Informe no encontrado');
  }

  const { data: updated, error: updateError } = await supabase
    .from('informes')
    .update({ estado: body.nuevo_estado })
    .eq('id', informeId)
    .select()
    .single();

  if (updateError) {
    return error(c, 422, 'Transición rechazada por la base de datos', updateError.message);
  }

  await supabase.from('informe_historial_estados').insert({
    informe_id: informeId,
    estado_anterior: actual.estado,
    estado_nuevo: body.nuevo_estado,
    cambiado_por: body.usuario_id,
    comentario: body.comentario || 'Transición efectuada por revisión académica',
  });

  return success(c, updated, 'Estado actualizado exitosamente');
});