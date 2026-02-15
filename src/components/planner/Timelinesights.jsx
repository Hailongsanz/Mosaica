import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { BarChart3 } from "lucide-react";
import { startOfWeek, endOfWeek, isWithinInterval, parse } from 'date-fns';
import { getChartColor } from '@/lib/categoryColors';

export default function TimeInsights({ events, categoryColors: userColors }) {
  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);

  // Filter events for this week
  const thisWeekEvents = events.filter(event => {
    const eventDate = parse(event.date, 'yyyy-MM-dd', new Date());
    return isWithinInterval(eventDate, { start: weekStart, end: weekEnd });
  });

  // Calculate time per category (rough estimate based on event count)
  const categoryCount = thisWeekEvents.reduce((acc, event) => {
    const cat = event.category || 'other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(categoryCount)
    .map(([name, value]) => ({
      name: name,
      value,
      color: getChartColor(name, userColors)
    }))
    .sort((a, b) => b.value - a.value);

  const totalEvents = thisWeekEvents.length;

  if (totalEvents === 0) {
    return (
      <Card className="rounded-2xl border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-[#2a2a2e]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-400" />
            This Week's Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 text-center py-4">
            No events this week yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-[#2a2a2e]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gray-400" />
          This Week's Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
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
        <div className="mt-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalEvents}</p>
          <p className="text-sm text-gray-500">events this week</p>
        </div>
      </CardContent>
    </Card>
  );
}