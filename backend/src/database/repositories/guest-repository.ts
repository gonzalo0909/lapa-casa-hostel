// lapa-casa-hostel/backend/src/database/repositories/guest-repository.ts
//
// FIX (auditoría 2026-08-30): reescrito de Prisma a SQL directo (pg) --
// era la única pieza de todo el backend que hablaba con la base por un
// ORM aparte, con su propio pool de conexiones, mientras el resto (incluida
// la transacción crítica de creación de reserva en booking-service.ts) usa
// siempre config/database.ts contra el mismo pool. Se eliminaron además 14
// de los 16 métodos que tenía esta clase (create, findById, findByEmail,
// findByPhone, updateStats, search, findAll, findTop, findRecent,
// findInactive, countByNationality, getStatistics, delete, merge): cero
// callers reales en toda la base de código -- vestigios de una capa
// CRUD+analytics genérica que nadie llegó a usar.

import { query } from '../../config/database';
import type { Guest } from '../../types/database';

export class GuestRepository {
  async upsert(data: {
    full_name: string;
    email: string;
    phone?: string | null;
    country?: string | null;
    language?: string | null;
  }): Promise<Guest> {
    const { rows } = await query<Guest>(
      `INSERT INTO guests (full_name, email, phone, country, language)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET
         full_name  = EXCLUDED.full_name,
         phone      = COALESCE(EXCLUDED.phone, guests.phone),
         country    = COALESCE(EXCLUDED.country, guests.country),
         language   = COALESCE(EXCLUDED.language, guests.language),
         updated_at = now()
       RETURNING *`,
      [data.full_name, data.email, data.phone ?? null, data.country ?? null, data.language ?? null]
    );
    return rows[0];
  }

  async update(id: string, data: Partial<{
    full_name: string;
    phone: string;
    country: string;
    language: string;
  }>): Promise<Guest> {
    const entries = Object.entries(data).filter(([, v]) => v !== undefined);
    if (entries.length === 0) {
      const { rows } = await query<Guest>(`SELECT * FROM guests WHERE id = $1`, [id]);
      if (!rows[0]) {throw new Error('Guest not found');}
      return rows[0];
    }
    const sets = entries.map(([key], i) => `${key} = $${i + 1}`);
    const values = entries.map(([, value]) => value);
    values.push(id);
    const { rows } = await query<Guest>(
      `UPDATE guests SET ${sets.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!rows[0]) {throw new Error('Guest not found');}
    return rows[0];
  }
}

export default new GuestRepository();
