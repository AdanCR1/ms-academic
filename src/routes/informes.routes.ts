import { Hono } from 'hono';
import type { Env, Variables, ReportStatus } from '../types';
import { getSupabaseAdmin } from '../config/supabase';
import { requireRole } from '../middlewares/role';
import { success, error } from '../utils/response';

export const informesRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// 1. Listar todos los informes (GET /api/v1/informes)
informesRoutes.get('/', async (c) => {
  const supabase = getSupabaseAdmin(c.env);
  
  const { data, error: dbError } = await supabase
    .from('informes')
    .select('*')
    .order('creado_en', { ascending: false });

  if (dbError) {
    return error(c, 500, 'Error al listar los informes', dbError.message);
  }

  return success(c, data);
});

// 2. Obtener un informe específico con sus versiones (GET /api/v1/informes/:id)
informesRoutes.get('/:id', async (c) => {
  const informeId = c.req.param('id');
  const supabase = getSupabaseAdmin(c.env);

  // La consulta trae el informe y anida sus versiones asociadas
  const { data, error: dbError } = await supabase
    .from('informes')
    .select(`
      *,
      versiones:informe_versiones(*)
    `)
    .eq('id', informeId)
    .single();

  if (dbError || !data) {
    return error(c, 404, 'Informe no encontrado');
  }

  // Ordenamos las versiones de más reciente a más antigua
  if (data.versiones) {
    data.versiones.sort((a: any, b: any) => b.numero_version - a.numero_version);
  }

  return success(c, data);
});

// Crear informe
informesRoutes.post('/', requireRole(['investigador', 'auxiliar', 'superadmin']), async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !body.proyecto_id || !body.titulo) {
    return error(c, 400, 'Faltan campos obligatorios: proyecto_id y titulo');
  }

  const user = c.get('user');
  const supabase = getSupabaseAdmin(c.env);

  const { data, error: dbError } = await supabase
    .from('informes')
    .insert({
      proyecto_id: body.proyecto_id,
      titulo: body.titulo,
      estado: 'borrador',
      creador_id: user.id,
    })
    .select()
    .single();

  if (dbError) {
    return error(c, 500, 'Error al crear el informe', dbError.message);
  }

  return success(c, data, 'Informe creado exitosamente', 201);
});

// Transición de estado
informesRoutes.post('/:id/transicion', async (c) => {
  const informeId = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  if (!body || !body.nuevo_estado) {
    return error(c, 400, 'Falta el campo nuevo_estado');
  }

  const user = c.get('user');
  const supabase = getSupabaseAdmin(c.env);

  // Obtener estado actual
  const { data: actual, error: findError } = await supabase
    .from('informes')
    .select('id, estado')
    .eq('id', informeId)
    .single();

  if (findError || !actual) {
    return error(c, 404, 'Informe no encontrado');
  }

  // Actualizar estado (dispara validación de trigger en PostgreSQL)
  const { data: updated, error: updateError } = await supabase
    .from('informes')
    .update({ estado: body.nuevo_estado })
    .eq('id', informeId)
    .select()
    .single();

  if (updateError) {
    return error(c, 422, 'Transición no permitida', updateError.message);
  }

  // Asentar en historial
  await supabase.from('informe_historial_estados').insert({
    informe_id: informeId,
    estado_anterior: actual.estado,
    estado_nuevo: body.nuevo_estado,
    cambiado_por: user.id,
    comentario: body.comentario || null,
  });

  return success(c, updated, 'Estado del informe actualizado');
});

// Registrar nueva versión del informe
informesRoutes.post('/:id/versiones', async (c) => {
  const informeId = c.req.param('id');
  const body = await c.req.json().catch(() => null);

  if (!body || !body.archivo_key_r2 || !body.archivo_nombre || !body.archivo_tamano_bytes) {
    return error(c, 400, 'Faltan datos del archivo: archivo_key_r2, archivo_nombre, archivo_tamano_bytes');
  }

  const user = c.get('user');
  const supabase = getSupabaseAdmin(c.env);

  // Calcular siguiente versión
  const { count } = await supabase
    .from('informe_versiones')
    .select('*', { count: 'exact', head: true })
    .eq('informe_id', informeId);

  const nextVersion = (count || 0) + 1;

  const { data, error: dbError } = await supabase
    .from('informe_versiones')
    .insert({
      informe_id: informeId,
      numero_version: nextVersion,
      archivo_key_r2: body.archivo_key_r2,
      archivo_nombre: body.archivo_nombre,
      archivo_tamano_bytes: body.archivo_tamano_bytes,
      tipo_mime: body.tipo_mime || null,
      hash_archivo: body.hash_archivo || null,
      resumen_cambios: body.resumen_cambios || null,
      subido_por: user.id,
    })
    .select()
    .single();

  if (dbError) {
    return error(c, 500, 'Error al registrar la versión', dbError.message);
  }

  return success(c, data, `Versión ${nextVersion} creada exitosamente`, 201);
});

// Consultar historial
informesRoutes.get('/:id/historial', async (c) => {
  const informeId = c.req.param('id');
  const supabase = getSupabaseAdmin(c.env);

  const { data, error: dbError } = await supabase
    .from('informe_historial_estados')
    .select('*')
    .eq('informe_id', informeId)
    .order('creado_en', { ascending: true });

  if (dbError) {
    return error(c, 500, 'Error al consultar historial', dbError.message);
  }

  return success(c, data);
});