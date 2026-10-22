import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '../lib/i18n';
import { AuthProvider } from '../lib/authContext';

export const metadata: Metadata = {
  title: 'Painel Operacional | Padaria da Vila',
  description: 'Sistema integrado de gestão de encomendas, KDS de padaria/pastelaria e rotas de entrega.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'none',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body className="min-h-screen bg-bakery-50/50 text-gray-900 antialiased selection:bg-bakery-500 selection:text-white">
        <LanguageProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
