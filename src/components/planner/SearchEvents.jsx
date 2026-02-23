import React, { useState, useMemo } from 'react';
import { format, parse } from 'date-fns';
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Clock, MapPin, Calendar } from "lucide-react";
import { getBadgeStyle } from '@/lib/categoryColors';

export default function SearchEvents({ events, onSelectEvent, t = (k) => k, categoryColors: userColors }) {
  const [query, setQuery] = useState('');

  const filteredEvents = useMemo(() => {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    return events.filter(event => 
      event.title?.toLowerCase().includes(lowerQuery) ||
      event.description?.toLowerCase().includes(lowerQuery) ||
      event.location?.toLowerCase().includes(lowerQuery) ||
      event.category?.toLowerCase().includes(lowerQuery)
    ).slice(0, 10);
  }, [query, events]);

  return (
    <Card className="rounded-2xl border-amber-100 dark:border-gray-700 shadow-sm bg-white dark:bg-[#2a2a2e]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Search className="w-5 h-5 text-amber-400 dark:text-gray-400" />
          {t('searchEvents')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-amber-400 dark:text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="pl-10 rounded-xl border-amber-100 dark:border-gray-600 focus:border-amber-300 focus:ring-amber-300 dark:focus:border-gray-500"
          />
        </div>

        {query.trim() && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">{t('noEventsFound')}</p>
            ) : (
              filteredEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => onSelectEvent?.(event)}
                  className="p-3 rounded-lg border border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {event.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(parse(event.date, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy')}
                        </span>
                        {event.start_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {event.start_time}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge className="text-xs" style={getBadgeStyle(event.category || 'other', userColors)}>
                      {event.category || 'other'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}