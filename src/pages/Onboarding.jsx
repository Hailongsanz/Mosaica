import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Sparkles, Brain, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { userSettingsService } from '@/firebase/firestore';
import { useToast } from '@/components/ui/use-toast';

function getNextMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

export default function Onboarding() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Auth guard + skip if already onboarded
  useEffect(() => {
    if (isLoadingAuth) return;
    if (!isAuthenticated) {
      navigate('/landing', { replace: true });
      return;
    }
    userSettingsService.getForCurrentUser().then((settings) => {
      if (settings?.onboarding_complete) {
        navigate('/', { replace: true });
      }
    }).finally(() => setChecking(false));
  }, [isAuthenticated, isLoadingAuth]);

  const handleGetStarted = async () => {
    setLoading(true);
    try {
      await userSettingsService.create({
        user_email: user.email,
        theme: 'light',
        language: 'en',
        subscription_tier: 'free',
        onboarding_complete: true,
        usage: {
          planner_requests: 0,
          courage_uses: 0,
          reset_date: getNextMonthStart(),
        },
      });
      navigate('/');
    } catch (err) {
      console.error('Onboarding create error:', err);
      toast({
        title: 'Something went wrong',
        description: 'Could not save your settings. Continuing anyway...',
        variant: 'destructive',
      });
      navigate('/');
    }
  };

  if (isLoadingAuth || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-amber-50/40 to-white">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-amber-50/40 to-white text-gray-900 flex flex-col">
      <div className="max-w-lg mx-auto px-6 flex flex-col flex-1 justify-center py-20">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-12">
          <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-amber-600" />
          </div>
          <span className="text-xl font-bold text-gray-900">Mosaica</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight text-gray-900 mb-4">
          Welcome to{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">
            Mosaica
          </span>
        </h1>
        <p className="text-lg text-gray-500 mb-10">
          Your AI-powered calendar. Just tell it what's on your plate — it handles the rest.
        </p>

        {/* Feature bullets */}
        <div className="space-y-4 mb-12">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Natural language input</p>
              <p className="text-sm text-gray-500">Type like you're talking to a friend. "Dentist Friday at 10am" is all you need.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Everything in one place</p>
              <p className="text-sm text-gray-500">Your events, categories, reminders, and recurring tasks — automatically organized.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Meet Courage</p>
              <p className="text-sm text-gray-500">Your AI planning companion. Talk through your week, set intentions, stay on track.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleGetStarted}
          disabled={loading}
          className="bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-70 rounded-xl px-8 h-12 text-base font-medium flex items-center gap-2 transition-colors shadow-sm self-start"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Let's get started
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
