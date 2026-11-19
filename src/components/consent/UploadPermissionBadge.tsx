import { CheckCircle2, Clock, XCircle, type LucideIcon } from "lucide-react";

import type { PermissionStatus } from "@/data/upload-permissions";
import { cn } from "@/lib/utils";

const config: Record<PermissionStatus, { label: string; icon: LucideIcon; tone: string }> = {
  pending: { label: "Pending", icon: Clock, tone: "bg-warning/15 text-warning" },
  approved: { label: "Approved", icon: CheckCircle2, tone: "bg-success/15 text-success" },
  rejected: { label: "Rejected", icon: XCircle, tone: "bg-destructive/10 text-destructive" },
};

/** Pill showing the status of an upload-permission request. Colour is never the only signal: the label is always shown. */
export function UploadPermissionBadge({
  status,
  className,
}: {
  status: PermissionStatus;
  className?: string;
}) {
  const { label, icon: Icon, tone } = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
