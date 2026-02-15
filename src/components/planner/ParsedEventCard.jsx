import React from 'react';
import { format, parse } from 'date-fns';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin } from "lucide-react";
import { getBadgeStyle } from '@/lib/categoryColors';

export default function ParsedEventCard({ event, categoryColors: userColors }) {
  return (
    <Card className="bg-white/80 dark:bg-[#2a2a2e]/80 backdrop-blur-sm border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 dark:text-white truncate">{event.title}</h4>
            {event.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{event.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{format(parse(event.date, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy')}</span>
              </div>
              {event.start_time && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {event.start_time}
                    {event.end_time && ` - ${event.end_time}`}
                  </span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[150px]">{event.location}</span>
                </div>
              )}
            </div>
          </div>
          <Badge variant="outline" className="shrink-0" style={getBadgeStyle(event.category || 'other', userColors)}>
            {event.category || 'other'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}