import { useRef } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { btn } from "@/components/studio/ui";

interface SecondTabBlockerProps {
  open: boolean;
  onTakeOver: () => void;
}

/** Blocks this tab while another tab owns the exam session. Focus is trapped by Radix. */
export function SecondTabBlocker({ open, onTakeOver }: SecondTabBlockerProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        className="left-0 top-0 z-[60] h-full max-w-none translate-x-0 translate-y-0 place-content-center justify-items-center rounded-none border-0 bg-navy p-6 text-center text-navy-foreground data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 sm:rounded-none"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          buttonRef.current?.focus();
        }}
      >
        <div className="flex max-w-md flex-col items-center gap-4">
          <AlertDialogTitle className="text-2xl font-semibold">
            This exam is open in another tab
          </AlertDialogTitle>
          <AlertDialogDescription className="text-navy-foreground">
            Only one tab can run the exam. Use this tab to continue here; the other tab will stop.
          </AlertDialogDescription>
          <AlertDialogAction ref={buttonRef} className={btn} onClick={onTakeOver}>
            Use this tab
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
