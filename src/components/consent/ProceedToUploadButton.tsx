import { useId } from "react";
import { Lock, Upload } from "lucide-react";

import { btn } from "@/components/studio/ui";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PermissionStatus } from "@/data/upload-permissions";
import { cn } from "@/lib/utils";

export interface ProceedToUploadButtonProps {
  /** Permission status. If undefined, the creator has not requested permission yet. */
  status?: PermissionStatus | undefined;
  /** Callback fired when the approved button is clicked */
  onProceed: () => void;
  className?: string;
}

const lockedHints: Record<"undefined" | "pending" | "rejected", string> = {
  undefined: "Request permission from a faculty member first.",
  pending: "Waiting for faculty approval.",
  rejected: "Your request was rejected. Submit a revised request.",
};

export function ProceedToUploadButton({
  status,
  onProceed,
  className,
}: ProceedToUploadButtonProps) {
  const hintId = useId();
  const isApproved = status === "approved";
  const hintKey = status === undefined ? "undefined" : status;
  const hintText = !isApproved ? lockedHints[hintKey as "undefined" | "pending" | "rejected"] : "";

  if (isApproved) {
    return (
      <div className={cn("inline-flex flex-col items-start", className)}>
        <button
          type="button"
          onClick={onProceed}
          className={cn(btn, "cursor-pointer transition hover:scale-[1.01]")}
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          <span>Proceed to Upload</span>
        </button>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex flex-col items-start", className)}>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              aria-describedby={hintId}
              className="inline-flex cursor-not-allowed rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <button
                type="button"
                disabled
                aria-disabled="true"
                className={cn(btn, "pointer-events-none opacity-50 cursor-not-allowed")}
              >
                <Lock className="h-4 w-4" aria-hidden="true" />
                <span>Proceed to Upload</span>
              </button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="max-w-xs">{hintText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Mobile-visible hint (since mobile touch has no hover/focus tooltip) */}
      <p id={hintId} className="mt-2 text-xs text-muted-foreground lg:hidden">
        {hintText}
      </p>
    </div>
  );
}
