import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, BellRing, Check } from "lucide-react";

export default function ReminderSettings({ settings, onSave, isSaving }) {
  const [reminderEnabled, setReminderEnabled] = useState(settings?.notifications_enabled ?? true);
  const [reminderTime, setReminderTime] = useState(settings?.reminder_time || '15');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setReminderEnabled(settings.notifications_enabled ?? true);
      setReminderTime(settings.reminder_time || '15');
    }
  }, [settings]);

  const handleSave = () => {
    onSave({
      notifications_enabled: reminderEnabled,
      reminder_time: reminderTime
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card className="rounded-2xl border-gray-200 dark:border-gray-600 shadow-sm bg-white dark:!bg-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-400" />
          Reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BellRing className="w-5 h-5 text-gray-500" />
            <div>
              <Label className="text-sm font-medium">Enable Reminders</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Get notified before events</p>
            </div>
          </div>
          <Switch
            checked={reminderEnabled}
            onCheckedChange={setReminderEnabled}
          />
        </div>

        {reminderEnabled && (
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Remind Me</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Before event starts</p>
            </div>
            <Select value={reminderTime} onValueChange={setReminderTime}>
              <SelectTrigger className="w-32 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="1440">1 day</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full rounded-xl"
          size="sm"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4 mr-1" />
              Saved
            </>
          ) : (
            'Save Preferences'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}