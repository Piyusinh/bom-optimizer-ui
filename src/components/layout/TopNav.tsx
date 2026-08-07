import React from 'react';
import { useUser } from '@/contexts/UserContext';

interface TopNavProps {
  onMenuClick: () => void;
  pageName: string;
}

export const TopNav: React.FC<TopNavProps> = ({ onMenuClick, pageName }) => {
  const { user } = useUser();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center px-4 gap-4">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-900">BOM Optimizer</h1>
          <p className="text-xs text-gray-500">{pageName}</p>
        </div>
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden sm:inline-block text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
          Local Dev
        </span>
        {user && (
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xs font-semibold text-blue-700">
                {user.full_name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <span className="text-xs text-gray-600">{user.full_name}</span>
          </div>
        )}
      </div>
    </header>
  );
};
