import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Installer Scheduling',
  description: 'AI-powered scheduling system for construction installers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
