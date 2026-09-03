# Deploy — Lapa Casa Hostel Channel Manager

Guía paso a paso para desplegar el sistema en producción. Apunta al Supabase real ya
migrado (proyecto `rpowardrcwnhbkzjsiok`, región `sa-east-1`) — **no crear un proyecto
Supabase nuevo**.

> **Backend + worker en Fly.io, no en Render** (mudado 2026-09-02, latencia São Paulo
> vs. la región más cercana que ofrecía Render, Oregon). Las secciones 1-2 de abajo
> describen el deploy en Render que ya no aplica al backend — ver `backend/fly.toml`
> y `docs/DEPLOY-RECORDATORIO.md` para el flujo real (dashboard de Fly, sin `flyctl`
> local). Landing y frontend siguen en Render tal como está documentado acá.

> Antes de seguir esta guía: Ventanas 3 (pagos), 4 (colas/emails/Sheets/admin) y 5
> (iCal/OTAs) deben estar verificadas de punta a punta, no solo escritas (ver
> `prompts/combo-VENTANA-6-completa.md`, sección "CONTEXTO PREVIO"). Desplegar pagos
> sin probar o iCal sin auditar es desplegar bugs conocidos a producción.

## 1. Servicios

`render.yaml` (raíz del repo) define los servicios que siguen en Render:

| Servicio | Tipo | Sirve |
|---|---|---|
| `lapa-casa-hostel-landing` | `web` (static) | Landing estática de `public/landing/` en el dominio raíz |
| `lapa-casa-hostel-frontend` | `web` (Node, Next.js) | Motor de reservas real (Hostel + Apartamentos vía `PropertyTabs`), conectado a la API con `NEXT_PUBLIC_API_URL` |

Backend (API + panel admin en `/admin`) y worker (BullMQ: cobro de saldo a 7 días,
emails programados, liberación de holds vencidos, sync iCal con OTAs) corren en
**Fly.io**, no en `render.yaml` — ver `backend/fly.toml` (dos process groups, `app`
y `worker`, misma imagen Docker) y `docs/DEPLOY-RECORDATORIO.md`.

El frontend de reservas en Next.js (`frontend/`) ya tiene `app/` (App Router,
rutas `/[locale]/...`), compila y está en `render.yaml` como servicio propio
(`autoDeploy: true`, igual que la landing).

## 2. Primer deploy — backend (Fly.io)

Ver `docs/DEPLOY-RECORDATORIO.md` para el flujo real, paso a paso desde el
dashboard web de Fly (sin `flyctl` local). Resumen:

1. Conectar el repo a Fly desde el dashboard ("Launch an App" → GitHub), apuntando
   a `backend/` como working directory y config path (ahí vive `fly.toml` y el
   `Dockerfile`).
2. Cargar los secretos en Fly → Secrets (equivalente a las variables `sync: false`
   de Render): `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`,
   `CORS_ORIGINS`, `APP_URL`, `FRONTEND_URL`, `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `MP_ACCESS_TOKEN`, `RESEND_API_KEY`, `ADMIN_EMAIL`,
   `ADMIN_PASSWORD_HASH`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
   `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_SHEETS_SPREADSHEET_ID`.
   `DATABASE_CA_CERT` ya **no** hace falta cargarla — va commiteada como código en
   `backend/src/config/supabase-ca.ts` (no es un secreto, es la CA pública de
   Supabase).
3. Auto-deploy activado: cada push a la rama conectada dispara un build+deploy solo.
4. Verificar: `GET https://api.lapacasario.com/health` → `{"status":"healthy"}`.
5. El schema y el seed **ya están aplicados** en el Supabase real (Ventana 1) — no
   correr `migrate.js`/`seed.js` contra producción salvo que se agregue una migración
   `0009+` nueva.

## 3. Primer deploy — landing estática

`lapa-casa-hostel-landing` se despliega solo (sin build step, `staticPublishPath: .`
sobre `public/landing/`). Antes de publicar, completar los `TODO` de
`public/landing/index.html`:

- Número real de WhatsApp (`href="https://wa.me/..."`)
- URLs reales de los perfiles en Booking.com, Airbnb, Hostelworld, Expedia

## 4. Dominios custom

- `lapacasario.com` (+ `www`) → **Render**, servicio `lapa-casa-hostel-frontend` →
  Settings → Custom Domains. Registros DNS (`ALIAS`/`CNAME`) en el proveedor real
  del dominio.
