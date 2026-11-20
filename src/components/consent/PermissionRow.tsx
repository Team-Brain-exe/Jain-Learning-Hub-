import type { ReactNode } from "react";

import { UploadPermissionBadge } from "@/components/consent/UploadPermissionBadge";
import { fmtDate } from "@/components/studio/ui";
import type { ContentFormat, UploadPermission } from "@/data/upload-permissions";

const formatShort: Record<ContentFormat, string> = {
  video: "Video",
  audio: "Audio",
  ppt: "PPT",
  pdf: "PDF",
  docx: "DOCX",
  image: "Image",
};

/**
 * One upload-permission request as a list row (`<li>`), same geometry as the course rows in
 * `creator.index.tsx` and as `PermissionListSkeleton`. Put buttons/links in `actions`.
 */
export function PermissionRow({
  permission: p,
  actions,
}: {
  permission: UploadPermission;
  actions?: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-4">
      <div className="min-w-56 flex-1">
        <p className="font-semibold">{p.title}</p>
        <p className="text-xs text-muted-foreground">
          {p.category} · {formatShort[p.format]} · requested {fmtDate(p.createdAt)}
          {p.decidedAt ? ` · decided ${fmtDate(p.decidedAt)}` : ""}
        </p>
        {p.status === "rejected" && p.facultyRemarks && (
          <p className="mt-1 text-xs text-destructive">Faculty remarks: {p.facultyRemarks}</p>
        )}
      </div>
      <UploadPermissionBadge status={p.status} />
      {actions}
    </li>
  );
}
