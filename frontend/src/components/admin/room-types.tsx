// lapa-casa-hostel/frontend/src/components/admin/room-types.tsx

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api, handleAPIError } from '@/lib/api';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * RoomTypes (admin)
 *
 * Editor de room_types (dormitorios del hostel + apartamentos): nombre,
 * capacidad y precio base. Antes esto solo se podia corregir con una
 * migracion a mano -- ver 0019/0020_fix_apartment_*.sql, que arreglaron
 * el dato incorrecto que ya estaba cargado en produccion.
 *
 * Llama a:
 *   GET /admin/rooms              → RoomTypeRow[]
 *   PUT /admin/rooms/:id/settings → {name?, capacity?, basePrice?, isFlexible?}
 *
 * @component
 */
interface RoomTypeRow {
  id: string;
  code: string;
  name: string;
  capacity: number;
  base_price: string | number;
  property_type: 'hostel' | 'apartment';
  is_flexible: boolean;
  default_gender: string;
}

interface Draft {
  name: string;
  capacity: string;
  basePrice: string;
}

function toDraft(row: RoomTypeRow): Draft {
  return { name: row.name, capacity: String(row.capacity), basePrice: String(row.base_price) };
}

export function RoomTypes({ locale }: { locale: string }) {
  const [rows, setRows] = useState<RoomTypeRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/admin/rooms', { token: token ?? undefined });
      const data = (res.data ?? []) as RoomTypeRow[];
      setRows(data);
      const nextDrafts: Record<string, Draft> = {};
      data.forEach((r) => { nextDrafts[r.id] = toDraft(r); });
      setDrafts(nextDrafts);
    } catch (err) {
      setError(handleAPIError(err, locale as any));
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  useEffect(() => { load(); }, [load]);

  const updateDraft = (id: string, field: keyof Draft, value: string) => {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], [field]: value } as Draft }));
  };

  const isDirty = (row: RoomTypeRow): boolean => {
    const d = drafts[row.id];
    if (!d) { return false; }
    return d.name !== row.name || d.capacity !== String(row.capacity) || d.basePrice !== String(row.base_price);
  };

  const handleSave = async (row: RoomTypeRow) => {
    const d = drafts[row.id];
    if (!d) { return; }
    const capacityNum = parseInt(d.capacity, 10);
    const priceNum = parseFloat(d.basePrice);
    if (!Number.isInteger(capacityNum) || capacityNum < 1) {
      setError(`Capacidade inválida para "${row.name}" — precisa ser um número inteiro maior que 0.`);
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError(`Preço inválido para "${row.name}".`);
      return;
    }
    setSavingId(row.id);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      await api.put(
        `/admin/rooms/${row.id}/settings`,
        { name: d.name.trim(), capacity: capacityNum, basePrice: priceNum },
        { token: token ?? undefined }
      );
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, name: d.name.trim(), capacity: capacityNum, base_price: priceNum } : r)));
      setSavedId(row.id);
      setTimeout(() => setSavedId((cur) => (cur === row.id ? null : cur)), 2000);
    } catch (err) {
      setError(handleAPIError(err, locale as any));
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const hostelRows = rows.filter((r) => r.property_type === 'hostel');
  const apartmentRows = rows.filter((r) => r.property_type === 'apartment');

  const renderTable = (title: string, list: RoomTypeRow[]) => (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Código</th>
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">Capacidade</th>
              <th className="px-3 py-2 font-medium">Preço base (R$)</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => {
              const d = drafts[row.id] ?? toDraft(row);
              const dirty = isDirty(row);
              return (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">{row.code}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={d.name}
                      onChange={(e) => updateDraft(row.id, 'name', e.target.value)}
                      className="w-full min-w-[10rem] rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      value={d.capacity}
                      onChange={(e) => updateDraft(row.id, 'capacity', e.target.value)}
                      className="w-20 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={d.basePrice}
                      onChange={(e) => updateDraft(row.id, 'basePrice', e.target.value)}
                      className="w-24 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleSave(row)}
                      disabled={!dirty || savingId === row.id}
                      className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                    >
                      {savingId === row.id ? 'Salvando…' : savedId === row.id ? '✓ Salvo' : 'Salvar'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {renderTable(`Apartamentos (${apartmentRows.length})`, apartmentRows)}
      {renderTable(`Hostel — dormitórios (${hostelRows.length})`, hostelRows)}
    </div>
  );
}
