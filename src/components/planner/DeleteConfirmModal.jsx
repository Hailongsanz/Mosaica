import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, eventTitle, isDeleting, t = (k) => k }) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteEvent')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('deleteEventConfirm')} {t('thisActionCantBeUndone')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl" disabled={isDeleting}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            className="rounded-xl bg-red-600 hover:bg-red-700"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('deleting')}
              </>
            ) : (
              t('delete')
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}