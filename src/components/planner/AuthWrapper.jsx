import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Loader2 } from 'lucide-react';
import Landing from '@/pages/Landing';

export default function AuthWrapper({ children }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return children;
}