import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gestão de Encomendas & Produção | 4 Lojas',
  description: 'Sistema integrado de gestão de encomendas, KDS de padaria/pastelaria e rotas de entrega ao domicílio.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body className="min-h-screen bg-bakery-50/50 text-gray-900 antialiased selection:bg-bakery-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
