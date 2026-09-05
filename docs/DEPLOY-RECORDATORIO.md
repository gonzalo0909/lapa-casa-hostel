> **Actualizado 2026-09-02:** este documento describía un plan aspiracional
> (Vercel + Render) que nunca se implementó tal cual. El dominio
> `lapacasario.com` ya está comprado (Porkbun) y el stack real terminó
> siendo distinto: backend+worker en **Fly.io** (no Render), frontend
> **sigue en Render por ahora** (migración a Vercel planeada, sin fecha
> fija). `docs/DEPLOY.md` es la guía completa y detallada — este archivo
> es el resumen rápido.

# Deploy Recordatorio — lapacasario.com

## Stack real (hoy)
- **Frontend + landing**: Render (`lapa-casa-hostel-frontend`, `lapa-casa-hostel-landing`) — migración a Vercel pendiente
- **Backend + worker**: Fly.io, app `lapa-casa-hostel` (dos process groups: `app` y `worker`, ver `backend/fly.toml`)
- **Dominio**: `lapacasario.com`, comprado en Porkbun
- **Base de datos**: Supabase (proyecto `rpowardrcwnhbkzjsiok`, región `sa-east-1`) — no gestionada por Render ni por Fly

## Dominios ya configurados
| Dominio | Apunta a | DNS |
|---|---|---|
| `lapacasario.com` (+ `www`) | Frontend en Render | ALIAS/CNAME → `lapa-casa-hostel-frontend-313b.onrender.com` |
| `api.lapacasario.com` | Backend en Fly.io | A + AAAA + CNAME que muestra Fly → Certificates |

---

## Deploy del backend (Fly.io) — sin `flyctl` local

Todo se hace desde el dashboard web de Fly (fly.io/dashboard), sin instalar nada:

1. Fly → **Launch an App** → conectar el repo de GitHub → `gonzalo0909/lapa-casa-hostel`
2. Working directory / Config path: `backend` (ahí vive `Dockerfile` y `fly.toml`)
3. Branch: `definitivo2026`, región: `gru` (São Paulo)
4. Secrets (Settings → Secrets → Batch Import): `DATABASE_URL`, `REDIS_URL`,
   `JWT_SECRET`, `ENCRYPTION_KEY`, `CORS_ORIGINS`, `APP_URL`, `FRONTEND_URL`,
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `MP_ACCESS_TOKEN`,
   `MP_WEBHOOK_SECRET`, `RESEND_API_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`,
   `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
   `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_SHEETS_SPREADSHEET_ID`,
   `SENTRY_DSN` (proyecto `lapa-backend` en sentry.io → Settings → Client Keys).
   **`DATABASE_CA_CERT` ya no hace falta** — es código (`backend/src/config/supabase-ca.ts`), no secreto.
5. Settings → **Auto-Deploy on push**, rama `definitivo2026` — cada push despliega solo
6. Certificates → agregar `api.lapacasario.com`, cargar los registros DNS que muestra en Porkbun
7. Verificar: `https://api.lapacasario.com/health` → `{"status":"healthy"}`

---

## Deploy del frontend (Render, por ahora)

Ya está desplegado como `lapa-casa-hostel-frontend` en Render, con `lapacasario.com`
y `www.lapacasario.com` como Custom Domains apuntando ahí. Variables clave:
```
NEXT_PUBLIC_API_URL=https://api.lapacasario.com/api/v1
NEXT_PUBLIC_SITE_URL=https://www.lapacasario.com
NEXT_PUBLIC_SENTRY_DSN=https://...@o....ingest.sentry.io/...   # Proyecto lapa-frontend en sentry.io
```

Cuando se migre a Vercel: nuevo proyecto ahí con las mismas variables, y cambiar
el DNS de `lapacasario.com`/`www` del ALIAS de Render al que dé Vercel — no hay
que tocar nada del backend en Fly.

---

## Panel de administradores de apartamento

`www.lapacasario.com/owner/login` — fuera del prefijo de idioma (`/pt`, `/es`...),
herramienta interna en portugués. Requiere una cuenta creada de antemano desde el
panel admin general (`api.lapacasario.com/admin`).

---

## Google Business Profile (cuando el site esté listo)

Crear **dos fichas separadas**:
1. **Lapa Casa Hostel** — con dirección física: Rua Silvio Romero 22, Santa Teresa, Rio de Janeiro
2. **Lapa Casa Apartamentos** — sin dirección fija, seleccionar categoría "Área de servicio" → "Rio de Janeiro"

Así en Google Maps aparecen como negocios independientes con SEO propio.

---

## Checklist final antes de lanzar

- [x] Comprar dominio lapacasario.com
- [x] Deploy backend en Fly.io
- [x] Deploy frontend en Render (Vercel pendiente)
- [x] Configurar DNS (`api.` → Fly, raíz/`www` → Render)
- [ ] Probar formulario de reserva hostel (end-to-end)
- [ ] Probar formulario de reserva apartamentos (end-to-end)
- [ ] Verificar que /apartamentos NO muestra tab de hostel
- [ ] Verificar que emails de confirmación NO incluyen dirección de apartamento en el cuerpo (solo en link seguro)
- [ ] Configurar Google Business Profile (dos fichas)
- [ ] Cargar apartamentos reales en la DB
- [ ] Cargar fotos de apartamentos
- [ ] Migrar frontend a Vercel
