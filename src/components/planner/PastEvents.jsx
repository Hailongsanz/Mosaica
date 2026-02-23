import React, { useState } from 'react';
import { format, isBefore, startOfDay, parse } from 'date-fns';
import { getDateLocale } from '@/lib/dateLocale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Clock, MapPin, CheckCircle, XCircle, ChevronDown, ChevronUp, Save, Loader2, Trash2, Pencil } from "lucide-react";
import { getCardStyle, getBadgeStyle } from '@/lib/categoryColors';

function PastEventItem({ event, onMarkComplete, onMarkMissed, onSaveNotes, onDelete, onEditEvent, isSaving, userColors, t, language = 'en' }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(event.notes || '');

  const handleSaveNotes = () => {
    onSaveNotes(event.id, notes);
  };

  return (
    <div className="border-l-4 rounded-lg" style={getCardStyle(event.category || 'other', userColors)}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`font-medium ${event.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                {event.title}
              </h4>
              <Badge variant="secondary" className="text-xs" style={getBadgeStyle(event.category || 'other', userColors)}>
                {event.category || 'other'}
              </Badge>
              {event.completed && (
                <Badge className="bg-green-100 text-green-700 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {t('completed')}
                </Badge>
              )}
              {event.missed && (
                <Badge className="bg-red-100 text-red-700 text-xs">
                  <XCircle className="w-3 h-3 mr-1" />
                  {t('missed')}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{format(parse(event.date, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy', { locale: getDateLocale(language) })}</span>
              {event.start_time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {event.start_time}
                </span>
              )}
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {event.location}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
                            {!event.completed && !event.missed && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onMarkComplete(event.id)}
                                  className="rounded-lg hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/30"
                                  title={t('markAsCompleted')}
                                >
                                  <CheckCircle className="w-5 h-5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onMarkMissed(event.id)}
                                  className="rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                                  title={t('markAsMissed')}
                                >
                                  <XCircle className="w-5 h-5" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEditEvent(event)}
                              className="rounded-lg hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30"
                              title="Edit event"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(event)}
                              className="rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                              title="Delete event"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setExpanded(!expanded)}
                              className="rounded-lg"
                            >
                              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {event.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300">{event.description}</p>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('notes')}</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('addNotesPlaceholder')}
              className="h-20 text-sm dark:bg-gray-700 dark:border-gray-600"
            />
            <Button 
              size="sm" 
              onClick={handleSaveNotes}
              disabled={isSaving}
              className="rounded-lg"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              {t('saveNotes')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PastEvents({ events, onMarkComplete, onMarkMissed, onSaveNotes, onDelete, onEditEvent, isSaving, t = (k) => k, categoryColors: userColors, language = 'en' }) {
  const today = startOfDay(new Date());
  
  const pastEvents = events
    .filter(event => isBefore(parse(event.date, 'yyyy-MM-dd', new Date()), today))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const unmarkedCount = pastEvents.filter(e => !e.completed && !e.missed).length;

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-amber-100 dark:border-gray-700 shadow-sm bg-white dark:bg-[#2a2a2e]">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center justify-between">
            <span>{t('pastEvents')}</span>
            {unmarkedCount > 0 && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                {unmarkedCount} {t('toReview')}
              </Badge>
            )}
          </CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('reviewPastEvents')}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {pastEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">{t('noPastEvents')}</p>
            </div>
          ) : (
            pastEvents.map((event) => (
              <PastEventItem
                key={event.id}
                event={event}
                onMarkComplete={onMarkComplete}
                onMarkMissed={onMarkMissed}
                onSaveNotes={onSaveNotes}
                onDelete={onDelete}
                onEditEvent={onEditEvent}
                isSaving={isSaving}
                userColors={userColors}
                t={t}
                language={language}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}