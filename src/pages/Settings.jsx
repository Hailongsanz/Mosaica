import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  User, Moon, Sun, Globe, Clock, Calendar, Bell, 
  LogOut, ChevronLeft, Loader2, Check, Palette, Upload, Sparkles, RotateCcw
} from "lucide-react";
import { DEFAULT_CATEGORY_COLORS } from '@/lib/categoryColors';

// HSL <-> Hex conversion helpers
function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function ColorSliderPicker({ value, onChange, label }) {
  const [hsl, setHsl] = useState(() => hexToHsl(value));
  const debounceRef = useRef(null);

  useEffect(() => {
    setHsl(hexToHsl(value));
  }, [value]);

  const handleChange = useCallback((index, val) => {
    const newHsl = [...hsl];
    newHsl[index] = parseInt(val);
    setHsl(newHsl);
    const hex = hslToHex(newHsl[0], newHsl[1], newHsl[2]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(hex), 50);
  }, [hsl, onChange]);

  const hueGradient = 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)';
  const satGradient = `linear-gradient(to right, hsl(${hsl[0]}, 0%, ${hsl[2]}%), hsl(${hsl[0]}, 100%, ${hsl[2]}%))`;
  const lightGradient = `linear-gradient(to right, hsl(${hsl[0]}, ${hsl[1]}%, 0%), hsl(${hsl[0]}, ${hsl[1]}%, 50%), hsl(${hsl[0]}, ${hsl[1]}%, 100%))`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl shadow-inner border border-gray-200 dark:border-gray-600" style={{ backgroundColor: hslToHex(hsl[0], hsl[1], hsl[2]) }} />
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
          <p className="text-xs text-gray-400">{hslToHex(hsl[0], hsl[1], hsl[2])}</p>
        </div>
      </div>
      <div className="space-y-2">
        <div>
          <input type="range" min="0" max="360" value={hsl[0]} onChange={(e) => handleChange(0, e.target.value)}
            className="w-full h-3 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-gray-400 [&::-webkit-slider-thumb]:shadow-md"
            style={{ background: hueGradient }} />
        </div>
        <div>
          <input type="range" min="0" max="100" value={hsl[1]} onChange={(e) => handleChange(1, e.target.value)}
            className="w-full h-3 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-gray-400 [&::-webkit-slider-thumb]:shadow-md"
            style={{ background: satGradient }} />
        </div>
        <div>
          <input type="range" min="5" max="95" value={hsl[2]} onChange={(e) => handleChange(2, e.target.value)}
            className="w-full h-3 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-gray-400 [&::-webkit-slider-thumb]:shadow-md"
            style={{ background: lightGradient }} />
        </div>
      </div>
    </div>
  );
}
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getTranslation } from '@/components/planner/translations';
import { useAuth } from '@/lib/AuthContext';
import { userSettingsService } from '@/firebase/firestore';
import { cloudinaryService } from '@/api/cloudinary';
import { updateUserProfile } from '@/firebase/auth';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'ar', name: 'العربية' }
];

const categories = [
  { value: 'work', label: 'Work' },
  { value: 'personal', label: 'Personal' },
  { value: 'health', label: 'Health' },
  { value: 'social', label: 'Social' },
  { value: 'travel', label: 'Travel' },
  { value: 'other', label: 'Other' }
];

const subscriptionTiers = {
  free: { name: 'Free', price: '$0', planner: 3, courage: 0 },
  mid: { name: 'Mid Tier', price: '$3.99/mo', planner: 'Unlimited', courage: 10 },
  top: { name: 'Top Tier', price: '$4.99/mo', planner: 'Unlimited', courage: 'Unlimited' }
};

