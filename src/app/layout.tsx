
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/providers/AuthProvider';
import { Toaster } from "@/components/ui/toaster";
import Header from '@/components/layout/Header'; // Import Header component

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'StorySync', // Updated App Name
  description: 'Collaborative Story Writing Platform', // Updated Description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body className="antialiased">
        <AuthProvider>
          <Header /> {/* Add Header here */}
          <main className="container mx-auto px-4 py-8">
             {children}
          </main>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
