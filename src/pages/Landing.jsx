import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Sparkles, Clock, Globe, ArrowRight } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  
  const handleGetStarted = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-amber-50/40 to-white text-gray-900">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xl font-bold text-gray-900">Mosaica</span>
          </div>
        </nav>

        <div className="py-20 sm:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 border border-amber-200 text-sm text-amber-700 mb-8">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>AI-Powered Scheduling</span>
          </div>
          
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl mx-auto leading-tight text-gray-900">
            Your schedule,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">
              simplified
            </span>
          </h1>
          
          <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto">
            Just tell us about your events in plain language. We'll organize everything into a beautiful calendar for you.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={handleGetStarted}
              className="bg-amber-500 text-white hover:bg-amber-600 rounded-xl px-8 h-12 text-base font-medium flex items-center transition-colors shadow-sm"
            >
              Let's go!
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>

          {/* Demo Preview */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none" />
            <div className="bg-white rounded-3xl border border-amber-100 shadow-xl shadow-amber-100/60 p-4 sm:p-8 max-w-4xl mx-auto">
              <div className="bg-gray-50 rounded-2xl p-6 text-left border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-3 flex-1 shadow-sm">
                      <p className="text-sm text-gray-600">
                        "I have a meeting with Sarah tomorrow at 2pm, dentist on Friday at 10am, and gym every Monday at 7am"
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 ml-8">
                    <div className="flex gap-2 flex-wrap">
                      <div className="bg-amber-100 text-amber-800 text-xs px-3 py-1.5 rounded-lg font-medium">
                        Meeting with Sarah — Tomorrow 2:00 PM
                      </div>
                      <div className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-3 py-1.5 rounded-lg font-medium">
                        Dentist — Friday 10:00 AM
                      </div>
                      <div className="bg-yellow-50 text-yellow-800 border border-yellow-200 text-xs px-3 py-1.5 rounded-lg font-medium">
                        Gym — Every Monday 7:00 AM
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="py-20 border-t border-amber-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-white border border-amber-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Natural Language Input</h3>
              <p className="text-gray-500 text-sm">
                Just type like you're talking to an assistant. We understand dates, times, and recurring events.
              </p>
            </div>
            
            <div className="p-6 rounded-2xl bg-white border border-amber-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Smart Scheduling</h3>
              <p className="text-gray-500 text-sm">
                Automatically categorizes your events and keeps your schedule organized and easy to read.
              </p>
            </div>
            
            <div className="p-6 rounded-2xl bg-white border border-amber-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Access Anywhere</h3>
              <p className="text-gray-500 text-sm">
                Your schedule syncs across all your devices. Check your calendar from anywhere.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="py-20 text-center border-t border-amber-100">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">Ready to get organized?</h2>
          <p className="text-gray-500 mb-8">Join thousands of users who simplified their scheduling.</p>
          <button 
            onClick={handleGetStarted}
            className="bg-amber-500 text-white hover:bg-amber-600 rounded-xl px-8 h-12 text-base font-medium inline-flex items-center transition-colors shadow-sm"
          >
            Create Free Account
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>

        {/* Footer */}
        <footer className="py-8 border-t border-amber-100 text-center text-sm text-gray-400">
          <p>© 2026 Mosaica. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}