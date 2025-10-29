import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Installer Scheduling API',
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
