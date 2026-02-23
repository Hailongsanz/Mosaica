import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";

export default function ChatInput({ onSubmit, isProcessing, t = (k) => k }) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (!input.trim() || isProcessing) return;
    onSubmit(input);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('chatInputPlaceholder')}
        className="min-h-[120px] pr-14 text-base resize-none rounded-2xl border-amber-100 dark:border-gray-700 focus:border-amber-300 focus:ring-amber-300 bg-white dark:bg-[#2a2a2e] dark:text-white shadow-sm"
        disabled={isProcessing}
      />
      <Button
        onClick={handleSubmit}
        disabled={!input.trim() || isProcessing}
        size="icon"
        className="absolute bottom-3 right-3 rounded-xl bg-amber-500 hover:bg-amber-600 dark:bg-white dark:hover:bg-gray-200 dark:text-gray-900 transition-all duration-200"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}