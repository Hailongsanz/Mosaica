import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parse } from 'date-fns';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getDotStyle } from '@/lib/categoryColors';

export default function CalendarView({ events, selectedDate, onSelectDate, t = (k) => k, categoryColors: userColors }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day) => {
    return events.filter(event => isSameDay(parse(event.date, 'yyyy-MM-dd', new Date()), day));
  };

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
            className="rounded-xl hover:bg-gray-100 text-sm"
          >
            {t('today')}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {[t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')].map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-400 dark:text-gray-300 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(day)}
              className={`
                aspect-square p-1 rounded-xl flex flex-col items-center justify-start
                transition-all duration-150 relative
                ${isSelected ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100'}
                ${!isCurrentMonth && !isSelected ? 'text-gray-300 dark:text-gray-600' : ''}
                ${isToday && !isSelected ? 'ring-1 ring-gray-900 dark:ring-white ring-offset-1 dark:ring-offset-[#1a1a1a]' : ''}
              `}
            >
              <span className={`text-sm font-medium ${isSelected ? 'text-white dark:text-gray-900' : ''}`}>
                {format(day, 'd')}
              </span>
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-full">
                  {dayEvents.slice(0, 3).map((event, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white dark:bg-gray-900' : ''}`}
                      style={isSelected ? {} : getDotStyle(event.category || 'other', userColors)}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className={`text-[9px] ${isSelected ? 'text-white dark:text-gray-900' : 'text-gray-400'}`}>+{dayEvents.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}