- `api.lapacasario.com` → **Fly.io**, app del backend → Certificates → agregar el
  hostname, cargar los registros `A`/`AAAA`/`CNAME` que muestra ahí en el DNS.

`APP_URL` en los Secrets de Fly debe apuntar a `https://api.lapacasario.com` (no a
`*.fly.dev`), ya que se usa para links en emails transaccionales.

## 5. Redis (Upstash u otro proveedor)

Sin `REDIS_URL`, el sistema sigue funcionando (cache cae a un fallback en memoria por
proceso, colas BullMQ quedan deshabilitadas — ver `src/cache/redis-client.ts` y
`src/queues/connection.ts`) pero **sin reintentos de pago ni emails asíncronos**, y
sin compartir estado entre instancias. Obligatorio antes de recibir pagos reales:

1. Crear una instancia (Upstash Redis, plan gratuito tiene persistencia).
2. Copiar el connection string (`rediss://...`) a `REDIS_URL` en los Secrets de Fly.
3. El worker (`npm run worker`) ya corre como process group `worker` en Fly —
   `backend/fly.toml`, no hace falta un servicio aparte.

## 6. Webhooks externos

Registrar, en el dashboard de cada proveedor, la URL pública `https://api.<dominio>/api/v1/...`:

| Proveedor | Endpoint |
|---|---|
| Stripe | `/api/v1/payments/webhook/stripe` (ver `routes/payments/handle-webhook.ts`) — configurar `STRIPE_WEBHOOK_SECRET` con el valor que Stripe genera para ese endpoint. La verificación de firma usa el body crudo (`req.rawBody`, capturado en `app.ts`) — no tocar ese mecanismo al modificar este endpoint |
| MercadoPago | `/api/v1/payments/webhook/mercadopago` |
| Booking.com | `/api/v1/webhooks/booking` — requiere `BOOKING_WEBHOOK_SECRET`/`_API_KEY` |
| Expedia | `/api/v1/webhooks/expedia` — requiere `EXPEDIA_WEBHOOK_SECRET`/`_API_KEY` |

Airbnb y Hostelworld son iCal-only (no tienen webhook, ver
`config/channels.ts:WEBHOOK_CHANNELS`) — no hay nada que registrar ahí.

## 7. Feeds iCal

- **Export** (público, sin auth): `GET /api/v1/ical/export` y
  `/api/v1/ical/export/:roomId` — pegar estas URLs en Airbnb/Hostelworld/Booking como
  "calendario a importar".
- **Import** (admin): configurar las URLs de origen vía
  `POST /api/v1/admin` → panel admin, o `POST /api/v1/ical/import/config` con JWT de
  admin (ver colección Postman).

## 8. Deploy sin downtime

**Frontend/landing (Render)**: rolling deploy en el plan `starter` (nueva instancia
arriba y pasando `healthCheckPath` antes de recibir tráfico, la vieja se apaga
después) — no requiere configuración adicional. El plan gratuito tiene cold-starts
tras inactividad.

**Backend/worker (Fly.io)**: `fly.toml` tiene `min_machines_running = 1` y healthcheck
en `/health` antes de que el proxy le mande tráfico a una máquina nueva — mismo
efecto, sin plan pago.

## 9. Rollback

**Frontend/landing (Render)**: `./scripts/rollback.sh` (requiere `RENDER_API_KEY` y
`RENDER_SERVICE_ID`, ver el script) o manualmente: dashboard de Render → servicio →
pestaña **Events** → elegir un deploy anterior → **Rollback to this deploy**.

**Backend/worker (Fly.io)**: `git revert` del commit problemático + push (dispara un
nuevo deploy vía el Auto-Deploy conectado a GitHub), o desde el dashboard de Fly →
Activity → elegir un release anterior → redeploy. `scripts/rollback.sh` no cubre Fly.

## 10. Scripts de operaciones

Ver `scripts/` en la raíz del repo (backend/worker en Fly no usan estos dos):

- `deploy.sh <landing|frontend>` — dispara un deploy vía Deploy Hook de Render
- `rollback.sh` — vuelve al deploy anterior vía API de Render (frontend/landing)
- `backup-db.sh` — `pg_dump` contra el Supabase real
- `restore-db.sh` — restaura un backup (destructivo, pide confirmación)
- `health-check.sh` — verifica que todos los endpoints públicos respondan

## 11. Checklist pre-producción

Ver la lista completa (con estado real, no aspiracional) en
`prompts/combo-VENTANA-6-completa.md`, sección "Checklist pre-producción", y en
`docs/MAINTENANCE.md` para las tareas recurrentes.
