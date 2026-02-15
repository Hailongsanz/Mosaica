import React from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FeedbackToast({ message, type = 'success', isVisible }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-500" />
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-800',
    error: 'bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800',
    warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/50 dark:border-yellow-800'
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${bgColors[type]}`}
        >
          {icons[type]}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}