import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env, Variables } from './types';
import { proyectosRoutes } from './routes/proyectos.routes';
import { informesRoutes } from './routes/informes.routes';
import { internalRoutes } from './routes/internal.routes';
import { authMiddleware } from './middlewares/auth';
import { success, error } from './utils/response';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (origin) => origin || '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Internal-Secret'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
);

app.get('/health', (c) => {
  return success(c, {
    service: 'ms-academic',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Rutas protegidas por Auth
app.use('/api/v1/proyectos/*', authMiddleware);
app.use('/api/v1/informes/*', authMiddleware);

// Montaje
app.route('/api/v1/proyectos', proyectosRoutes);
app.route('/api/v1/informes', informesRoutes);
app.route('/internal', internalRoutes);

app.notFound((c) => error(c, 404, `Ruta no encontrada: ${c.req.method} ${c.req.url}`));

app.onError((err, c) => {
  console.error(`[Error ms-academic]:`, err);
  return error(c, 500, 'Error interno del servidor en ms-academic', err.message);
});

export default app;