import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import { ConsentForm } from "@/components/consent/ConsentForm";
import { UploadPermissionBadge } from "@/components/consent/UploadPermissionBadge";
import {
  useMyUploadPermissions,
  type MyPermissionView,
} from "@/hooks/use-my-upload-permissions";
import { initializeAuth, useAuth } from "@/hooks/use-auth";
import {
  createUploadPermission,
  fetchFacultyDirectory,
  type FacultyDirectoryItem,
} from "@/lib/api-client";
import type { ConsentFormValues } from "@/lib/consent-schema";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const buttonClass =
  "mt-4 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted";

export function StudentPermissionStatus() {
  const { role, token, isSignedIn } = useAuth();

  const [authChecking, setAuthChecking] = useState(true);
  const [faculty, setFaculty] = useState<FacultyDirectoryItem[]>([]);
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [facultyError, setFacultyError] = useState<string | null>(null);
  const [facultyAttempt, setFacultyAttempt] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canRequestPermission =
    !authChecking &&
    Boolean(token) &&
    isSignedIn &&
    (role === "learner" || role === "creator");

  const { items, loading, error, retry } =
    useMyUploadPermissions(canRequestPermission);

  useEffect(() => {
    let cancelled = false;

    initializeAuth().finally(() => {
      if (!cancelled) {
        setAuthChecking(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!canRequestPermission) return;

    let cancelled = false;

    setFacultyLoading(true);
    setFacultyError(null);

    fetchFacultyDirectory()
      .then((result) => {
        if (!cancelled) {
          setFaculty(result.filter((member) => member.is_active));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFacultyError(
            err instanceof Error ? err.message : "Unable to load faculty.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setFacultyLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canRequestPermission, facultyAttempt]);

  const retryFaculty = () => {
    setFacultyError(null);
    setFacultyAttempt((attempt) => attempt + 1);
  };

  const handleSubmit = async (values: ConsentFormValues) => {
    setSubmitError(null);
    setSuccessMessage(null);

    try {
      await createUploadPermission({
        faculty_id: values.facultyId,
        title: values.title,
        content_type: values.category.toLowerCase(),
        format: values.format,
        description: values.description,
        consent_declared: values.consent,
      });

      setSuccessMessage(
        "Your consent request has been submitted successfully. You can track its status below.",
      );

      retry();
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Unable to submit your request. Please try again.",
      );
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">My upload permissions</h1>

      <p className="mt-1 text-sm text-muted-foreground">
        Submit a content consent request and track the status of your requests.
      </p>

      <section className="mt-8 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Request upload permission</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Submit your content details and choose a faculty reviewer. This is
            the initial consent request, not the actual file upload or
            publication approval.
          </p>
        </div>

        {authChecking && (
          <p role="status" className="text-sm text-muted-foreground">
            Checking your sign-in session...
          </p>
        )}

        {!authChecking && (!isSignedIn || !token) && (
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="font-medium">Backend student sign-in required</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Please sign in with your backend student account to submit a
              consent request. Demo sign-in does not support API submissions.
            </p>

            <Link
              to="/login"
              className="mt-3 inline-block text-sm font-medium text-primary underline"
            >
              Go to sign in
            </Link>
          </div>
        )}

        {!authChecking &&
          token &&
          isSignedIn &&
          role !== "learner" &&
          role !== "creator" && (
            <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
              Only student accounts can submit upload permission requests.
            </p>
          )}

        {canRequestPermission && (
          <>
            {facultyLoading && (
              <p role="status" className="text-sm text-muted-foreground">
                Loading available faculty reviewers...
              </p>
            )}

            {facultyError && (
              <div
                role="alert"
                className="rounded-xl border border-border bg-card p-5"
              >
                <p className="font-medium">
                  We couldn't load the faculty directory.
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {facultyError}
                </p>

                <button
                  type="button"
                  onClick={retryFaculty}
                  className={buttonClass}
                >
                  Try again
                </button>
              </div>
            )}

            {!facultyLoading && !facultyError && faculty.length === 0 && (
              <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
                No active faculty reviewers are currently available.
              </p>
            )}

            {!facultyLoading && !facultyError && faculty.length > 0 && (
              <ConsentForm
                onSubmit={handleSubmit}
                faculty={faculty}
                facultyLoading={facultyLoading}
              />
            )}
          </>
        )}

        {submitError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 p-3 text-sm"
          >
            {submitError}
          </p>
        )}

        {successMessage && (
          <p
            role="status"
            className="rounded-lg border border-border bg-card p-3 text-sm"
          >
            {successMessage}
          </p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Your permission requests</h2>

        <div className="mt-4">
          {authChecking && (
            <p role="status" className="text-sm text-muted-foreground">
              Checking your sign-in session before loading requests...
            </p>
          )}

          {!authChecking && !canRequestPermission && (
            <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
              {!isSignedIn || !token
                ? "Please sign in with your backend student account to view your permission requests."
                : "Permission requests are available only to student accounts."}
            </p>
          )}

          {canRequestPermission && loading && (
            <p role="status" className="text-sm text-muted-foreground">
              Loading your requests...
            </p>
          )}

          {canRequestPermission && !loading && error && (
            <div
              role="alert"
              className="rounded-xl border border-border bg-card p-5"
            >
              <p className="font-medium">We couldn't load your requests.</p>

              <p className="mt-1 text-sm text-muted-foreground">{error}</p>

              <button type="button" onClick={retry} className={buttonClass}>
                Try again
              </button>
            </div>
          )}

          {canRequestPermission &&
            !loading &&
            !error &&
            items.length === 0 && (
              <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
                You have no permission requests yet.
              </p>
            )}

          {canRequestPermission &&
            !loading &&
            !error &&
            items.length > 0 && (
              <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {items.map((permission) => (
                  <PermissionItem
                    key={permission.id}
                    permission={permission}
                  />
                ))}
              </ul>
            )}
        </div>
      </section>
    </div>
  );
}

function PermissionItem({
  permission: p,
}: {
  permission: MyPermissionView;
}) {
  return (
    <li className="space-y-1.5 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold">{p.title}</p>
        <UploadPermissionBadge status={p.status} />
      </div>

      <p className="text-sm text-muted-foreground">
        Faculty: {p.facultyName ?? p.facultyId}
      </p>

      <p className="text-sm text-muted-foreground">
        Submitted: {formatDate(p.createdAt)}
      </p>

      {p.decidedAt && (
        <p className="text-sm text-muted-foreground">
          Decided: {formatDate(p.decidedAt)}
        </p>
      )}

      {p.remarks && (
        <p className="text-sm">
          <span className="font-medium">Faculty remarks:</span> {p.remarks}
        </p>
      )}
    </li>
  );
}
