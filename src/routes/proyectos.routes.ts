import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { getSupabaseAdmin } from '../config/supabase';
import { requireRole } from '../middlewares/role';
import { success, error } from '../utils/response';

export const proyectosRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Listar proyectos
proyectosRoutes.get('/', async (c) => {
  const user = c.get('user');
  const supabase = getSupabaseAdmin(c.env);

  let query = supabase.from('proyectos').select('*').order('creado_en', { ascending: false });

  if (user.rol !== 'superadmin' && user.rol !== 'revisor') {
    query = query.eq('activo', true);
  }

  const { data, error: dbError } = await query;
  if (dbError) {
    return error(c, 500, 'Error al obtener proyectos', dbError.message);
  }

  return success(c, data);
});

// Crear proyecto
proyectosRoutes.post('/', requireRole(['investigador', 'superadmin']), async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !body.titulo) {
    return error(c, 400, 'El campo titulo es obligatorio');
  }

  const user = c.get('user');
  const supabase = getSupabaseAdmin(c.env);

  const { data, error: dbError } = await supabase
    .from('proyectos')
    .insert({
      titulo: body.titulo,
      descripcion: body.descripcion || null,
      creador_id: user.id,
      activo: true,
    })
    .select()
    .single();

  if (dbError) {
    return error(c, 500, 'Error al registrar el proyecto', dbError.message);
  }

  return success(c, data, 'Proyecto creado exitosamente', 201);
});