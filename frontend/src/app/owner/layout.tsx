// lapa-casa-hostel/frontend/src/app/owner/layout.tsx
//
// Root layout propio de /owner (panel de administradores de apartamento).
// No cuelga de app/[locale]/layout.tsx -- middleware.ts excluye /owner del
// prefijo de idioma (ver comentario ahí), así que /owner necesita su
// propio <html>/<body>, como cualquier segmento raíz de la App Router.
// Herramienta interna en un solo idioma (portugués), sin next-intl.

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Painel do Proprietário — Lapa Casa Hostel',
  robots: { index: false, follow: false },
};

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} min-h-screen bg-gray-50 text-gray-900`}>
        {children}
      </body>
    </html>
  );
}
