'use client';

// lapa-casa-hostel/frontend/src/lib/use-owner-auth.ts
//
// Guard de autenticación para páginas de /owner. La sesión vive en la
// cookie httpOnly `lch_owner` -- no hay token que leer en el cliente, así
// que la única forma de saber si hay sesión válida es preguntarle al
// backend (GET /owner/me) y reaccionar a un 401.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { APIError } from './api';
import { ownerAuthAPI, type OwnerProfile } from './owner-api';

export function useOwnerAuth() {
  const router = useRouter();
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    ownerAuthAPI
      .me()
      .then((res) => {
        if (cancelled) {return;}
        if (res.data.mustChangePassword) {
          router.replace('/owner/change-password');
          return;
        }
        setProfile(res.data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) {return;}
        if (err instanceof APIError && err.statusCode === 401) {
          router.replace('/owner/login');
          return;
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return { profile, loading };
}
