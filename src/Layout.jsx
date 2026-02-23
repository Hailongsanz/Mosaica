import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { userSettingsService } from '@/firebase/firestore';
import AuthWrapper from '@/components/planner/AuthWrapper';

export default function Layout({ children, currentPageName }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState({ theme: 'light' });

  // Fetch user settings from Firestore
  const { data: userSettings } = useQuery({
    queryKey: ['userSettings', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return null;
      try {
        const result = await userSettingsService.getForCurrentUser();
        return result || { theme: 'light' };
      } catch (error) {
        console.error('Error fetching user settings:', error);
        return { theme: 'light' };
      }
    },
    enabled: !!user?.uid,
  });

  useEffect(() => {
    if (userSettings) {
      setSettings(userSettings);
    }
  }, [userSettings]);

  const theme = settings?.theme || 'light';
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Apply .dark to <html> so Radix UI portals (Popover, Select, Dialog, etc.)
  // rendered at document.body level also receive dark: Tailwind variants
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <AuthWrapper>
      <div className={isDark ? 'dark' : ''}>
        <style>{`
          :root {
            --background: ${isDark ? '20 14.3% 4.1%' : '0 0% 100%'};
            --foreground: ${isDark ? '0 0% 95%' : '20 14.3% 4.1%'};
            --card: ${isDark ? '20 14.3% 4.1%' : '0 0% 100%'};
            --card-foreground: ${isDark ? '0 0% 95%' : '20 14.3% 4.1%'};
            --popover: ${isDark ? '20 14.3% 8%' : '0 0% 100%'};
            --popover-foreground: ${isDark ? '0 0% 95%' : '20 14.3% 4.1%'};
            --primary: ${isDark ? '0 0% 98%' : '24 9.8% 10%'};
            --primary-foreground: ${isDark ? '20 14.3% 4.1%' : '0 0% 98%'};
            --secondary: ${isDark ? '20 14.3% 14.1%' : '60 4.8% 95.9%'};
            --secondary-foreground: ${isDark ? '0 0% 98%' : '24 9.8% 10%'};
            --muted: ${isDark ? '20 14.3% 14.1%' : '60 4.8% 95.9%'};
            --muted-foreground: ${isDark ? '0 0% 65%' : '25 5.3% 44.7%'};
            --accent: ${isDark ? '20 14.3% 14.1%' : '60 4.8% 95.9%'};
            --accent-foreground: ${isDark ? '0 0% 98%' : '24 9.8% 10%'};
            --border: ${isDark ? '20 14.3% 14.1%' : '20 5.9% 90%'};
            --input: ${isDark ? '20 14.3% 14.1%' : '20 5.9% 90%'};
            --ring: ${isDark ? '20 14.3% 60%' : '20 14.3% 4.1%'};
          }
          
          .dark {
            color-scheme: dark;
          }
          
          .dark body,
          .dark .min-h-screen {
            background: linear-gradient(to bottom right, #111, #1a1a1a, #111) !important;
            color: #f5f5f5;
          }
          
          .dark .bg-gray-50,
          .dark .bg-gray-100 {
            background-color: #252525 !important;
          }
          
          .dark .bg-gray-50\\/50 {
            background-color: rgba(37, 37, 37, 0.5) !important;
          }
          
          .dark .bg-gradient-to-br {
            background: linear-gradient(to bottom right, #111, #1a1a1a, #111) !important;
          }
          
          .dark .text-gray-900 {
            color: #f5f5f5 !important;
          }
          
          .dark .text-gray-700 {
            color: #d4d4d4 !important;
          }
          
          .dark .text-gray-600,
          .dark .text-gray-500 {
            color: #a3a3a3 !important;
          }
          
          .dark .text-gray-400 {
            color: #737373 !important;
          }
          
          .dark .border-gray-100,
          .dark .border-gray-200 {
            border-color: #333 !important;
          }
          
          .dark .hover\\:bg-gray-50:hover {
            background-color: #252525 !important;
          }
          
          .dark .shadow-sm {
            box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.3);
          }
          
          .dark input,
          .dark textarea,
          .dark select {
            background-color: #252525 !important;
            border-color: #333 !important;
            color: #f5f5f5 !important;
          }
          
          .dark input::placeholder,
          .dark textarea::placeholder {
            color: #666 !important;
          }
          
          .amber-scroll::-webkit-scrollbar {
            width: 4px;
          }
          .amber-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .amber-scroll::-webkit-scrollbar-thumb {
            background-color: #fde68a;
            border-radius: 9999px;
          }
          .amber-scroll::-webkit-scrollbar-thumb:hover {
            background-color: #fbbf24;
          }
          .dark .amber-scroll::-webkit-scrollbar-thumb {
            background-color: #374151;
          }
          .dark .amber-scroll::-webkit-scrollbar-thumb:hover {
            background-color: #4b5563;
          }
        `}</style>
        {children}
      </div>
    </AuthWrapper>
  );
}