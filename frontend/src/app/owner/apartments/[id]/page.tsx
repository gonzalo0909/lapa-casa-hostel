'use client';

// lapa-casa-hostel/frontend/src/app/owner/apartments/[id]/page.tsx
//
// Editar um apartamento (só campos editoriais -- base_price e
// external_rating* ficam fora, ver comentário em owner-apartments.routes.ts)
// e gerenciar suas fotos.

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useOwnerAuth } from '@/lib/use-owner-auth';
import { ownerApartmentsAPI, type Apartment, type ApartmentPhoto } from '@/lib/owner-api';
import { handleAPIError } from '@/lib/api';

export default function OwnerApartmentEditPage() {
  const params = useParams<{ id: string }>();
  const { profile, loading: authLoading } = useOwnerAuth();

  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [photos, setPhotos] = useState<ApartmentPhoto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Estado del formulario
  const [description, setDescription] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [amenitiesText, setAmenitiesText] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [aptRes, photosRes] = await Promise.all([
        ownerApartmentsAPI.getById(params.id),
        ownerApartmentsAPI.listPhotos(params.id),
      ]);
      const apt = aptRes.data;
      setApartment(apt);
      setDescription(apt.description ?? '');
      setNeighborhood(apt.neighborhood ?? '');
      setBedrooms(apt.bedrooms?.toString() ?? '');
      setBathrooms(apt.bathrooms?.toString() ?? '');
      setAmenitiesText(Array.isArray(apt.amenities) ? apt.amenities.join(', ') : '');
      setPhotos(photosRes.data.photos);
    } catch (err) {
      setError(handleAPIError(err, 'pt'));
    }
  }, [params.id]);

  useEffect(() => {
    if (!profile) {return;}
    loadData();
  }, [profile, loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaveMessage(null);
    setSaving(true);
    try {
      const amenities = amenitiesText
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      await ownerApartmentsAPI.update(params.id, {
        description: description || undefined,
        neighborhood: neighborhood || undefined,
        bedrooms: bedrooms ? parseInt(bedrooms, 10) : undefined,
        bathrooms: bathrooms ? parseInt(bathrooms, 10) : undefined,
        amenities,
      });
      setSaveMessage('Alterações salvas com sucesso.');
    } catch (err) {
      setError(handleAPIError(err, 'pt'));
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) {return;}

    setError(null);
    setUploading(true);
    try {
      await ownerApartmentsAPI.uploadPhoto(params.id, file);
      const photosRes = await ownerApartmentsAPI.listPhotos(params.id);
      setPhotos(photosRes.data.photos);
    } catch (err) {
      setError(handleAPIError(err, 'pt'));
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimary = async (photoId: string) => {
    try {
      await ownerApartmentsAPI.setPrimaryPhoto(photoId);
      const photosRes = await ownerApartmentsAPI.listPhotos(params.id);
      setPhotos(photosRes.data.photos);
    } catch (err) {
      setError(handleAPIError(err, 'pt'));
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Excluir esta foto?')) {return;}
    try {
      await ownerApartmentsAPI.deletePhoto(photoId);
      setPhotos((prev) => prev?.filter((p) => p.id !== photoId) ?? null);
    } catch (err) {
      setError(handleAPIError(err, 'pt'));
    }
  };

  if (authLoading || (!apartment && !error)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/owner" className="mb-6 inline-block text-sm text-blue-600 hover:underline">
        ← Voltar para meus apartamentos
      </Link>

      {error && !apartment && (
        <Alert variant="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {apartment && (
        <>
          <h1 className="mb-6 text-2xl font-semibold">{apartment.name}</h1>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle size="sm">Informações</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <Textarea
                  label="Descrição"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
                <Input
                  label="Bairro"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Quartos"
                    type="number"
                    min={0}
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                  />
                  <Input
                    label="Banheiros"
                    type="number"
                    min={0}
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                  />
                </div>
                <Input
                  label="Comodidades"
                  value={amenitiesText}
                  onChange={(e) => setAmenitiesText(e.target.value)}
                  helperText="Separadas por vírgula, ex: Wi-Fi, Ar condicionado, Cozinha"
                />

                {error && (
                  <Alert variant="danger">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {saveMessage && (
                  <Alert variant="success">
                    <AlertDescription>{saveMessage}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={saving} className="w-full justify-center">
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle size="sm">Fotos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos?.map((photo) => (
                  <div key={photo.id} className="group relative overflow-hidden rounded-lg border">
                    <div className="relative aspect-square">
                      <Image
                        src={photo.image_url}
                        alt={photo.alt_text ?? apartment.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    {photo.is_primary && (
                      <span className="absolute left-1 top-1 rounded bg-blue-600 px-1.5 py-0.5 text-xs text-white">
                        Principal
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {!photo.is_primary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(photo.id)}
                          className="flex-1 rounded bg-white/90 px-1 py-0.5 text-xs hover:bg-white"
                        >
                          Tornar principal
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="rounded bg-white/90 px-1 py-0.5 text-xs text-red-600 hover:bg-white"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <label className="block">
                <span className="sr-only">Enviar foto</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadPhoto}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700 disabled:opacity-50"
                />
              </label>
              {uploading && <p className="mt-2 text-sm text-gray-500">Enviando...</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
