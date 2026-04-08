import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Arena — Trading Signal Dashboard',
  description: 'AI Multi-Agent Trading Signal System Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white">
        <div className="min-h-screen">
          <header className="border-b border-gray-800 px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">The Arena</h1>
              <div className="flex items-center gap-4">
                <span className="rounded bg-green-900 px-3 py-1 text-sm text-green-300">NY Session</span>
                <span className="text-sm text-gray-400">10 Agents Active</span>
              </div>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
