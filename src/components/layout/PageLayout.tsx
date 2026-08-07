import React, { useState } from 'react';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';

interface PageLayoutProps {
  children: React.ReactNode;
  pageName: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ children, pageName }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav onMenuClick={() => setSidebarOpen(!sidebarOpen)} pageName={pageName} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="pt-16 lg:ml-64 min-h-[calc(100vh-4rem)]">
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
