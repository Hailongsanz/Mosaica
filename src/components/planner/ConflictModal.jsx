import React from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, Loader2 } from "lucide-react";
import { getBadgeStyle } from '@/lib/categoryColors';

function EventPreview({ event, label, userColors }) {
  return (
    <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <h4 className="font-medium text-gray-900 dark:text-white">{event.title}</h4>
      <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
        <Clock className="w-3.5 h-3.5" />
        <span>{event.start_time}{event.end_time ? ` - ${event.end_time}` : ''}</span>
        <Badge className="text-xs" style={getBadgeStyle(event.category || 'other', userColors)}>
          {event.category || 'other'}
        </Badge>
      </div>
    </div>
  );
}

export default function ConflictModal({ 
  isOpen, 
  onClose, 
  newEvent, 
  conflictingEvent, 
  onAddAnyway, 
  onKeepCurrent, 
  onReplace,
  isProcessing,
  t = (k) => k,
  categoryColors: userColors 
}) {
  if (!newEvent || !conflictingEvent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {t('scheduleConflict')}
          </DialogTitle>
          <DialogDescription>
            {t('conflictDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          <EventPreview event={conflictingEvent} label={t('existingEvent')} userColors={userColors} />
          <EventPreview event={newEvent} label={t('newEvent')} userColors={userColors} />
        </div>

        <div className="flex flex-col gap-2">
          <Button 
            onClick={onAddAnyway} 
            disabled={isProcessing}
            className="rounded-xl"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {t('addAnywayKeepBoth')}
          </Button>
          <Button 
            variant="outline" 
            onClick={onKeepCurrent} 
            disabled={isProcessing}
            className="rounded-xl"
          >
            {t('keepCurrentDiscardNew')}
          </Button>
          <Button 
            variant="destructive" 
            onClick={onReplace} 
            disabled={isProcessing}
            className="rounded-xl"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {t('replaceDeleteCurrent')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}