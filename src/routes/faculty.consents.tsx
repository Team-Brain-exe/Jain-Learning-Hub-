import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { fetchFacultyAssignedPermissions, type UploadPermissionResponse } from "@/lib/api-client";
import { UploadPermissionBadge } from "@/components/consent/UploadPermissionBadge";
import { Empty, PageHeader, RequireRole, btn, btnOutline, fmtDate } from "@/components/studio/ui";
import { RefreshCw, AlertCircle, ArrowRight } from "lucide-react";

const toBadgeStatus = (s: UploadPermissionResponse["status"]) =>
  s === "APPROVED" ? "approved" : s === "REJECTED" ? "rejected" : "pending";

export const Route = createFileRoute("/faculty/consents")({
  component: FacultyConsentsPage,
});

type FilterTab = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

function FacultyConsentsPage() {
  return (
    <RequireRole roles={["reviewer", "admin"]}>
      <FacultyConsentsContent />
    </RequireRole>
  );
}

function FacultyConsentsContent() {
  const [permissions, setPermissions] = useState<UploadPermissionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFacultyAssignedPermissions();
      setPermissions(data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load assigned upload permissions. Please verify your connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const counts = useMemo(() => {
    const res = { ALL: permissions.length, PENDING: 0, APPROVED: 0, REJECTED: 0 };
    permissions.forEach((p) => {
      if (p.status in res) {
        res[p.status as keyof typeof res]++;
      }
    });
    return res;
  }, [permissions]);

  const filtered = useMemo(() => {
    if (activeTab === "ALL") return permissions;
    return permissions.filter((p) => p.status === activeTab);
  }, [permissions, activeTab]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <PageHeader
        title="Faculty Upload Permissions & Consent"
        subtitle="Review student upload permission requests assigned to you. Inspect content details, course association, and approve or reject with remarks."
        actions={
          <button
            onClick={loadData}
            disabled={loading}
            className={`${btnOutline} flex items-center gap-2 text-xs`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1.5">
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as FilterTab[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.charAt(0) + tab.slice(1).toLowerCase()} ({counts[tab]})
              </button>
            );
          })}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Unable to load permissions</p>
            <p className="text-xs opacity-90">{error}</p>
          </div>
          <button
            onClick={loadData}
            className={`${btnOutline} border-destructive/30 bg-background text-xs`}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && !error && (
        <div className="space-y-3 py-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="animate-pulse rounded-xl border border-border bg-card p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-1/3 rounded bg-muted"></div>
                <div className="h-5 w-20 rounded bg-muted"></div>
              </div>
              <div className="h-4 w-1/2 rounded bg-muted/70"></div>
              <div className="h-4 w-1/4 rounded bg-muted/50"></div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <Empty
          title={
            activeTab === "ALL"
              ? "No assigned permission requests"
              : `No ${activeTab.toLowerCase()} requests`
          }
          body={
            activeTab === "ALL"
              ? "You do not have any student upload permissions assigned to you at this time."
              : `There are currently no permission requests with ${activeTab.toLowerCase()} status.`
          }
        />
      )}

      {/* List */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-sm sm:flex-row sm:items-center"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">
                    {item.title || "Untitled Permission Request"}
                  </h3>
                  <UploadPermissionBadge status={toBadgeStatus(item.status)} />
                  <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground uppercase">
                    {item.content_type || "MATERIAL"}
                  </span>
                  {item.format && (
                    <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground uppercase">
                      {item.format}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Student:{" "}
                    <strong className="text-foreground">{item.student_id || "Unknown"}</strong>
                  </span>
                  <span>Requested: {item.created_at ? fmtDate(item.created_at) : "N/A"}</span>
                  {item.decision_timestamp && (
                    <span>Decided: {fmtDate(item.decision_timestamp)}</span>
                  )}
                </div>

                {item.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground/90">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Link
                  to="/faculty/consent/$id"
                  params={{ id: item.id }}
                  className={`${btn} inline-flex items-center gap-1.5 text-xs`}
                >
                  <span>{item.status === "PENDING" ? "Review Request" : "View Details"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
