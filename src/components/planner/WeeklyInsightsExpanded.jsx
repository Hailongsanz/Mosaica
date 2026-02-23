import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { BarChart3, CheckCircle, XCircle, Target } from "lucide-react";
import { startOfWeek, endOfWeek, isWithinInterval, parse } from 'date-fns';
import { Progress } from "@/components/ui/progress";
import { getChartColor } from '@/lib/categoryColors';

export default function WeeklyInsightsExpanded({ events, t = (k) => k, categoryColors: userColors }) {
  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);

  const thisWeekEvents = events.filter(event => {
    const eventDate = parse(event.date, 'yyyy-MM-dd', new Date());
    return isWithinInterval(eventDate, { start: weekStart, end: weekEnd });
  });

  // Category breakdown
  const categoryCount = thisWeekEvents.reduce((acc, event) => {
    const cat = event.category || 'other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const categoryChartData = Object.entries(categoryCount)
    .map(([name, value]) => ({
      name: t(name) || name,
      value,
      color: getChartColor(name, userColors)
    }))
    .sort((a, b) => b.value - a.value);

  // Completion stats
  const completedEvents = thisWeekEvents.filter(e => e.completed).length;
  const missedEvents = thisWeekEvents.filter(e => e.missed).length;
  const pendingEvents = thisWeekEvents.filter(e => !e.completed && !e.missed).length;
  const totalEvents = thisWeekEvents.length;

  const completionRate = totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0;

  const completionData = [
    { name: 'Completed', value: completedEvents, color: '#22c55e' },
    { name: 'Missed', value: missedEvents, color: '#ef4444' },
    { name: 'Pending', value: pendingEvents, color: '#6b7280' }
  ].filter(d => d.value > 0);

  if (totalEvents === 0) {
    return (
      <Card className="rounded-2xl border-amber-100 dark:border-gray-700 shadow-sm bg-white dark:bg-[#2a2a2e]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400 dark:text-gray-400" />
            {t('thisWeeksInsights')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 text-center py-4">
            {t('noEventsThisWeek')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-amber-100 dark:border-gray-700 shadow-sm bg-white dark:bg-[#2a2a2e]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-400 dark:text-gray-400" />
          {t('thisWeeksInsights')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weekly Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400 dark:text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('weeklyProgress')}</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">{completedEvents} {t('ofEvents')} {totalEvents} {t('events')}</span>
          </div>
          <Progress value={completionRate} className="h-2" />
          <p className="text-xs text-gray-500 dark:text-gray-400">{completionRate}% {t('completionRate')}</p>
        </div>

        {/* Event Type Breakdown */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('eventTypes')}</h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={55}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value} events`, '']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Completion Status Donut */}
        {(completedEvents > 0 || missedEvents > 0 || pendingEvents > 0) && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('completionStatus')}</h4>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={completionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {completionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} events`, '']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-lg font-bold text-green-600">{completedEvents}</span>
            </div>
            <p className="text-xs text-green-600">{t('completed')}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
            <div className="flex items-center justify-center gap-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-lg font-bold text-red-600">{missedEvents}</span>
            </div>
            <p className="text-xs text-red-600">{t('missed')}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
            <span className="text-lg font-bold text-gray-600 dark:text-gray-300">{pendingEvents}</span>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('pending')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}