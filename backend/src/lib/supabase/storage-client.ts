// lapa-casa-hostel/backend/src/lib/supabase/storage-client.ts
//
// Cliente de Supabase Storage para fotos de apartamentos.
// Usa la REST API de Supabase Storage directamente con fetch nativo
// (Node 22) y la service role key para operaciones de escritura/borrado.
// Las URLs públicas son accesibles sin autenticación porque el bucket
// apartment-photos está configurado como público.
//
// Variables de entorno requeridas en Fly.io:
//   SUPABASE_URL              https://<project-ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY clave de servicio del panel Supabase → API Keys

import { logger } from '../../utils/logger';

const BUCKET = 'apartment-photos';

function getConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '') || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) {
    return null;
  }
  return { url, key };
}

export interface UploadedPhoto {
  url: string;
  publicId: string; // path dentro del bucket (se almacena como cloudinary_public_id)
}

/**
 * Sube un buffer de imagen al bucket apartment-photos en Supabase Storage.
 * Devuelve { url, publicId } donde publicId es el path dentro del bucket
 * (compatible con la columna cloudinary_public_id que ya existe en DB).
 */
export async function uploadApartmentPhoto(
  buffer: Buffer,
  mimeType: string = 'image/jpeg',
): Promise<UploadedPhoto> {
  const config = getConfig();
  if (!config) {
    throw new Error(
      'Supabase Storage no está configurado — agregá SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Fly.io',
    );
  }

  // Path único: timestamp + random para evitar colisiones
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const uploadUrl = `${config.url}/storage/v1/object/${BUCKET}/${path}`;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.key}`,
      'Content-Type': mimeType,
      'x-upsert': 'false',
    },
    body: buffer,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.error('Error subiendo foto a Supabase Storage', { status: res.status, body, path });
    throw new Error(`Error al subir la foto (${res.status}): ${body}`);
  }

  const publicUrl = `${config.url}/storage/v1/object/public/${BUCKET}/${path}`;
  return { url: publicUrl, publicId: path };
}

/**
 * Borra una foto del bucket dado su path (almacenado en cloudinary_public_id).
 * Si falla, loguea y sigue — el registro de BD se borra igual.
 */
export async function deleteApartmentPhoto(path: string): Promise<void> {
  const config = getConfig();
  if (!config || !path) { return; }

  const res = await fetch(`${config.url}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefixes: [path] }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.warn('No se pudo borrar foto de Supabase Storage', { path, status: res.status, body });
  }
}
