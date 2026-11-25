import { UploadPermissionBadge } from "@/components/consent/UploadPermissionBadge";
import { useMyUploadPermissions, type MyPermissionView } from "@/hooks/use-my-upload-permissions";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

const buttonClass =
  "mt-4 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted";

export function StudentPermissionStatus() {
  const { items, loading, error, retry } = useMyUploadPermissions();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">My upload permissions</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Track the status of your requests to upload content.
      </p>

      <div className="mt-8">
        {loading && (
          <p role="status" className="text-sm text-muted-foreground">
            Loading your requests…
          </p>
        )}

        {!loading && error && (
          <div role="alert" className="rounded-xl border border-border bg-card p-5">
            <p className="font-medium">We couldn't load your requests.</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <button type="button" onClick={retry} className={buttonClass}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            You have no permission requests yet.
          </p>
        )}

        {!loading && !error && items.length > 0 && (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {items.map((p) => (
              <PermissionItem key={p.id} permission={p} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PermissionItem({ permission: p }: { permission: MyPermissionView }) {
  return (
    <li className="space-y-1.5 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold">{p.title}</p>
        <UploadPermissionBadge status={p.status} />
      </div>
      <p className="text-sm text-muted-foreground">Faculty: {p.facultyName ?? p.facultyId}</p>
      <p className="text-sm text-muted-foreground">Submitted: {formatDate(p.createdAt)}</p>
      {p.decidedAt && (
        <p className="text-sm text-muted-foreground">Decided: {formatDate(p.decidedAt)}</p>
      )}
      {p.remarks && (
        <p className="text-sm">
          <span className="font-medium">Faculty remarks:</span> {p.remarks}
        </p>
      )}
    </li>
  );
}
