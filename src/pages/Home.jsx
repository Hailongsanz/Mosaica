import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isSameDay, addDays, addWeeks, addMonths, parse } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MessageSquare, CalendarDays, Sparkles, Settings, History, Plus } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { eventService, userSettingsService } from '@/firebase/firestore';
import { llmService } from '@/firebase/llm';

import ChatInput from '@/components/planner/ChatInput';
import CalendarView from '@/components/planner/CalendarView';
import DaySchedule from '@/components/planner/DaySchedule';
import UpcomingEvents from '@/components/planner/UpcomingEvents';
import EventEditModal from '@/components/planner/EventEditModal';
import WeeklyInsightsExpanded from '@/components/planner/WeeklyInsightsExpanded';
import DeleteConfirmModal from '@/components/planner/DeleteConfirmModal';
import FeedbackToast from '@/components/planner/FeedbackToast';
import PastEvents from '@/components/planner/PastEvents';
import ConflictModal from '@/components/planner/ConflictModal';
import SearchEvents from '@/components/planner/SearchEvents';
import RecurringEventManager from '@/components/planner/RecurringEventManager';
import CourageChat from '@/components/planner/CourageChat';
import { getTranslation } from '@/components/planner/translations';

export default function Home() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');
  const [editingEvent, setEditingEvent] = useState(null);
  const [feedback, setFeedback] = useState({ message: '', type: 'success', visible: false });
  const [conflictData, setConflictData] = useState({ isOpen: false, newEvent: null, conflictingEvent: null });
  const [recurringData, setRecurringData] = useState({ isOpen: false, event: null, relatedEvents: [], action: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, event: null });
  const [pendingEvents, setPendingEvents] = useState([]); // Events waiting for user to fill missing info
  const [completingEvent, setCompletingEvent] = useState(null); // Event currently being completed by user
  const [userSettings, setUserSettings] = useState({ language: 'en' });

  // Merge standard color overrides + custom category colors into one map
  const effectiveCategoryColors = React.useMemo(() => {
    const base = { ...(userSettings?.category_colors || {}) };
    for (const cat of (userSettings?.custom_categories || [])) {
      if (cat.slug && cat.color) base[cat.slug] = cat.color;
    }
    return base;
  }, [userSettings?.category_colors, userSettings?.custom_categories]);
  
  const queryClient = useQueryClient();
  
  const t = (key) => getTranslation(userSettings?.language || 'en', key);

  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type, visible: true });
    setTimeout(() => setFeedback(prev => ({ ...prev, visible: false })), 3000);
  };

  useEffect(() => {
    if (user?.uid) {
      userSettingsService.getForCurrentUser().then(settings => {
        if (settings) setUserSettings(settings);
      }).catch(error => {
        console.error('Error loading user settings:', error);
      });
    }
  }, [user?.uid]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', user?.uid],
    queryFn: () => eventService.list('-date'),
    enabled: !!user?.uid,
    staleTime: 5000,
    refetchOnWindowFocus: false,
  });

  const createEventMutation = useMutation({
    mutationFn: (eventData) => eventService.create(eventData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (eventId) => eventService.delete(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showFeedback('Event deleted');
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }) => eventService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showFeedback('Event updated');
      setEditingEvent(null);
    },
  });

  const handleMarkComplete = (eventId) => {
    updateEventMutation.mutate({ id: eventId, data: { completed: true, missed: false } });
  };

  const handleMarkMissed = (eventId) => {
    updateEventMutation.mutate({ id: eventId, data: { missed: true, completed: false } });
  };

  const handleSaveNotes = (eventId, notes) => {
    updateEventMutation.mutate({ id: eventId, data: { notes } });
  };

  // Check for time conflicts
  const checkForConflicts = (newEvent) => {
    if (!newEvent.start_time || newEvent.is_all_day) return null;
    
    return events.find(existing => {
      if (existing.date !== newEvent.date) return false;
      if (!existing.start_time || existing.is_all_day) return false;
      
      const newStart = newEvent.start_time;
      const newEnd = newEvent.end_time || newEvent.start_time;
      const existStart = existing.start_time;
      const existEnd = existing.end_time || existing.start_time;
      
      // Check if times overlap
      return (newStart >= existStart && newStart < existEnd) ||
             (existStart >= newStart && existStart < newEnd) ||
             (newStart === existStart);
    });
  };

  // Conflict resolution handlers
  const handleAddAnyway = async () => {
    await createEventMutation.mutateAsync(conflictData.newEvent);
    setConflictData({ isOpen: false, newEvent: null, conflictingEvent: null });
    showFeedback('Event added');
  };

  const handleKeepCurrent = () => {
    setConflictData({ isOpen: false, newEvent: null, conflictingEvent: null });
    showFeedback('New event discarded');
  };

  const handleReplace = async () => {
    await deleteEventMutation.mutateAsync(conflictData.conflictingEvent.id);
    await createEventMutation.mutateAsync(conflictData.newEvent);
    setConflictData({ isOpen: false, newEvent: null, conflictingEvent: null });
    showFeedback('Event replaced');
  };

  // Recurring event handlers
  const getRelatedRecurringEvents = (event) => {
    if (!event.parent_event_id && !event.is_recurring) return [];
    const parentId = event.parent_event_id || event.id;
    return events.filter(e => e.parent_event_id === parentId || e.id === parentId);
  };

  const handleEditEventWithRecurringCheck = (event) => {
    const relatedEvents = getRelatedRecurringEvents(event);
    if (relatedEvents.length > 1) {
      setRecurringData({ isOpen: true, event, relatedEvents, action: 'edit' });
    } else {
      setEditingEvent(event);
    }
  };

  const handleDeleteEventWithRecurringCheck = (eventOrId) => {
        const event = typeof eventOrId === 'object' ? eventOrId : events.find(e => e.id === eventOrId);
        if (!event) return;
        const relatedEvents = getRelatedRecurringEvents(event);
        if (relatedEvents.length > 1) {
          setRecurringData({ isOpen: true, event, relatedEvents, action: 'delete' });
        } else {
          setDeleteConfirm({ isOpen: true, event });
        }
      };

      const handleConfirmDelete = () => {
        if (deleteConfirm.event) {
          deleteEventMutation.mutate(deleteConfirm.event.id);
          setDeleteConfirm({ isOpen: false, event: null });
        }
      };

  const handleEditSingleRecurring = (event) => {
    setRecurringData({ isOpen: false, event: null, relatedEvents: [], action: null });
    setEditingEvent(event);
  };

  const handleEditAllRecurring = (event, relatedEvents) => {
    setRecurringData({ isOpen: false, event: null, relatedEvents: [], action: null });
    // Edit the first event, changes will apply to pattern
    setEditingEvent(event);
  };

  const handleDeleteSingleRecurring = async (event) => {
        setRecurringData({ isOpen: false, event: null, relatedEvents: [], action: null });
        setDeleteConfirm({ isOpen: true, event });
      };

  const handleDeleteAllRecurring = async (event, relatedEvents) => {
    for (const e of relatedEvents) {
      await deleteEventMutation.mutateAsync(e.id);
    }
    setRecurringData({ isOpen: false, event: null, relatedEvents: [], action: null });
    showFeedback(`Deleted ${relatedEvents.length} recurring events`);
  };

  const handleSearchSelectEvent = (event) => {
    setSelectedDate(parse(event.date, 'yyyy-MM-dd', new Date()));
    setActiveTab('calendar');
  };

  const handleChatSubmit = async (input) => {
    setIsProcessing(true);

    const today = new Date();
    const userCustomCats = (userSettings?.custom_categories || []).map(c => c.slug);
    const allCategorySlugs = ['work', 'personal', 'health', 'social', 'travel', 'other', ...userCustomCats];
    const prompt = `You are a smart assistant that extracts calendar events from natural language.
    
Today's date is ${format(today, 'yyyy-MM-dd')} (${format(today, 'EEEE')}).

Parse the following text and extract ALL calendar events mentioned. For each event, provide:
- title: A concise title for the event
- description: Any additional details (optional)
- date: The date in YYYY-MM-DD format ONLY if the user explicitly mentions a date or relative day (e.g. "tomorrow", "next Monday", "March 5th", "this Friday"). If NO date is mentioned or the user says something vague like "sometime", "soon", "this week" without a specific day, return an EMPTY STRING "" for date.
- start_time: Start time in HH:MM format (24-hour) ONLY if a specific time is mentioned. If no time is mentioned, return an EMPTY STRING "".
- end_time: End time in HH:MM format (24-hour) ONLY if mentioned or calculable from duration. Otherwise return an EMPTY STRING "".
- category: One of: ${allCategorySlugs.join(', ')}. IMPORTANT: if the user mentions a word that closely matches one of the custom category names (${userCustomCats.join(', ')}), prefer that custom category slug over the generic ones.
- location: Location if mentioned, otherwise empty string ""
- is_all_day: true ONLY if the user explicitly says "all day" or the event clearly spans an entire day. Do NOT default to true just because no time was given.
- is_recurring: true if the event repeats (e.g., "every Monday", "weekly", "daily")
- recurrence_rule: If recurring, one of: daily, weekly, biweekly, monthly, yearly
- recurrence_days: If weekly recurring, array of day names like ["monday", "wednesday"]
- date_specified: true if the user explicitly mentioned a date or day, false if you had to guess or no date was given

IMPORTANT: Do NOT guess or fabricate dates or times. If the user says "dinner with dad" without specifying when, the date and start_time should be empty strings. The user will be prompted to fill in the missing details.

User input: "${input}"

Return a JSON array of events. For recurring events, create individual event entries for the next 4 occurrences.`;

    try {
      const result = await llmService.invoke({
        prompt,
        feature: 'planner',
        provider: 'groq',
        response_json_schema: {
          type: "object",
          properties: {
            events: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  date: { type: "string" },
                  start_time: { type: "string" },
                  end_time: { type: "string" },
                  category: { type: "string" },
                  location: { type: "string" },
                  is_all_day: { type: "boolean" },
                  is_recurring: { type: "boolean" },
                  recurrence_rule: { type: "string" },
                  recurrence_days: { type: "array", items: { type: "string" } },
                  date_specified: { type: "boolean" }
                },
                required: ["title"]
              }
            }
          },
          required: ["events"]
        }
      });

      const extractedEvents = result.events || [];
      
      if (extractedEvents.length === 0) {
        showFeedback('No events found in that input. Try being more specific.', 'error');
        setIsProcessing(false);
        return;
      }
      
      // Check each event for missing critical info (date, time)
      const completeEvents = [];
      const incompleteEvents = [];
      
      for (const event of extractedEvents) {
        const eventData = { ...event, original_input: input };
        const missingFields = [];
        
        // Check if date is missing or was fabricated by the AI
        const hasDate = eventData.date && eventData.date.trim() !== '';
        const dateWasSpecified = eventData.date_specified !== false;
        
        if (!hasDate || !dateWasSpecified) {
          missingFields.push('date');
          // Clear any fabricated date so the modal shows empty
          eventData.date = '';
        }
        
        // Require specific time unless explicitly marked as all-day
        const hasTime = eventData.start_time && eventData.start_time.trim() !== '';
        if (!hasTime && eventData.is_all_day !== true) {
          missingFields.push('time');
        }
        
        if (missingFields.length > 0) {
          // Remove the internal date_specified flag before passing to modal
          const { date_specified, ...cleanData } = eventData;
          incompleteEvents.push({ ...cleanData, _missingFields: missingFields });
        } else {
          const { date_specified, ...cleanData } = eventData;
          completeEvents.push(cleanData);
        }
      }
      
      // Save complete events directly
      const addedEvents = [];
      const pendingConflicts = [];
      for (const eventData of completeEvents) {
        const conflict = checkForConflicts(eventData);

        if (conflict) {
          if (pendingConflicts.length === 0) {
            pendingConflicts.push({ newEvent: eventData, conflictingEvent: conflict });
          } else {
            const saved = await createEventMutation.mutateAsync(eventData);
            addedEvents.push(eventData);
          }
        } else {
          const saved = await createEventMutation.mutateAsync(eventData);
          addedEvents.push(eventData);
        }
      }

      // Show the first conflict modal if any
      if (pendingConflicts.length > 0) {
        setConflictData({ isOpen: true, newEvent: pendingConflicts[0].newEvent, conflictingEvent: pendingConflicts[0].conflictingEvent });
      }

      // Show success feedback for auto-saved events
      if (addedEvents.length > 0) {
        showFeedback(`${addedEvents.length} event${addedEvents.length > 1 ? 's' : ''} added!`);
      }
      
      // If there are incomplete events, queue them for user completion
      if (incompleteEvents.length > 0) {
        setPendingEvents(incompleteEvents.slice(1)); // Queue remaining
        setCompletingEvent(incompleteEvents[0]); // Show first one
        if (addedEvents.length === 0) {
          showFeedback(
            `Please fill in the missing details for your event${incompleteEvents.length > 1 ? 's' : ''}.`,
            'info'
          );
        }
      } else if (extractedEvents.length > 0 && extractedEvents[0].date) {
        // Switch to calendar view after successful parsing (only if no completion needed)
        setSelectedDate(parse(extractedEvents[0].date, 'yyyy-MM-dd', new Date()));
        setTimeout(() => setActiveTab('calendar'), 1500);
      }
    } catch (error) {
      console.error('Error parsing events:', error);
      console.error('Error details:', error.message, error.stack);
      showFeedback(`Error: ${error.message || 'Could not understand that. Try rephrasing.'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
  };

  // Handle saving a completed pending event (user filled in missing info)
  const handleCompleteEvent = async (completedEvent) => {
    // Remove internal _missingFields marker
    const { _missingFields, ...eventData } = completedEvent;
    
    try {
      await createEventMutation.mutateAsync(eventData);
      showFeedback('Event added!');
      setCompletingEvent(null);
      
      // Process next pending event if any
      if (pendingEvents.length > 0) {
        const [next, ...remaining] = pendingEvents;
        setPendingEvents(remaining);
        setCompletingEvent(next);
      } else {
        // All done - navigate to the event's date
        if (eventData.date) {
          setSelectedDate(parse(eventData.date, 'yyyy-MM-dd', new Date()));
          setTimeout(() => setActiveTab('calendar'), 500);
        }
      }
    } catch (error) {
      console.error('Error saving completed event:', error);
      showFeedback('Error saving event. Please try again.', 'error');
    }
  };

  // Handle dismissing the completion modal
  const handleDismissCompletion = () => {
    setCompletingEvent(null);
    
    // Process next pending event if any
    if (pendingEvents.length > 0) {
      const [next, ...remaining] = pendingEvents;
      setPendingEvents(remaining);
      setCompletingEvent(next);
    }
  };

  const handleSaveEvent = async (updatedEvent) => {
    // If event has an id, update it; otherwise create new
    if (updatedEvent.id) {
      updateEventMutation.mutate({ id: updatedEvent.id, data: updatedEvent });
    } else {
      // Remove _missingFields if present (from completion flow)
      const { _missingFields, ...eventData } = updatedEvent;
      await createEventMutation.mutateAsync(eventData);
      showFeedback(t('eventAdded') || 'Event added!');
      setEditingEvent(null);
    }
  };

  const handleAddEvent = () => {
    // Open modal with an empty event template
    setEditingEvent({
      title: '',
      description: '',
      date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: '',
      end_time: '',
      category: 'other',
      location: '',
      is_all_day: false
    });
  };

  const handleDeleteEvent = (eventId) => {
    deleteEventMutation.mutate(eventId);
  };

  const handleDuplicateEvent = async (eventData) => {
    const { id, created_at, updated_at, user_id, ...duplicateData } = eventData;
    await createEventMutation.mutateAsync(duplicateData);
    showFeedback(t('eventDuplicated'));
    setEditingEvent(null);
  };

  const handleDeleteFromModal = (event) => {
    setEditingEvent(null);
    setDeleteConfirm({ isOpen: true, event });
  };

  const selectedDayEvents = events.filter(event => 
    isSameDay(parse(event.date, 'yyyy-MM-dd', new Date()), selectedDate)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 dark:bg-gradient-to-br">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Mosaica
            </h1>
            <p className="text-gray-500 mt-2">
              {t('tellMeAboutSchedule')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleAddEvent}
              className="rounded-xl bg-amber-500 dark:bg-white hover:bg-amber-600 dark:hover:bg-gray-100 text-white dark:text-gray-900 shadow-sm"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('addEventManually') || 'Add Event Manually'}
            </Button>
            <Link to={createPageUrl('Settings')}>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
                <Settings className="w-5 h-5 text-amber-400 dark:text-gray-500" />
              </Button>
            </Link>
          </div>
        </div>

        <FeedbackToast 
          message={feedback.message} 
          type={feedback.type} 
          isVisible={feedback.visible} 
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-amber-50 dark:bg-gray-800 border border-amber-100 dark:border-transparent p-1 rounded-2xl">
            <TabsTrigger 
                              value="courage" 
                              className="rounded-xl px-4 sm:px-6 text-amber-900/40 dark:text-gray-400 data-[state=active]:bg-white dark:data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-amber-600 dark:data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-amber-100 dark:data-[state=active]:border-transparent"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              {t('courage')}
                            </TabsTrigger>
            <TabsTrigger 
              value="calendar"
              className="rounded-xl px-4 sm:px-6 text-amber-900/40 dark:text-gray-400 data-[state=active]:bg-white dark:data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-amber-600 dark:data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-amber-100 dark:data-[state=active]:border-transparent"
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              {t('calendar')}
            </TabsTrigger>
            <TabsTrigger 
              value="past"
              className="rounded-xl px-4 sm:px-6 text-amber-900/40 dark:text-gray-400 data-[state=active]:bg-white dark:data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-amber-600 dark:data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-amber-100 dark:data-[state=active]:border-transparent"
            >
              <History className="w-4 h-4 mr-2" />
              {t('pastEvents')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courage" className="mt-6">
                        <div className="max-w-3xl mx-auto">
                          <CourageChat
                            events={events}
                            user={user}
                            t={t}
                            language={userSettings?.language || 'en'}
                            onAddEvents={async (event) => {
                              const conflict = checkForConflicts(event);
                              if (conflict) {
                                setConflictData({ isOpen: true, newEvent: event, conflictingEvent: conflict });
                                return false;
                              }
                              await createEventMutation.mutateAsync(event);
                              showFeedback(t('eventAdded') || 'Event added!');
                              return true;
                            }}
                          />
                        </div>
                      </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Add Event Input */}
                <div className="bg-white dark:bg-[#2a2a2e] rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-amber-400 dark:text-gray-400" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('whatsOnSchedule')}</h2>
                  </div>
                  <ChatInput onSubmit={handleChatSubmit} isProcessing={isProcessing} t={t} />
                  <p className="text-xs text-gray-400 mt-3">
                    {t('tryExample')}
                  </p>
                </div>

                <CalendarView 
                  events={events}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  t={t}
                  categoryColors={effectiveCategoryColors}
                  language={userSettings?.language || 'en'}
                />
                <DaySchedule 
                  date={selectedDate}
                  events={selectedDayEvents}
                  onDeleteEvent={handleDeleteEventWithRecurringCheck}
                  onEditEvent={handleEditEventWithRecurringCheck}
                  t={t}
                  categoryColors={effectiveCategoryColors}
                  language={userSettings?.language || 'en'}
                />
              </div>
              <div className="space-y-6">
                <SearchEvents events={events} onSelectEvent={handleSearchSelectEvent} t={t} categoryColors={effectiveCategoryColors} />
                <UpcomingEvents 
                  events={events}
                  onEditEvent={handleEditEventWithRecurringCheck}
                  onDeleteEvent={handleDeleteEventWithRecurringCheck}
                  t={t}
                  categoryColors={effectiveCategoryColors}
                  language={userSettings?.language || 'en'}
                />
                <WeeklyInsightsExpanded events={events} t={t} categoryColors={effectiveCategoryColors} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            <PastEvents 
              events={events}
              onMarkComplete={handleMarkComplete}
              onMarkMissed={handleMarkMissed}
              onSaveNotes={handleSaveNotes}
              onDelete={handleDeleteEventWithRecurringCheck}
              onEditEvent={handleEditEventWithRecurringCheck}
              isSaving={updateEventMutation.isPending}
              t={t}
              categoryColors={effectiveCategoryColors}
              language={userSettings?.language || 'en'}
            />
          </TabsContent>
        </Tabs>

        {editingEvent && (
                    <EventEditModal
                      event={editingEvent}
                      isOpen={!!editingEvent}
                      onClose={() => setEditingEvent(null)}
                      onSave={handleSaveEvent}
                      onDelete={handleDeleteFromModal}
                      onDuplicate={handleDuplicateEvent}
                      isSaving={updateEventMutation.isPending}
                      t={t}                      customCategories={userSettings?.custom_categories || []}                    />
                  )}

                  {/* Completion modal for events with missing info */}
                  {completingEvent && (
                    <EventEditModal
                      event={completingEvent}
                      isOpen={!!completingEvent}
                      onClose={handleDismissCompletion}
                      onSave={handleCompleteEvent}
                      isSaving={createEventMutation.isPending}
                      t={t}                      customCategories={userSettings?.custom_categories || []}                    />
                  )}

                  <ConflictModal
                    isOpen={conflictData.isOpen}
                    onClose={() => setConflictData({ isOpen: false, newEvent: null, conflictingEvent: null })}
                    newEvent={conflictData.newEvent}
                    conflictingEvent={conflictData.conflictingEvent}
                    onAddAnyway={handleAddAnyway}
                    onKeepCurrent={handleKeepCurrent}
                    onReplace={handleReplace}
                    isProcessing={createEventMutation.isPending || deleteEventMutation.isPending}
                    t={t}
                    categoryColors={effectiveCategoryColors}
                  />

                  <RecurringEventManager
                                    isOpen={recurringData.isOpen}
                                    onClose={() => setRecurringData({ isOpen: false, event: null, relatedEvents: [], action: null })}
                                    event={recurringData.event}
                                    relatedEvents={recurringData.relatedEvents}
                                    action={recurringData.action}
                                    onEditSingle={handleEditSingleRecurring}
                                    onEditAll={handleEditAllRecurring}
                                    onDeleteSingle={handleDeleteSingleRecurring}
                                    onDeleteAll={handleDeleteAllRecurring}
                                  />

                                  <DeleteConfirmModal
                                    isOpen={deleteConfirm.isOpen}
                                    onClose={() => setDeleteConfirm({ isOpen: false, event: null })}
                                    onConfirm={handleConfirmDelete}
                                    eventTitle={deleteConfirm.event?.title || ''}
                                    isDeleting={deleteEventMutation.isPending}
                                    t={t}
                                  />
                              </div>
                            </div>
                          );
          }