export default function Settings() {
  const { user, logout, checkAppState, refreshUser, updateUserField } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [avatarKey, setAvatarKey] = useState(Date.now());
  const queryClient = useQueryClient();

  // Debug: Log user object changes
  useEffect(() => {
    console.log('=== User object changed in Settings ===');
    console.log('Full user object:', user);
    console.log('user.photoURL:', user?.photoURL);
    console.log('user.profile_picture:', user?.profile_picture);
  }, [user]);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['userSettings', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return null;
      const result = await userSettingsService.getForCurrentUser();
      return result || {
        theme: 'light',
        language: 'en',
        time_format: '12h',
        week_starts_on: 'sunday',
        default_event_duration: 60,
        notifications_enabled: true,
        default_category: 'other'
      };
    },
    enabled: !!user?.uid
  });

  const t = (key) => getTranslation(settings?.language || 'en', key);

  useEffect(() => {
    console.log('User object in Settings:', user);
  }, [user]);

  const saveMutation = useMutation({
    mutationFn: async (newSettings) => {
      if (settings?.id) {
        return userSettingsService.update(settings.id, newSettings);
      } else {
        return userSettingsService.create({ 
          ...newSettings, 
          user_email: user?.email 
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  });

  const handleSettingChange = async (key, value) => {
    setSaving(true);
    try {
      await saveMutation.mutateAsync({ ...settings, [key]: value });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    console.log('Starting photo upload, current user:', user);
    
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert(t('uploadJpgPng'));
      return;
    }

    setUploadingPhoto(true);
    try {
      const uploadResult = await cloudinaryService.uploadProfilePicture(file);
      console.log('=== Upload Result ===');
      console.log('Upload result:', uploadResult);
      console.log('File URL:', uploadResult.file_url);
      
      // Update Firebase Auth and Firestore
      console.log('Updating Firebase Auth profile...');
      await updateUserProfile(user?.displayName || '', uploadResult.file_url);
      console.log('Firebase Auth profile updated');
      
      // Wait a moment for Firebase to propagate changes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force a full app state refresh
      console.log('Forcing app state refresh...');
      await checkAppState();
      console.log('App state refreshed');
      
      // Force avatar re-render
      setAvatarKey(Date.now());
      
      console.log('Profile picture updated, new URL:', uploadResult.file_url);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert(t('failedUploadPhoto'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('settings')}</h1>
            <p className="text-sm text-gray-500">{t('managePreferences')}</p>
          </div>
          {(saving || saved) && (
            <div className="ml-auto flex items-center gap-2 text-sm">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="text-gray-400">{t('saving')}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">{t('saved')}</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Account Section */}
          <Card className="rounded-2xl border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-[#2a2a2e]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5 text-gray-400" />
                {t('account')}
              </CardTitle>
              <CardDescription>{t('yourAccountInfo')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{user.full_name || 'User'}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <div key={avatarKey} className="relative group">
                  {(() => {
                    const profilePic = user.profile_picture || user.photoURL;
                    console.log('Rendering avatar, user.profile_picture:', user.profile_picture);
                    console.log('Rendering avatar, user.photoURL:', user.photoURL);
                    console.log('Using profile pic:', profilePic);
                    return profilePic ? (
                    <img 
                      src={profilePic} 
                      alt="Profile" 
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                      onError={(e) => {
                        console.error('Failed to load profile picture:', profilePic);
                        console.error('Image error event:', e);
                      }}
                      onLoad={() => {
                        console.log('Profile picture loaded successfully:', profilePic);
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-xl font-medium text-gray-600">
                        {(user.full_name || user.email || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                  );
                  })()}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    {uploadingPhoto ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-white" />
                    )}
                    <input 
                      type="file" 
                      accept=".jpg,.jpeg,.png"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploadingPhoto}
                    />
                  </label>
                </div>
              </div>
              <p className="text-xs text-gray-400">{t('hoverToUpload')}</p>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className="rounded-2xl border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-[#2a2a2e]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="w-5 h-5 text-gray-400" />
                {t('appearance')}
              </CardTitle>
              <CardDescription>{t('customizeAppearance')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {settings?.theme === 'dark' ? (
                    <Moon className="w-5 h-5 text-gray-500" />
                  ) : (
                    <Sun className="w-5 h-5 text-gray-500" />
                  )}
                  <div>
                    <Label className="text-base">{t('theme')}</Label>
                    <p className="text-sm text-gray-500">{t('chooseTheme')}</p>
                  </div>
                </div>
                <Select 
                  value={settings?.theme || 'light'} 
                  onValueChange={(v) => handleSettingChange('theme', v)}
                >
                  <SelectTrigger className="w-32 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t('light')}</SelectItem>
                    <SelectItem value="dark">{t('dark')}</SelectItem>
                    <SelectItem value="system">{t('system')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-gray-500" />
                  <div>
                    <Label className="text-base">{t('language')}</Label>
                    <p className="text-sm text-gray-500">{t('selectLanguage')}</p>
                  </div>
                </div>
                <Select 
                  value={settings?.language || 'en'} 
                  onValueChange={(v) => handleSettingChange('language', v)}
                >
                  <SelectTrigger className="w-32 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>


            </CardContent>
          </Card>

          {/* Subscription & Usage */}
          <Card className="rounded-2xl border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-[#2a2a2e]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-gray-400" />
                {t('subscriptionUsage')}
              </CardTitle>
              <CardDescription>{t('managePlanUsage')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">{t('currentPlan')}</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      {subscriptionTiers[settings?.subscription_tier || 'free'].name} - {subscriptionTiers[settings?.subscription_tier || 'free'].price}
                    </p>
                  </div>
                  {settings?.subscription_tier === 'free' && (
                    <Button 
                      variant="default" 
                      className="rounded-xl"
                      onClick={() => alert(t('stripeComingSoon'))}
                    >
                      {t('upgrade')}
                    </Button>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">{t('aiPlannerUsage')}</Label>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm text-gray-500">
                        {settings?.usage?.planner_requests || 0} / {subscriptionTiers[settings?.subscription_tier || 'free'].planner} {t('requestsThisMonth')}
                      </p>
                      <span className="text-xs text-gray-400">
                        {t('resets')} {settings?.usage?.reset_date ? new Date(settings.usage.reset_date).toLocaleDateString() : t('monthly')}
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">{t('courageChatUsage')}</Label>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm text-gray-500">
                        {settings?.subscription_tier === 'free' 
                          ? t('lockedRequiresSub') 
                          : `${settings?.usage?.courage_uses || 0} / ${subscriptionTiers[settings?.subscription_tier || 'free'].courage} ${t('usesThisMonth')}`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Preferences */}
          <Card className="rounded-2xl border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-[#2a2a2e]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-gray-400" />
                {t('calendarPreferences')}
              </CardTitle>
              <CardDescription>{t('customizeCalendar')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <div>
                    <Label className="text-base">{t('timeFormat')}</Label>
                    <p className="text-sm text-gray-500">{t('hourFormat12or24')}</p>
                  </div>
                </div>
                <Select 
                  value={settings?.time_format || '12h'} 
                  onValueChange={(v) => handleSettingChange('time_format', v)}
                >
                  <SelectTrigger className="w-32 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">{t('hour12')}</SelectItem>
                    <SelectItem value="24h">{t('hour24')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">{t('weekStartsOn')}</Label>
                  <p className="text-sm text-gray-500">{t('firstDayOfWeek')}</p>
                </div>
                <Select 
                  value={settings?.week_starts_on || 'sunday'} 
                  onValueChange={(v) => handleSettingChange('week_starts_on', v)}
                >
                  <SelectTrigger className="w-32 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sunday">{t('sunday')}</SelectItem>
                    <SelectItem value="monday">{t('monday')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">{t('defaultEventDuration')}</Label>
                  <p className="text-sm text-gray-500">{t('forNewEvents')}</p>
                </div>
                <Select 
                  value={String(settings?.default_event_duration || 60)} 
                  onValueChange={(v) => handleSettingChange('default_event_duration', parseInt(v))}
                >
                  <SelectTrigger className="w-32 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">{t('min15')}</SelectItem>
                    <SelectItem value="30">{t('min30')}</SelectItem>
                    <SelectItem value="60">{t('hour1')}</SelectItem>
                    <SelectItem value="90">{t('hours1_5')}</SelectItem>
                    <SelectItem value="120">{t('hours2')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">{t('defaultCategory')}</Label>
                  <p className="text-sm text-gray-500">{t('forNewEvents')}</p>
                </div>
                <Select 
                  value={settings?.default_category || 'other'} 
                  onValueChange={(v) => handleSettingChange('default_category', v)}
                >
                  <SelectTrigger className="w-32 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {t(cat.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Category Colors */}
          <Card className="rounded-2xl border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-[#2a2a2e]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Palette className="w-5 h-5 text-gray-400" />
                    {t('categoryColors')}
                  </CardTitle>
                  <CardDescription>{t('customizeCategoryColors')}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => handleSettingChange('category_colors', {})}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  {t('resetToDefault')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {categories.map((cat, idx) => {
                const currentColor = settings?.category_colors?.[cat.value] || DEFAULT_CATEGORY_COLORS[cat.value];
                return (
                  <React.Fragment key={cat.value}>
                    {idx > 0 && <Separator />}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">{t(cat.value)}</Label>
                        <p className="text-sm text-gray-500">{currentColor}</p>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className="w-10 h-10 rounded-2xl border-2 border-gray-200 dark:border-gray-600 cursor-pointer shadow-sm hover:scale-105 transition-transform"
                            style={{ backgroundColor: currentColor }}
                          />
                        </PopoverTrigger>
                        <PopoverContent className="w-64 rounded-2xl p-4" align="end">
                          <ColorSliderPicker
                            value={currentColor}
                            label={t(cat.value)}
                            onChange={(hex) => {
                              const updated = { ...(settings?.category_colors || {}), [cat.value]: hex };
                              handleSettingChange('category_colors', updated);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </React.Fragment>
                );
              })}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="rounded-2xl border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-[#2a2a2e]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="w-5 h-5 text-gray-400" />
                {t('notifications')}
              </CardTitle>
              <CardDescription>{t('manageNotifications')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">{t('enableNotifications')}</Label>
                  <p className="text-sm text-gray-500">{t('getReminders')}</p>
                </div>
                <Switch
                  checked={settings?.notifications_enabled ?? true}
                  onCheckedChange={(v) => handleSettingChange('notifications_enabled', v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Disclaimers & Legal Notice */}
          <Card className="rounded-2xl border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-[#2a2a2e]">
            <CardHeader>
              <CardTitle className="text-lg">{t('disclaimersLegal')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('disclaimer1')}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('disclaimer2')}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('disclaimer3')}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('disclaimer4')}
              </p>
            </CardContent>
          </Card>

          {/* Sign Out */}
          <Card className="rounded-2xl border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-[#2a2a2e]">
            <CardContent className="pt-6">
              <Button 
                variant="outline" 
                className="w-full rounded-xl text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('signOut')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}