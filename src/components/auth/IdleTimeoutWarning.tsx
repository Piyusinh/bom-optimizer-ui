import React from 'react';
import { useUser } from '@/contexts/UserContext';

export const IdleTimeoutWarning: React.FC = () => {
  const { showIdleWarning, stayLoggedIn, logout } = useUser();

  if (!showIdleWarning) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4 animate-in fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Session Expiring</h3>
            <p className="text-sm text-gray-500">You'll be logged out due to inactivity.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={stayLoggedIn}
            className="flex-1 py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            Stay Logged In
          </button>
          <button
            onClick={logout}
            className="flex-1 py-2 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};
