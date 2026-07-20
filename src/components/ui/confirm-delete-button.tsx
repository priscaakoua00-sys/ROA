'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Renders a "delete" trigger that opens a confirmation dialog before
 * actually submitting. `formId` must match the `id` of the <form
 * action={someDeleteAction}> this button should submit — the confirm
 * button uses the HTML `form` attribute so it works even though the
 * dialog renders in a portal outside that form's DOM subtree.
 */
export function ConfirmDeleteButton({
  formId,
  triggerLabel,
  title,
  description,
  cancelLabel,
  confirmLabel,
  className,
}: {
  formId: string;
  triggerLabel: string;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? 'text-xs text-muted-foreground hover:text-destructive hover:underline'}
      >
        {triggerLabel}
      </button>
      <DialogContent closeLabel={cancelLabel}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">{cancelLabel}</Button>
          </DialogClose>
          <Button type="submit" form={formId} variant="destructive" onClick={() => setOpen(false)}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
