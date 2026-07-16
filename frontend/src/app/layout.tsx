// ==============================================
// PingAlert Pro — Root Layout
// ==============================================

import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'PingAlert Pro — Network Monitoring System',
  description: 'Professional network equipment monitoring with real-time alerts via Telegram and WhatsApp',
  keywords: 'network monitoring, ping, ICMP, equipment, alerts, telegram, whatsapp',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={spaceGrotesk.variable}>
      <body className={spaceGrotesk.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
