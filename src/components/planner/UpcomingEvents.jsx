import React from 'react';
import { format, isToday, isTomorrow, isAfter, startOfDay, addDays, parse } from 'date-fns';
import { getDateLocale } from '@/lib/dateLocale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, MapPin, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBadgeStyle } from '@/lib/categoryColors';

function EventItem({ event, onEditEvent, onDeleteEvent, userColors }) {
  return (
    <div className="group flex items-start gap-3 p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative">
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
        <Calendar className="w-4 h-4 text-amber-400 dark:text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{event.title}</p>
          <Badge variant="secondary" className="text-[10px]" style={getBadgeStyle(event.category || 'other', userColors)}>
            {event.category || 'other'}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          {event.start_time && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {event.start_time}
              {event.end_time && ` - ${event.end_time}`}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{event.location}</span>
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onEditEvent(event)}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
          onClick={() => onDeleteEvent(event.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function DaySection({ title, subtitle, events, onEditEvent, onDeleteEvent, userColors }) {
  if (events.length === 0) return null;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
        {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
      </div>
      <div className="space-y-2">
        {events.map((event) => (
          <EventItem 
            key={event.id} 
            event={event} 
            onEditEvent={onEditEvent}
            onDeleteEvent={onDeleteEvent}
            userColors={userColors}
          />
        ))}
      </div>
    </div>
  );
}

export default function UpcomingEvents({ events, onEditEvent, onDeleteEvent, t = (k) => k, categoryColors: userColors, language = 'en' }) {
  const locale = getDateLocale(language);
  const today = startOfDay(new Date());
  
  // Filter and sort upcoming events (today and future)
  const upcomingEvents = events
    .filter(event => {
      const eventDate = startOfDay(parse(event.date, 'yyyy-MM-dd', new Date()));
      return isAfter(eventDate, addDays(today, -1)); // Include today
    })
    .sort((a, b) => {
      const dateCompare = new Date(a.date) - new Date(b.date);
      if (dateCompare !== 0) return dateCompare;
      if (!a.start_time && !b.start_time) return 0;
      if (!a.start_time) return 1;
      if (!b.start_time) return -1;
      return a.start_time.localeCompare(b.start_time);
    });

  // Group events by day
  const todayEvents = upcomingEvents.filter(e => isToday(new Date(e.date)));
  const tomorrowEvents = upcomingEvents.filter(e => isTomorrow(new Date(e.date)));
  
  // Group remaining events by date
  const laterEvents = upcomingEvents.filter(e => {
    const eventDate = new Date(e.date);
    return !isToday(eventDate) && !isTomorrow(eventDate);
  });

  // Group later events by date
  const groupedLaterEvents = laterEvents.reduce((groups, event) => {
    const dateKey = event.date;
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(event);
    return groups;
  }, {});

  const sortedDateKeys = Object.keys(groupedLaterEvents).sort();

  return (
    <Card className="bg-white dark:bg-[#2a2a2e] rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-400 dark:text-gray-400" />
          {t('upcomingEvents')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 max-h-[500px] overflow-y-auto amber-scroll">
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            {t('noUpcomingEvents')}
          </p>
        ) : (
          <>
            <DaySection 
              title={t('today')} 
              subtitle={format(today, 'MMM d', { locale })}
              events={todayEvents}
              onEditEvent={onEditEvent}
              onDeleteEvent={onDeleteEvent}
              userColors={userColors}
            />
            
            <DaySection 
              title={t('tomorrow')} 
              subtitle={format(addDays(today, 1), 'MMM d', { locale })}
              events={tomorrowEvents}
              onEditEvent={onEditEvent}
              onDeleteEvent={onDeleteEvent}
              userColors={userColors}
            />
            
            {sortedDateKeys.map(dateKey => (
              <DaySection
                key={dateKey}
                title={format(new Date(dateKey), 'EEEE', { locale })}
                subtitle={format(new Date(dateKey), 'MMM d', { locale })}
                events={groupedLaterEvents[dateKey]}
                onEditEvent={onEditEvent}
                onDeleteEvent={onDeleteEvent}
                userColors={userColors}
              />
            ))}

            {todayEvents.length === 0 && tomorrowEvents.length === 0 && laterEvents.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                {t('noUpcomingEvents')}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}