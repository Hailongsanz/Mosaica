import React from 'react';
import { format } from 'date-fns';
import { getDateLocale } from '@/lib/dateLocale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Trash2, Pencil, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCardStyle, getBadgeStyle } from '@/lib/categoryColors';

export default function DaySchedule({ date, events, onDeleteEvent, onEditEvent, t = (k) => k, categoryColors: userColors, language = 'en' }) {
  const sortedEvents = [...events].sort((a, b) => {
    if (a.is_all_day && !b.is_all_day) return -1;
    if (!a.is_all_day && b.is_all_day) return 1;
    if (!a.start_time && !b.start_time) return 0;
    if (!a.start_time) return 1;
    if (!b.start_time) return -1;
    return a.start_time.localeCompare(b.start_time);
  });

  return (
    <Card className="bg-white dark:bg-[#2a2a2e] rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
          {format(date, 'EEEE, MMMM d', { locale: getDateLocale(language) })}
        </CardTitle>
        <p className="text-sm text-gray-500">
          {events.length === 0 ? t('noEventsScheduled') : `${events.length} ${events.length > 1 ? t('events') : t('event')}`}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">{t('yourDayIsFree')}</p>
            <p className="text-xs mt-1">{t('addEventsUsingChat')}</p>
          </div>
        ) : (
          sortedEvents.map((event) => {
            return (
            <div
              key={event.id}
              className={`border-l-4 rounded-lg p-4 group relative`}
              style={getCardStyle(event.category || 'other', userColors)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium text-gray-900 dark:text-white">{event.title}</h4>
                  <Badge variant="secondary" className="text-xs" style={getBadgeStyle(event.category || 'other', userColors)}>
                    {event.category || 'other'}
                  </Badge>
                  {event.is_recurring && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Repeat className="w-3 h-3" />
                      {event.recurrence_rule}
                    </Badge>
                  )}
                  </div>
                  {event.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{event.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    {event.is_all_day ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {t('allDay')}
                      </span>
                    ) : event.start_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {event.start_time}
                        {event.end_time && ` - ${event.end_time}`}
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
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditEvent(event)}
                    className="rounded-lg hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteEvent(event)}
                    className="rounded-lg hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
          })
        )}
      </CardContent>
    </Card>
  );
}