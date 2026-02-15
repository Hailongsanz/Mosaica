import React from 'react';
import { format, parse } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Calendar } from "lucide-react";

export default function RecentActivity({ events }) {
  const recentEvents = [...(events || [])]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  return (
    <Card className="bg-white dark:bg-[#2a2a2e] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-400" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentEvents.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            No recent activity
          </p>
        ) : (
          recentEvents.map((event) => (
            <div key={event.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{event.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {format(parse(event.date, 'yyyy-MM-dd', new Date()), 'MMM d')}
                  {event.start_time && ` at ${event.start_time}`}
                </p>
                {event.original_input && (
                  <p className="text-xs text-gray-400 mt-1 truncate italic">
                    "{event.original_input}"
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}