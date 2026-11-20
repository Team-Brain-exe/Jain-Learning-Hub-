import { useId } from "react";
import { AlertCircle } from "lucide-react";

import { UploadPermissionBadge } from "@/components/consent/UploadPermissionBadge";
import { btnOutline, fmtDate } from "@/components/studio/ui";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { UploadPermission } from "@/data/upload-permissions";
import { cn } from "@/lib/utils";

export interface RejectedRequestCardProps {
  permission: UploadPermission;
  onReviseRequest: (permission: UploadPermission) => void;
  className?: string;
}

export function RejectedRequestCard({
  permission,
  onReviseRequest,
  className,
}: RejectedRequestCardProps) {
  const remarks = permission.facultyRemarks?.trim();
  const hasRemarks = Boolean(remarks);
  const titleId = useId();

  return (
    <Alert
      variant="destructive"
      // Static content: a labelled region, not role="alert" (which screen readers announce on load).
      role="region"
      aria-labelledby={titleId}
      className={cn(
        "rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-foreground shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-4">
        {/* Header row: Title + Date + Badge */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
              <AlertTitle
                id={titleId}
                className="m-0 text-base font-bold text-foreground break-words"
              >
                {permission.title}
              </AlertTitle>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Decision date: {fmtDate(permission.decidedAt)} · {permission.department}
            </p>
          </div>
          <UploadPermissionBadge status="rejected" />
        </div>

        {/* Faculty remarks block */}
        <div className="rounded-lg border border-border/70 bg-card/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Faculty Remarks
          </p>
          {hasRemarks ? (
            <blockquote className="mt-2 border-l-2 border-destructive pl-3 text-sm italic text-foreground break-words">
              “{remarks}”
            </blockquote>
          ) : (
            <p className="mt-2 text-sm italic text-muted-foreground">
              The faculty member did not leave a reason.
            </p>
          )}
        </div>

        {/* Informational helper copy */}
        <AlertDescription className="text-xs text-muted-foreground">
          The upload button stays locked until a new request is approved.
        </AlertDescription>

        {/* Revise request action button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => onReviseRequest(permission)}
            className={cn(
              btnOutline,
              "w-full sm:w-auto text-foreground border-destructive/40 hover:bg-destructive/10",
            )}
          >
            Submit revised request
          </button>
        </div>
      </div>
    </Alert>
  );
}
