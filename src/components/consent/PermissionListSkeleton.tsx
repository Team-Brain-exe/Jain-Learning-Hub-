import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder for the upload-request list. Each row mirrors a real row in `creator.index.tsx`
 * (px-5 py-4, 24px title line + 16px meta line, 20px badge, 40px button) so nothing jumps
 * when the real data arrives.
 */
export function PermissionListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        Loading your requests…
      </span>
      <ul
        aria-hidden="true"
        className="divide-y divide-border rounded-xl border border-border bg-card"
      >
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex flex-wrap items-center gap-3 px-5 py-4">
            <div className="min-w-56 flex-1">
              <div className="flex h-6 items-center">
                <Skeleton className="h-4 w-48 max-w-full" />
              </div>
              <div className="flex h-4 items-center">
                <Skeleton className="h-3 w-64 max-w-full" />
              </div>
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-10 w-20" />
          </li>
        ))}
      </ul>
    </div>
  );
}
