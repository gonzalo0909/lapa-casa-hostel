// lapa-casa-hostel/frontend/src/lib/owner-api.ts
//
// Cliente API para el panel de administradores de apartamento, alineado
// con backend/src/routes/owner/*.ts. Usa la cookie httpOnly `lch_owner`
// (credentials: 'include' ya está seteado en api.ts) -- este cliente
// nunca maneja el token directamente.

import { api, APIError } from './api';

export interface OwnerProfile {
  fullName: string;
  email: string;
  mustChangePassword: boolean;
}

export interface Apartment {
  id: string;
  code: string;
  name: string;
  capacity: number;
  base_price: number;
  description: string | null;
  neighborhood: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  amenities: unknown;
  external_rating: number | null;
  external_review_count: number | null;
  external_rating_label: string | null;
}

export interface ApartmentPhoto {
  id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
  alt_text: string | null;
  created_at: string;
}

export const ownerAuthAPI = {
  login: (email: string, password: string) =>
    api.post<{ success: boolean; data: OwnerProfile; message: string }>('/owner/login', {
      email,
      password,
    }),

  changePassword: (newPassword: string) =>
    api.post<{ success: boolean; message: string }>('/owner/login/change-password', {
      newPassword,
    }),

  logout: () => api.post<{ success: boolean; message: string }>('/owner/login/logout'),

  me: () => api.get<{ success: boolean; data: OwnerProfile }>('/owner/me'),
};

export const ownerApartmentsAPI = {
  list: () =>
    api.get<{ success: boolean; data: { apartments: Apartment[] } }>('/owner/apartments'),

  getById: (id: string) =>
    api.get<{ success: boolean; data: Apartment }>(`/owner/apartments/${id}`),

  update: (
    id: string,
    data: Partial<
      Pick<Apartment, 'description' | 'neighborhood' | 'bedrooms' | 'bathrooms' | 'amenities'>
    >
  ) => api.put<{ success: boolean; data: Apartment; message: string }>(`/owner/apartments/${id}`, data),

  listPhotos: (id: string) =>
    api.get<{ success: boolean; data: { photos: ApartmentPhoto[] } }>(
      `/owner/apartments/${id}/photos`
    ),

  uploadPhoto: async (id: string, file: File, altText?: string) => {
    const formData = new FormData();
    formData.append('photo', file);
    if (altText) {formData.append('altText', altText);}

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/owner/apartments/${id}/photos`,
      { method: 'POST', body: formData, credentials: 'include' }
    );
    const responseData = await res.json();
    if (!res.ok) {
      throw new APIError(responseData?.message || responseData?.error || 'Error al subir la foto', res.status);
    }
    return responseData as { success: boolean; data: { photo: ApartmentPhoto }; message: string };
  },

  setPrimaryPhoto: (photoId: string) =>
    api.patch<{ success: boolean; data: ApartmentPhoto; message: string }>(
      `/owner/apartments/photos/${photoId}`,
      { isPrimary: true }
    ),

  deletePhoto: (photoId: string) =>
    api.delete<{ success: boolean; message: string }>(`/owner/apartments/photos/${photoId}`),
};

const ownerAPI = { ownerAuthAPI, ownerApartmentsAPI };
export default ownerAPI;
