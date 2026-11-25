import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  fetchFacultyPermissionDetail,
  submitFacultyPermissionDecision,
  type UploadPermissionResponse,
} from "@/lib/api-client";
import { UploadPermissionBadge } from "@/components/consent/UploadPermissionBadge";
import {
  PageHeader,
  RequireRole,
  btn,
  btnOutline,
  fmtDateTime,
  input,
} from "@/components/studio/ui";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  User,
  Calendar,
  Layers,
  MessageSquare,
  ShieldCheck,
  Clock,
} from "lucide-react";

const toBadgeStatus = (s: UploadPermissionResponse["status"]) =>
  s === "APPROVED" ? "approved" : s === "REJECTED" ? "rejected" : "pending";

export const Route = createFileRoute("/faculty/consent/$id")({
  component: FacultyConsentDetailPage,
});

function FacultyConsentDetailPage() {
  const { id } = Route.useParams();

  return (
    <RequireRole roles={["reviewer", "admin"]}>
      <FacultyConsentDetailContent id={id} />
    </RequireRole>
  );
}

function FacultyConsentDetailContent({ id }: { id: string }) {
  const navigate = useNavigate();
  const [item, setItem] = useState<UploadPermissionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Decision form state
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFacultyPermissionDetail(id);
      setItem(data);
      if (data?.remarks) {
        setRemarks(data.remarks);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load upload permission details. The request may not exist or is not assigned to you.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleDecision = async (decision: "APPROVED" | "REJECTED") => {
    if (decision === "REJECTED" && !remarks.trim()) {
      setActionError("Please provide remarks explaining why the request was rejected.");
      return;
    }

    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const updated = await submitFacultyPermissionDecision(id, {
        decision,
        remarks: remarks.trim(),
      });
      setItem(updated);
      setActionSuccess(
        `Permission request successfully ${decision === "APPROVED" ? "approved" : "rejected"}.`,
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : `Failed to ${decision.toLowerCase()} permission request. Please try again.`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="space-y-4 rounded-xl border border-border bg-card p-6">
          <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted/70" />
          <div className="h-32 w-full animate-pulse rounded bg-muted/40" />
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <Link
          to="/faculty/consents"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Permissions Queue
        </Link>
        <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-destructive">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-2">
            <h3 className="font-semibold">Unable to Load Permission Request</h3>
            <p className="text-xs opacity-90">{error || "Permission request not found."}</p>
            <div className="pt-2">
              <button
                onClick={loadData}
                className={`${btnOutline} border-destructive/30 bg-background text-xs`}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isPending = item.status === "PENDING";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Back button */}
      <div>
        <Link
          to="/faculty/consents"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Permissions Queue
        </Link>
      </div>

      <PageHeader
        title={item.title || "Faculty Upload Permission Review"}
        subtitle={`Permission ID: ${item.id}`}
        actions={<UploadPermissionBadge status={toBadgeStatus(item.status)} />}
      />

      {/* Success Banner */}
      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {actionSuccess}
        </div>
      )}

      {/* Action Error Banner */}
      {actionError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-xs font-medium text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {actionError}
        </div>
      )}

      {/* Metadata Overview Card */}
      <div className="grid gap-6 rounded-xl border border-border bg-card p-6 shadow-sm md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Student Requester</p>
              <p className="text-sm font-semibold text-foreground">
                {item.student_id || "Not Specified"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Layers className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Content Specification</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono font-medium uppercase text-foreground">
                  {item.content_type || "MATERIAL"}
                </span>
                {item.format && (
                  <span className="rounded border border-border px-2 py-0.5 text-xs font-mono uppercase text-muted-foreground">
                    Format: {item.format}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Timestamps</p>
              <p className="text-xs text-foreground">
                <span className="text-muted-foreground">Requested:</span>{" "}
                {item.created_at ? fmtDateTime(item.created_at) : "N/A"}
              </p>
              {item.decision_timestamp && (
                <p className="text-xs text-foreground">
                  <span className="text-muted-foreground">Decided:</span>{" "}
                  {fmtDateTime(item.decision_timestamp)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Assigned Reviewer</p>
              <p className="text-xs text-foreground">
                {item.faculty_id ? `Faculty ID: ${item.faculty_id}` : "Assigned to You"}
              </p>
            </div>
          </div>

          {item.consent_declared_at && (
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Student Declaration</p>
                <p className="text-xs text-foreground">
                  Consent confirmed on {fmtDateTime(item.consent_declared_at)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description / Content Justification */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Upload Description & Purpose
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {item.description || "No specific upload description was provided by the student."}
        </p>
      </div>

      {/* Decision Section */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          Faculty Review & Decision
        </h3>

        {/* If already decided */}
        {!isPending ? (
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Current Status:</span>
              <UploadPermissionBadge status={toBadgeStatus(item.status)} />
              {item.decision_timestamp && (
                <span className="text-xs text-muted-foreground">
                  on {fmtDateTime(item.decision_timestamp)}
                </span>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground">Remarks:</p>
              <p className="mt-1 text-xs text-foreground whitespace-pre-wrap">
                {item.remarks || "No remarks provided."}
              </p>
            </div>

            <p className="text-[11px] text-muted-foreground italic">
              This upload permission request has already been finalized.
            </p>
          </div>
        ) : (
          /* Active decision form */
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="faculty-remarks"
                className="text-xs font-medium text-muted-foreground"
              >
                Feedback / Remarks{" "}
                <span className="text-muted-foreground/70">(Mandatory if rejecting)</span>
              </label>
              <textarea
                id="faculty-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter any guidance, conditional requirements, or reason for decision..."
                rows={3}
                disabled={submitting}
                className={`${input} min-h-[90px] resize-y`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleDecision("APPROVED")}
                disabled={submitting}
                className={`${btn} inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white`}
              >
                <CheckCircle className="h-4 w-4" />
                <span>{submitting ? "Submitting..." : "Approve Permission"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDecision("REJECTED")}
                disabled={submitting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-destructive px-5 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                <span>{submitting ? "Submitting..." : "Reject Permission"}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: "/faculty/consents" })}
                disabled={submitting}
                className={`${btnOutline} ml-auto text-xs`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
