import React, { useState, useEffect } from 'react';
import { format, parse } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Copy, Trash2, Bell, CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import TimeWheelPicker from './TimeWheelPicker';

const defaultCategories = [
  { value: 'work', label: 'Work' },
  { value: 'personal', label: 'Personal' },
  { value: 'health', label: 'Health' },
  { value: 'social', label: 'Social' },
  { value: 'travel', label: 'Travel' },
  { value: 'other', label: 'Other' }
];

const reminderPresets = [
  { amount: 5, unit: 'minutes', label: '5 minutes before' },
  { amount: 15, unit: 'minutes', label: '15 minutes before' },
  { amount: 30, unit: 'minutes', label: '30 minutes before' },
  { amount: 1, unit: 'hours', label: '1 hour before' },
  { amount: 2, unit: 'hours', label: '2 hours before' },
  { amount: 1, unit: 'days', label: '1 day before' },
  { amount: 2, unit: 'days', label: '2 days before' }
];

export default function EventEditModal({ event, isOpen, onClose, onSave, onDelete, onDuplicate, isSaving, t = (k) => k }) {
  const missingFields = event?._missingFields || [];
  const isCompletionMode = missingFields.length > 0;
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    start_time: '',
    end_time: '',
    category: 'other',
    location: '',
    is_all_day: false,
    reminder_amount: null,
    reminder_unit: null
  });
  const [customCategory, setCustomCategory] = useState('');
  const [useCustomCategory, setUseCustomCategory] = useState(false);

  useEffect(() => {
    if (event) {
      const isCustom = event.category && !defaultCategories.find(c => c.value === event.category);
      setFormData({
        title: event.title || '',
        description: event.description || '',
        date: event.date || '',
        start_time: event.start_time || '',
        end_time: event.end_time || '',
        category: isCustom ? 'custom' : (event.category || 'other'),
        location: event.location || '',
        is_all_day: event.is_all_day || false,
        reminder_amount: event.reminder_amount || null,
        reminder_unit: event.reminder_unit || null
      });
      if (isCustom) {
        setCustomCategory(event.category);
        setUseCustomCategory(true);
      } else {
        setCustomCategory('');
        setUseCustomCategory(false);
      }
    }
  }, [event]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'category' && value === 'custom') {
      setUseCustomCategory(true);
    } else if (field === 'category') {
      setUseCustomCategory(false);
      setCustomCategory('');
    }
  };

  const handleReminderChange = (value) => {
    if (value === 'none') {
      setFormData(prev => ({ ...prev, reminder_amount: null, reminder_unit: null }));
    } else {
      const preset = reminderPresets.find(p => `${p.amount}-${p.unit}` === value);
      if (preset) {
        setFormData(prev => ({ ...prev, reminder_amount: preset.amount, reminder_unit: preset.unit }));
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalCategory = useCustomCategory && customCategory ? customCategory : formData.category;
    onSave({ ...event, ...formData, category: finalCategory });
  };

  const handleDuplicate = () => {
    const finalCategory = useCustomCategory && customCategory ? customCategory : formData.category;
    onDuplicate({ ...event, ...formData, category: finalCategory });
  };

  const currentReminderValue = formData.reminder_amount && formData.reminder_unit 
    ? `${formData.reminder_amount}-${formData.reminder_unit}` 
    : 'none';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCompletionMode 
              ? t('completeEventDetails') 
              : (event?.id ? t('editEvent') : t('newEvent'))}
          </DialogTitle>
          {isCompletionMode && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              {t('fillHighlightedFields')}
            </p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('title')}</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder={t('title')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder={t('description')}
              className="h-20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('date')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground",
                      missingFields.includes('date') && 'ring-2 ring-amber-400 border-amber-400'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date
                      ? format(parse(formData.date, 'yyyy-MM-dd', new Date()), 'PPP')
                      : t('pickADate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date ? parse(formData.date, 'yyyy-MM-dd', new Date()) : undefined}
                    onSelect={(day) => {
                      if (day) {
                        handleChange('date', format(day, 'yyyy-MM-dd'));
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">{t('category')}</Label>
              <Select value={formData.category} onValueChange={(v) => handleChange('category', v)}>
                <SelectTrigger className={missingFields.includes('category') ? 'ring-2 ring-amber-400 border-amber-400' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {defaultCategories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{t(cat.value) || cat.label}</SelectItem>
                  ))}
                  <SelectItem value="custom">{t('customCategory')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {useCustomCategory && (
            <div className="space-y-2">
              <Label htmlFor="customCategory">{t('customCategory')}</Label>
              <Input
                id="customCategory"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder={t('customCategory')}
              />
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="has-time" className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                {t('allDayEvent') || 'All-day event'}
              </Label>
              <Switch
                id="has-time"
                checked={formData.is_all_day}
                onCheckedChange={(v) => {
                  handleChange('is_all_day', v);
                  if (v) {
                    handleChange('start_time', '');
                    handleChange('end_time', '');
                  }
                }}
              />
            </div>

            {!formData.is_all_day && (
              <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-gray-200 dark:border-gray-700">
                <div className="space-y-2">
                  <Label>{t('startTime') || 'Start time'}</Label>
                  <TimeWheelPicker
                    value={formData.start_time}
                    onChange={(v) => handleChange('start_time', v)}
                    label="Start time"
                    highlight={missingFields.includes('time')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('endTime') || 'End time'}</Label>
                  <TimeWheelPicker
                    value={formData.end_time}
                    onChange={(v) => handleChange('end_time', v)}
                    label="End time"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">{t('location')}</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder={t('location')}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              {t('reminder')}
            </Label>
            <Select value={currentReminderValue} onValueChange={handleReminderChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('noReminder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('noReminder')}</SelectItem>
                {reminderPresets.map(preset => (
                  <SelectItem key={`${preset.amount}-${preset.unit}`} value={`${preset.amount}-${preset.unit}`}>
                    {preset.amount} {t(preset.unit)} {t('before')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2">
              {event?.id && onDelete && (
                <Button type="button" variant="destructive" onClick={() => onDelete(event)} size="sm">
                  <Trash2 className="w-4 h-4 mr-1" />
                  {t('delete')}
                </Button>
              )}
              {event?.id && onDuplicate && (
                <Button type="button" variant="outline" onClick={handleDuplicate} size="sm">
                  <Copy className="w-4 h-4 mr-1" />
                  {t('duplicate')}
                </Button>
              )}
            </div>
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t('save')}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}