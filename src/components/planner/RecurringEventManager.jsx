import React from 'react';
import { format, parse } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Repeat, Calendar } from "lucide-react";

export default function RecurringEventManager({ 
  isOpen, 
  onClose, 
  event,
  relatedEvents,
  onEditSingle,
  onEditAll,
  onDeleteSingle,
  onDeleteAll,
  action // 'edit' or 'delete'
}) {
  if (!event) return null;

  const isEdit = action === 'edit';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Repeat className="w-5 h-5 text-gray-500" />
            {isEdit ? 'Edit Recurring Event' : 'Delete Recurring Event'}
          </DialogTitle>
          <DialogDescription>
            This event is part of a recurring series ({relatedEvents?.length || 1} occurrences).
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700 my-4">
          <h4 className="font-medium text-gray-900 dark:text-white">{event.title}</h4>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>{format(parse(event.date, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy')}</span>
            {event.start_time && <span>at {event.start_time}</span>}
          </div>
          {event.recurrence_rule && (
            <p className="text-xs text-gray-400 mt-2 capitalize">
              Repeats: {event.recurrence_rule}
              {event.recurrence_days?.length > 0 && ` (${event.recurrence_days.join(', ')})`}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {isEdit ? (
            <>
              <Button 
                onClick={() => onEditSingle(event)}
                className="rounded-xl"
              >
                Edit This Event Only
              </Button>
              <Button 
                variant="outline"
                onClick={() => onEditAll(event, relatedEvents)}
                className="rounded-xl"
              >
                Edit All Events in Series
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="destructive"
                onClick={() => onDeleteSingle(event)}
                className="rounded-xl"
              >
                Delete This Event Only
              </Button>
              <Button 
                variant="outline"
                onClick={() => onDeleteAll(event, relatedEvents)}
                className="rounded-xl text-red-600 border-red-200 hover:bg-red-50"
              >
                Delete All Events in Series
              </Button>
            </>
          )}
          <Button 
            variant="ghost"
            onClick={onClose}
            className="rounded-xl"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}