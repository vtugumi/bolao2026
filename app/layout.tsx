import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { AuthGuard } from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Heartbeat from '@/components/Heartbeat';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Bolao Copa 2026',
  description:
    'Bolao da Copa do Mundo 2026 - Faca seus palpites e dispute com seus amigos!',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} flex flex-col min-h-screen bg-gray-50 text-gray-900`}>
        <AuthProvider>
          <Heartbeat />
          <Navbar />
          <AuthGuard>
            <main className="flex-1">{children}</main>
          </AuthGuard>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
