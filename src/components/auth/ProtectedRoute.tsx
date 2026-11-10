import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPage?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPage }) => {
  const { isAuthenticated, isLoading, hasPageAccess, refreshUser } = useUser();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      refreshUser();
    }
  }, [location.pathname, location.search, isAuthenticated, refreshUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const pagePath = requiredPage || location.pathname;
  if (!hasPageAccess(pagePath)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">Access Denied</h2>
          <p className="text-sm text-gray-500 mt-1">You do not have permission to view this page.</p>
          <a href="/" className="inline-block mt-4 text-sm text-blue-600 hover:underline">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
