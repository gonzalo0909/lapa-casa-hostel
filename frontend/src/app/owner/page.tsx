'use client';

// lapa-casa-hostel/frontend/src/app/owner/page.tsx
//
// Painel principal: lista os apartamentos do dono logado
// (GET /owner/apartments -- já filtrado por ownerId no backend).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useOwnerAuth } from '@/lib/use-owner-auth';
import { ownerApartmentsAPI, ownerAuthAPI, type Apartment } from '@/lib/owner-api';
import { handleAPIError } from '@/lib/api';

export default function OwnerDashboardPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useOwnerAuth();
  const [apartments, setApartments] = useState<Apartment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) {return;}
    ownerApartmentsAPI
      .list()
      .then((res) => setApartments(res.data.apartments))
      .catch((err) => setError(handleAPIError(err, 'pt')));
  }, [profile]);

  const handleLogout = async () => {
    try {
      await ownerAuthAPI.logout();
    } finally {
      router.push('/owner/login');
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando..." />
      </div>
    );
  }

  if (!profile) {return null;}

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Olá, {profile.fullName}</h1>
          <p className="text-sm text-gray-500">{profile.email}</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Sair
        </Button>
      </div>

      {error && (
        <Alert variant="danger" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!apartments && !error && (
        <LoadingSpinner centered text="Carregando apartamentos..." />
      )}

      {apartments && apartments.length === 0 && (
        <Alert variant="info">
          <AlertDescription>
            Nenhum apartamento vinculado à sua conta ainda.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4">
        {apartments?.map((apt) => (
          <Link key={apt.id} href={`/owner/apartments/${apt.id}`}>
            <Card>
              <CardHeader>
                <CardTitle size="sm">{apt.name}</CardTitle>
                <CardDescription>
                  {apt.code} · {apt.capacity} hóspedes
                  {apt.neighborhood ? ` · ${apt.neighborhood}` : ''}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
