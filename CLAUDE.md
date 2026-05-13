# CIA - Contabilidad con Inteligencia Artificial

## Stack
- Next.js 14 + React
- Supabase (auth + base de datos)
- Vercel (hosting)
- Anthropic API (lectura de facturas)

## URL de producción
contaai-seven.vercel.app

## Estructura de páginas
- `/` — Dashboard principal, lista de clientes del estudio
- `/login` — Login email + password
- `/onboarding` — Flujo de 2 pasos para nuevos usuarios
- `/clientes/[id]` — Detalle del cliente con Liquidador de IVA
- `/configuracion` — Gestión del estudio e invitación de empleados
- `/invitacion` — Aceptar invitación de empleado

## Tablas en Supabase
- `estudios` — id, nombre, cuit, created_at
- `usuarios_estudio` — id, user_id, estudio_id, rol (admin/operador), nombre, created_at
- `invitaciones` — id, estudio_id, email, token, usado, created_at
- `clientes_estudio` — id, nombre, descripcion, created_at
- `empresas` — id, cliente_id, cuit, nombre_empresa, actividad, direccion, provincia, localidad, created_at
- `facturas` — id, fecha, tipo, nro, proveedor, cuit, concepto, categoria, alicuota, neto, iva, total, periodo, libro, cuit_entidad, cliente_id, user_id, created_at
- `entidades` — id, cuit, nombre, tipo, created_at

## Variables de entorno en Vercel
- ANTHROPIC_API_KEY
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXTAUTH_SECRET
- NEXTAUTH_URL

## Diseño
- Fondo: #f0f2f5
- Color principal: #1a3a5c (azul marino)
- Tipografía: system-ui / Segoe UI
- Sin gradientes ni fondos oscuros

## Reglas importantes
- Siempre hacer commit y push después de cada tarea
- Una tarea a la vez
- No instalar paquetes innecesarios
- El login es solo email + password, sin OTP ni Resend

## Archivos clave y su función
- `pages/clientes/[id].js` — página principal del cliente, contiene el liquidador de IVA, modal de carga, tabla de comprobantes
- `pages/api/facturas.js` — GET/POST/DELETE/PATCH de facturas
- `pages/api/entidades.js` — GET/POST de entidades (proveedores/clientes)
- `pages/api/procesar-factura.js` — llama a Anthropic API para leer imagen
- `lib/auth-context.js` — hook de autenticación
- `lib/supabase-browser.js` — cliente Supabase para el browser

## Lógica de entidades
La verificación de entidad nueva está en `pages/clientes/[id].js`.
Después de confirmar una factura, se llama a `/api/entidades?cuit=XX` para verificar si existe.
Si no existe, se muestra modal de nueva entidad.
El CUIT siempre se normaliza (sin guiones/puntos) antes de buscar y guardar en `pages/api/entidades/index.js`.
