import React, { useState, useRef, useEffect } from 'react';
import { llmService } from '@/firebase/llm';
import { courageChatService, userSettingsService } from '@/firebase/firestore';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Send, Loader2, Bot, User, Sparkles, Save, FolderOpen, Plus, Trash2, MessageSquare, X, Check, Pencil, Settings2, Brain, ChevronLeft } from "lucide-react";
import { format } from 'date-fns';

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: "Hi! I'm Courage, your personal planning companion. 🌟 I can see your calendar and I'm here to help you stay organized, prepare for upcoming events, or just chat if you need some encouragement. How can I help you today?",
  timestamp: new Date().toISOString()
};

export default function CourageChat({ events, user, provider = 'groq', t = (k) => k }) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Saved chats state
  const [savedChats, setSavedChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [showSavedPanel, setShowSavedPanel] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [chatTitle, setChatTitle] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Personalization state
  const [showPersonalizationPanel, setShowPersonalizationPanel] = useState(false);
  const [personalizations, setPersonalizations] = useState([]);
  const [newPersonalization, setNewPersonalization] = useState('');
  const [editingPersonalizationId, setEditingPersonalizationId] = useState(null);
  const [editingPersonalizationText, setEditingPersonalizationText] = useState('');
  const [userSettingsId, setUserSettingsId] = useState(null);
  const [isLoadingPersonalizations, setIsLoadingPersonalizations] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load saved chats list
  const loadSavedChats = async () => {
    setIsLoadingChats(true);
    try {
      const chats = await courageChatService.list();
      setSavedChats(chats);
    } catch (error) {
      console.error('Error loading saved chats:', error);
    } finally {
      setIsLoadingChats(false);
    }
  };

  // Load chats when panel opens
  useEffect(() => {
    if (showSavedPanel) {
      loadSavedChats();
    }
  }, [showSavedPanel]);

  // Load personalizations on mount
  useEffect(() => {
    const loadPersonalizations = async () => {
      setIsLoadingPersonalizations(true);
      try {
        const settings = await userSettingsService.getForCurrentUser();
        if (settings) {
          setUserSettingsId(settings.id);
          setPersonalizations(settings.personalizations || []);
        }
      } catch (error) {
        console.error('Error loading personalizations:', error);
      } finally {
        setIsLoadingPersonalizations(false);
      }
    };
    loadPersonalizations();
  }, []);

  // Save personalizations to Firestore
  const savePersonalizations = async (updatedList) => {
    try {
      if (userSettingsId) {
        await userSettingsService.update(userSettingsId, { personalizations: updatedList });
      } else {
        // Create settings if they don't exist
        const created = await userSettingsService.create({
          user_email: user?.email || '',
          personalizations: updatedList,
        });
        setUserSettingsId(created.id);
      }
    } catch (error) {
      console.error('Error saving personalizations:', error);
    }
  };

  const handleAddPersonalization = () => {
    const text = newPersonalization.trim();
    if (!text) return;
    const item = {
      id: Date.now().toString(),
      text,
      enabled: true,
      created_at: new Date().toISOString(),
    };
    const updated = [...personalizations, item];
    setPersonalizations(updated);
    setNewPersonalization('');
    savePersonalizations(updated);
  };

  const handleDeletePersonalization = (id) => {
    const updated = personalizations.filter(p => p.id !== id);
    setPersonalizations(updated);
    savePersonalizations(updated);
  };

  const handleTogglePersonalization = (id) => {
    const updated = personalizations.map(p =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    setPersonalizations(updated);
    savePersonalizations(updated);
  };

  const handleSavePersonalizationEdit = (id) => {
    const text = editingPersonalizationText.trim();
    if (!text) return;
    const updated = personalizations.map(p =>
      p.id === id ? { ...p, text } : p
    );
    setPersonalizations(updated);
    setEditingPersonalizationId(null);
    setEditingPersonalizationText('');
    savePersonalizations(updated);
  };

  // Auto-generate title from first user message
  const generateTitle = () => {
    const firstUserMsg = messages.find(m => m.role === 'user');
    if (firstUserMsg) {
      const title = firstUserMsg.content.slice(0, 50);
      return title.length < firstUserMsg.content.length ? title + '...' : title;
    }
    return `Chat ${format(new Date(), 'MMM d, h:mm a')}`;
  };

  // Save current chat
  const handleSaveChat = async (title) => {
    if (messages.length <= 1) return; // Don't save empty chats
    
    // Close dialog immediately for better UX
    setShowSaveDialog(false);
    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);
    
    const chatData = {
      title: title || generateTitle(),
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: typeof m.timestamp === 'string' ? m.timestamp : m.timestamp?.toISOString?.() || new Date().toISOString(),
      })),
    };

    try {
      if (currentChatId) {
        // Update existing chat
        await courageChatService.update(currentChatId, chatData);
        // Optimistically update the local list
        setSavedChats(prev => prev.map(c =>
          c.id === currentChatId
            ? { ...c, ...chatData, updated_at: new Date().toISOString() }
            : c
        ));
      } else {
        // Create new saved chat
        const saved = await courageChatService.create(chatData);
        setCurrentChatId(saved.id);
        // Optimistically add to local list
        setSavedChats(prev => [{
          ...chatData,
          id: saved.id,
          user_id: saved.user_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, ...prev]);
      }
      
      setHasUnsavedChanges(false);
      setChatTitle('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving chat:', error);
      setSaveError(error.message || 'Failed to save chat');
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Load a saved chat
  const handleLoadChat = (chat) => {
    setMessages(chat.messages.map(m => ({
      ...m,
      timestamp: m.timestamp,
    })));
    setCurrentChatId(chat.id);
    setHasUnsavedChanges(false);
    setShowSavedPanel(false);
  };

  // Delete a saved chat
  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation();
    try {
      await courageChatService.delete(chatId);
      setSavedChats(prev => prev.filter(c => c.id !== chatId));
      if (currentChatId === chatId) {
        handleNewChat();
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  // Rename a saved chat
  const handleRenameChat = async (chatId) => {
    if (!editingTitleValue.trim()) return;
    try {
      await courageChatService.update(chatId, { title: editingTitleValue.trim() });
      setSavedChats(prev => prev.map(c => c.id === chatId ? { ...c, title: editingTitleValue.trim() } : c));
      setEditingTitleId(null);
      setEditingTitleValue('');
    } catch (error) {
      console.error('Error renaming chat:', error);
    }
  };

  // Start new chat
  const handleNewChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setCurrentChatId(null);
    setHasUnsavedChanges(false);
    setShowSavedPanel(false);
  };

  const getEventsContext = () => {
    const today = new Date();
    const upcomingEvents = (events || [])
      .filter(e => new Date(e.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 10);

    if (upcomingEvents.length === 0) {
      return "The user has no upcoming events scheduled.";
    }

    return upcomingEvents.map(e => 
      `- ${e.title} on ${format(new Date(e.date), 'EEEE, MMMM d')}${e.start_time ? ` at ${e.start_time}` : ''}${e.category ? ` (${e.category})` : ''}${e.location ? ` at ${e.location}` : ''}`
    ).join('\n');
  };

  const getPersonalizationContext = () => {
    const enabled = personalizations.filter(p => p.enabled);
    if (enabled.length === 0) return '';
    return `\n\nUSER'S PERSONAL CONTEXT (things they've told you to remember about them):\n${enabled.map(p => `- ${p.text}`).join('\n')}\n\nUse this context naturally in your responses — reference their preferences, situation, and personality where relevant. Don't explicitly say "based on your personalizations" — just weave it into your answers as if you know them well.`;
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setHasUnsavedChanges(true);

    try {
      const conversationHistory = messages
        .slice(-6)
        .map(m => `${m.role === 'user' ? 'User' : 'Courage'}: ${m.content}`)
        .join('\n');

      const prompt = `You are Courage, an exceptionally skilled AI companion with deep expertise in psychology, emotional intelligence, and human wellbeing. You are integrated into a personal planner app.

CORE EXPERTISE & APPROACH:
- You have advanced understanding of cognitive behavioral techniques, mindfulness practices, and evidence-based stress management
- You recognize emotional patterns and can help users identify the root causes of their anxiety or stress
- You balance warmth and compassion with logical, actionable guidance
- You validate feelings first, then gently guide toward solutions
- You use techniques like reframing, grounding exercises, and perspective-shifting when appropriate

PSYCHOLOGICAL PRINCIPLES YOU APPLY:
- Active listening and reflection to make users feel truly heard
- Socratic questioning to help users discover their own insights
- Breaking overwhelming situations into manageable steps
- Helping identify cognitive distortions (catastrophizing, all-or-nothing thinking, etc.) with gentle awareness
- Encouraging self-compassion and realistic expectations
- Recognizing when someone needs encouragement vs. practical advice vs. just someone to listen

YOUR PERSONALITY:
- Deeply compassionate but not patronizing
- Calm and grounding presence
- Honest and direct when needed, but always kind
- You celebrate small wins and progress
- You help users see their own strength and capability

The user's name is ${user?.full_name || 'friend'}.
${getPersonalizationContext()}

Here are the user's upcoming events (use this context to understand potential stressors):
${getEventsContext()}

Previous conversation:
${conversationHistory}

User: ${userMessage.content}

RESPONSE GUIDELINES:
- If someone is stressed/anxious: Validate their feelings first ("It makes sense you're feeling..."), then offer perspective or coping strategies
- If someone is overwhelmed: Help them break things down, prioritize, and see the path forward
- If someone needs motivation: Connect them with their deeper "why" and remind them of their capabilities
- If someone just needs to vent: Listen, reflect back, and offer gentle support without rushing to fix
- Always aim to leave the user feeling more capable, calm, and clear than before

Keep responses conversational (2-5 sentences typically, more if providing specific techniques or the situation warrants depth).

IMPORTANT: For serious mental health crises, thoughts of self-harm, clinical conditions, or issues requiring professional intervention, express care and strongly encourage them to reach out to qualified mental health professionals, crisis lines, or medical providers. You are supportive, not a replacement for professional care.`;

      const response = await llmService.invoke({
        prompt,
        feature: 'courage',
        provider,
        response_json_schema: {
          type: "object",
          properties: {
            message: { type: "string" }
          },
          required: ["message"]
        }
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Error getting response:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having a bit of trouble right now. Could you try asking me again?",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[700px] bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 relative">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('courage')}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {currentChatId 
              ? savedChats.find(c => c.id === currentChatId)?.title || t('savedChat')
              : t('yourPlanningCompanion')}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {/* Personalizations */}
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${showPersonalizationPanel ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
            onClick={() => { setShowPersonalizationPanel(!showPersonalizationPanel); setShowSavedPanel(false); }}
            title={t('personalization')}
          >
            <Brain className="w-4 h-4" />
          </Button>
          {/* New Chat */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleNewChat}
            title={t('newChat')}
          >
            <Plus className="w-4 h-4" />
          </Button>
          {/* Save Chat */}
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${hasUnsavedChanges ? 'text-amber-500' : ''}`}
            onClick={() => {
              if (currentChatId) {
                handleSaveChat(savedChats.find(c => c.id === currentChatId)?.title);
              } else {
                setShowSaveDialog(true);
              }
            }}
            disabled={messages.length <= 1 || isSaving}
            title={currentChatId ? t('saveChanges') : t('saveChat')}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </Button>
          {/* View Saved Chats */}
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${showSavedPanel ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
            onClick={() => { setShowSavedPanel(!showSavedPanel); setShowPersonalizationPanel(false); }}
            title={t('savedConversations')}
          >
            <FolderOpen className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="absolute top-16 left-4 right-4 z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg p-4 space-y-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{t('saveThisConversation')}</p>
          <Input
            value={chatTitle}
            onChange={(e) => setChatTitle(e.target.value)}
            placeholder={generateTitle()}
            className="text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveChat(chatTitle || generateTitle());
              if (e.key === 'Escape') setShowSaveDialog(false);
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowSaveDialog(false)}>
              {t('cancel')}
            </Button>
            <Button size="sm" onClick={() => handleSaveChat(chatTitle || generateTitle())} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
              {t('save')}
            </Button>
          </div>
        </div>
      )}

      {/* Save Feedback */}
      {saveSuccess && (
        <div className="absolute top-16 left-4 right-4 z-30 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-sm">
          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-700 dark:text-green-300">{t('chatSaved')}</span>
        </div>
      )}
      {saveError && (
        <div className="absolute top-16 left-4 right-4 z-30 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5 shadow-sm">
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">{t('failedToSaveChat')}</p>
          <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{saveError}</p>
        </div>
      )}

      {/* Saved Chats Panel */}
      {showSavedPanel && (
        <div className="absolute top-16 left-0 right-0 bottom-0 z-20 bg-white dark:bg-[#1a1a1a] flex flex-col rounded-b-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {t('savedConversations')}
            </h4>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSavedPanel(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoadingChats ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : savedChats.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-400">{t('noSavedConversations')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('chatWithCourage')}</p>
              </div>
            ) : (
              savedChats.map(chat => (
                <div
                  key={chat.id}
                  className={`group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                    currentChatId === chat.id
                      ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                  onClick={() => handleLoadChat(chat)}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingTitleId === chat.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editingTitleValue}
                          onChange={(e) => setEditingTitleValue(e.target.value)}
                          className="h-7 text-xs"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') handleRenameChat(chat.id);
                            if (e.key === 'Escape') setEditingTitleId(null);
                          }}
                        />
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleRenameChat(chat.id); }}>
                          <Check className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {chat.title}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {chat.messages?.length || 0} {t('messagesCount')} · {chat.updated_at ? format(new Date(chat.updated_at), 'MMM d, h:mm a') : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTitleId(chat.id);
                        setEditingTitleValue(chat.title);
                      }}
                      title={t('rename')}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Personalization Panel */}
      {showPersonalizationPanel && (
        <div className="absolute top-16 left-0 right-0 bottom-0 z-20 bg-white dark:bg-[#1a1a1a] flex flex-col rounded-b-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-500" />
              {t('personalization')}
            </h4>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowPersonalizationPanel(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {t('personalizationDesc')}
            </p>
            <div className="flex gap-2">
              <Input
                value={newPersonalization}
                onChange={(e) => setNewPersonalization(e.target.value)}
                placeholder={'e.g. "I\'m a college student studying CS"'}
                className="text-sm flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddPersonalization();
                }}
              />
              <Button
                size="sm"
                onClick={handleAddPersonalization}
                disabled={!newPersonalization.trim()}
                className="px-3"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoadingPersonalizations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : personalizations.length === 0 ? (
              <div className="text-center py-8">
                <Brain className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-400">{t('noPersonalizations')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('addDetailsForCourage')}</p>
                <div className="mt-4 space-y-1.5 text-left max-w-xs mx-auto">
                  {[
                    t('preferMornings'),
                    t('busySchedule'),
                    t('anxiousPresentations'),
                  ].map((example) => (
                    <button
                      key={example}
                      className="w-full text-left text-xs text-purple-500 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 px-3 py-2 rounded-lg transition-colors border border-dashed border-purple-200 dark:border-purple-800"
                      onClick={() => {
                        setNewPersonalization(example);
                      }}
                    >
                      + {example}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              personalizations.map((item) => (
                <div
                  key={item.id}
                  className={`group flex items-start gap-3 p-3 rounded-xl transition-colors ${
                    item.enabled
                      ? 'bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30'
                      : 'bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/30 opacity-60'
                  }`}
                >
                  <Switch
                    checked={item.enabled}
                    onCheckedChange={() => handleTogglePersonalization(item.id)}
                    className="mt-0.5 scale-75"
                  />
                  <div className="flex-1 min-w-0">
                    {editingPersonalizationId === item.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editingPersonalizationText}
                          onChange={(e) => setEditingPersonalizationText(e.target.value)}
                          className="h-7 text-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSavePersonalizationEdit(item.id);
                            if (e.key === 'Escape') setEditingPersonalizationId(null);
                          }}
                        />
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSavePersonalizationEdit(item.id)}>
                          <Check className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-800 dark:text-gray-200">{item.text}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingPersonalizationId(item.id);
                        setEditingPersonalizationText(item.text);
                      }}
                      title={t('edit')}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      onClick={() => handleDeletePersonalization(item.id)}
                      title={t('remove')}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {personalizations.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
              <p className="text-[10px] text-gray-400 text-center">
                {personalizations.filter(p => p.enabled).length} / {personalizations.length} {t('active')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              message.role === 'user' 
                ? 'bg-gray-900 dark:bg-white' 
                : 'bg-gradient-to-br from-purple-500 to-indigo-600'
            }`}>
              {message.role === 'user' ? (
                <User className="w-4 h-4 text-white dark:text-gray-900" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>
            <div className={`max-w-[75%] ${message.role === 'user' ? 'text-right' : ''}`}>
              <div className={`rounded-2xl px-4 py-2.5 ${
                message.role === 'user'
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-tr-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-md'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
              <p className="text-[10px] text-gray-400 mt-1 px-2">
                {format(new Date(message.timestamp), 'h:mm a')}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-700">
        <div className="relative flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('messageCourage')}
            className="min-h-[44px] max-h-[120px] resize-none rounded-xl border-gray-200 dark:border-gray-600 dark:bg-gray-800 pr-12"
            disabled={isLoading}
          />
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="absolute right-2 bottom-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-gray-900 h-8 w-8"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-center">
          {t('courageDisclaimer')}
        </p>
      </div>
    </div>
  );
}