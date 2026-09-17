# API de MS Academic

Documentación de endpoints para consumir la API desde un frontend.

## Base URL

En desarrollo:

```text
http://localhost:8787
```

En producción, sustituye la base URL por el dominio público del Worker.

## Autenticación

Las rutas bajo `/api/v1` requieren un JWT válido en el encabezado:

```http
Authorization: Bearer <JWT>
Content-Type: application/json
```

El JWT debe contener el identificador del usuario en el claim `sub`. El token se valida contra el microservicio de autenticación antes de ejecutar la ruta.

Roles disponibles: `superadmin`, `revisor`, `investigador` y `auxiliar`.

## Formato de respuestas

Respuesta exitosa:

```json
{
	"success": true,
	"data": {},
	"message": "Mensaje opcional"
}
```

Respuesta de error:

```json
{
	"success": false,
	"error": "Descripción del error",
	"details": "Detalle opcional"
}
```

Los identificadores (`id`, `proyecto_id`, `informe_id`) se muestran como UUID de ejemplo. Los objetos devueltos contienen las columnas de la tabla correspondiente en Supabase.

## Endpoints

### GET `/health`

Verifica que el servicio esté disponible. No requiere autenticación.

Respuesta `200`:

```json
{
	"success": true,
	"data": {
		"service": "ms-academic",
		"status": "ok",
		"timestamp": "2026-09-16T12:00:00.000Z"
	}
}
```

### GET `/api/v1/proyectos`

Lista los proyectos ordenados del más reciente al más antiguo.

Requiere JWT. Los usuarios `superadmin` y `revisor` pueden ver proyectos activos e inactivos; los demás roles solo reciben proyectos con `activo: true`.

Respuesta `200`:

```json
{
	"success": true,
	"data": [
		{
			"id": "11111111-1111-1111-1111-111111111111",
			"titulo": "Sistema de seguimiento académico",
			"descripcion": "Descripción del proyecto",
			"creador_id": "22222222-2222-2222-2222-222222222222",
			"activo": true,
			"creado_en": "2026-09-16T12:00:00.000Z"
		}
	]
}
```

### POST `/api/v1/proyectos`

Crea un proyecto activo. Requiere rol `investigador` o `superadmin`.

Cuerpo:

```json
{
	"titulo": "Sistema de seguimiento académico",
	"descripcion": "Descripción opcional del proyecto"
}
```

`titulo` es obligatorio. `descripcion` es opcional; si se omite, se guarda como `null`.

Respuesta `201`:

```json
{
	"success": true,
	"data": {
		"id": "11111111-1111-1111-1111-111111111111",
		"titulo": "Sistema de seguimiento académico",
		"descripcion": "Descripción opcional del proyecto",
		"creador_id": "22222222-2222-2222-2222-222222222222",
		"activo": true,
		"creado_en": "2026-09-16T12:00:00.000Z"
	},
	"message": "Proyecto creado exitosamente"
}
```

### POST `/api/v1/informes`

Crea un informe en estado `borrador`. Requiere rol `investigador`, `auxiliar` o `superadmin`.

Cuerpo:

```json
{
	"proyecto_id": "11111111-1111-1111-1111-111111111111",
	"titulo": "Informe de avance trimestral"
}
```

`proyecto_id` y `titulo` son obligatorios. El `creador_id` se toma del usuario autenticado y el estado inicial siempre es `borrador`.

Respuesta `201`:

```json
{
	"success": true,
	"data": {
		"id": "33333333-3333-3333-3333-333333333333",
		"proyecto_id": "11111111-1111-1111-1111-111111111111",
		"titulo": "Informe de avance trimestral",
		"estado": "borrador",
		"creador_id": "22222222-2222-2222-2222-222222222222",
		"creado_en": "2026-09-16T12:00:00.000Z"
	},
	"message": "Informe creado exitosamente"
}
```

### POST `/api/v1/informes/:id/transicion`

Actualiza el estado de un informe y registra el cambio en el historial. Requiere JWT; la ruta no restringe el cambio a un rol específico. La base de datos valida si la transición es permitida.

Parámetro de ruta: `id` es el UUID del informe.

Cuerpo:

```json
{
	"nuevo_estado": "en_revision",
	"comentario": "El informe fue enviado para revisión"
}
```

