import { useRef } from "react";
import { TriangleAlert } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TYPE_LABEL, type ViolationType } from "@/data/proctoring";
import { cn } from "@/lib/utils";

interface ViolationWarningProps {
  warning: { n: number; max: number; type: ViolationType; at: string; last: boolean } | null;
  onAcknowledge: () => void;
}

const clock = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour12: false });
};

/** Modal shown after each counted violation. It can only be dismissed with "I understand". */
export function ViolationWarning({ warning, onAcknowledge }: ViolationWarningProps) {
  const actionRef = useRef<HTMLButtonElement>(null);
  const time = warning ? clock(warning.at) : "";

  return (
    <AlertDialog open={warning !== null}>
      {warning && (
        <AlertDialogContent
          className={cn(warning.last && "border-2 border-destructive")}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            actionRef.current?.focus();
          }}
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <span
              className={cn(
                "grid h-12 w-12 place-content-center rounded-full",
                warning.last ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning",
              )}
            >
              <TriangleAlert className="h-6 w-6" aria-hidden="true" />
            </span>
            <AlertDialogTitle className="text-lg font-semibold">
              {warning.last
                ? `Warning ${warning.n} of ${warning.max}: last warning`
                : `Warning ${warning.n} of ${warning.max}`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {TYPE_LABEL[warning.type]} This has been recorded.
              {time && ` (${time})`}
            </AlertDialogDescription>
            {warning.last ? (
              <p className="w-full rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
                One more violation will submit your attempt.
              </p>
            ) : (
              <p className="w-full rounded-md bg-muted p-3 text-sm text-muted-foreground">
                After {warning.max} warnings your attempt is submitted automatically.
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction ref={actionRef} onClick={onAcknowledge}>
              I understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
