import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DeleteAccountDialog() {
  const [isLoading, setIsLoading] = useState(false);

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      // Call backend function to delete account
      await base44.functions.invoke('deleteUserAccount', {});
      toast.success('Account deleted successfully');
      // Logout after deletion
      setTimeout(() => base44.auth.logout(), 1000);
    } catch (error) {
      toast.error(error.message || 'Failed to delete account');
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          className="flex items-center gap-2 w-full justify-start px-3 py-2.5 h-auto select-none"
          size="sm"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete Account</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Account</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. All your data will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-3 justify-end">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteAccount}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 select-none"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}