`nuevo_estado` es obligatorio. Estados disponibles: `borrador`, `enviado`, `en_revision`, `observado`, `aprobado` y `rechazado`. `comentario` es opcional.

Respuesta `200`:

```json
{
	"success": true,
	"data": {
		"id": "33333333-3333-3333-3333-333333333333",
		"proyecto_id": "11111111-1111-1111-1111-111111111111",
		"titulo": "Informe de avance trimestral",
		"estado": "en_revision"
	},
	"message": "Estado del informe actualizado"
}
```

### POST `/api/v1/informes/:id/versiones`

Registra una nueva versión de un informe. Requiere JWT. El número de versión se calcula automáticamente como el siguiente número disponible.

Parámetro de ruta: `id` es el UUID del informe.

Cuerpo:

```json
{
	"archivo_key_r2": "informes/33333333-3333-3333-3333-333333333333/v2/informe.pdf",
	"archivo_nombre": "informe.pdf",
	"archivo_tamano_bytes": 245760,
	"tipo_mime": "application/pdf",
	"hash_archivo": "sha256:abc123...",
	"resumen_cambios": "Se actualizaron los resultados"
}
```

Obligatorios: `archivo_key_r2`, `archivo_nombre` y `archivo_tamano_bytes`. Opcionales: `tipo_mime`, `hash_archivo` y `resumen_cambios`.

Respuesta `201`:

```json
{
	"success": true,
	"data": {
		"id": "44444444-4444-4444-4444-444444444444",
		"informe_id": "33333333-3333-3333-3333-333333333333",
		"numero_version": 2,
		"archivo_key_r2": "informes/33333333-3333-3333-3333-333333333333/v2/informe.pdf",
		"archivo_nombre": "informe.pdf",
		"archivo_tamano_bytes": 245760,
		"tipo_mime": "application/pdf",
		"hash_archivo": "sha256:abc123...",
		"resumen_cambios": "Se actualizaron los resultados",
		"subido_por": "22222222-2222-2222-2222-222222222222"
	},
	"message": "Versión 2 creada exitosamente"
}
```

### GET `/api/v1/informes/:id/historial`

Consulta el historial de estados de un informe, ordenado desde el cambio más antiguo al más reciente. Requiere JWT.

Parámetro de ruta: `id` es el UUID del informe.

Respuesta `200`:

```json
{
	"success": true,
	"data": [
		{
			"id": "55555555-5555-5555-5555-555555555555",
			"informe_id": "33333333-3333-3333-3333-333333333333",
			"estado_anterior": "borrador",
			"estado_nuevo": "en_revision",
			"cambiado_por": "22222222-2222-2222-2222-222222222222",
			"comentario": "El informe fue enviado para revisión",
			"creado_en": "2026-09-16T12:00:00.000Z"
		}
	]
}
```

## Endpoint interno

Esta ruta es para comunicación entre microservicios. No debe llamarse desde el frontend ni exponerse a usuarios finales. En todas las solicitudes se requiere el secreto configurado en `X-Internal-Secret`.

### PATCH `/internal/informes/:id/estado`

Usado por MS3 para actualizar el estado de un informe. No requiere JWT de usuario, pero sí el secreto inter-servicio.

Encabezados:

```http
X-Internal-Secret: <INTERNAL_SERVICE_SECRET>
Content-Type: application/json
```

Cuerpo:

```json
{
	"nuevo_estado": "aprobado",
	"usuario_id": "66666666-6666-6666-6666-666666666666",
	"comentario": "Aprobado por revisión académica"
}
```

`nuevo_estado` y `usuario_id` son obligatorios. `comentario` es opcional y, si se omite, se usa `Transición efectuada por revisión académica`.

Respuesta `200`:

```json
{
	"success": true,
	"data": {
		"id": "33333333-3333-3333-3333-333333333333",
		"estado": "aprobado"
	},
	"message": "Estado actualizado exitosamente"
}
```

## Errores HTTP comunes

- `400`: cuerpo inválido o faltan campos obligatorios.
- `401`: falta el JWT, tiene formato inválido o no contiene `sub`.
- `403`: usuario inactivo/no autorizado, rol insuficiente o secreto interno inválido.
- `404`: informe no encontrado o ruta inexistente.
- `422`: transición de estado rechazada por la base de datos.
- `500`: error interno o error de persistencia.
```txt
npm install
npm run dev
```

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiating `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
