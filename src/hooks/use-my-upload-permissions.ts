import { useCallback, useEffect, useState } from "react";
import {
  fetchFacultyDirectory,
  fetchMyUploadPermissions,
  type FacultyDirectoryItem,
  type UploadPermissionResponse,
} from "@/lib/api-client";

export type ViewStatus = "pending" | "approved" | "rejected";

export interface MyPermissionView {
  id: string;
  title: string;
  facultyId: string;
  facultyName: string | null;
  status: ViewStatus;
  createdAt: string;
  decidedAt: string | null;
  remarks: string | null;
}

function toViewStatus(status: UploadPermissionResponse["status"]): ViewStatus {
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  return "pending";
}

export function useMyUploadPermissions(enabled = true) {
  const [items, setItems] = useState<MyPermissionView[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      setLoading(false);
      setError(null);
      setItems([]);

      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);

    Promise.all([
      fetchMyUploadPermissions(),
      fetchFacultyDirectory().catch((): FacultyDirectoryItem[] => []),
    ])
      .then(([permissions, faculty]) => {
        if (cancelled) return;

        const names = new Map<string, string>(
          faculty.map((member): [string, string] => [
            member.id,
            member.name,
          ]),
        );

        setItems(
          permissions.map((permission) => ({
            id: permission.id,
            title: permission.title,
            facultyId: permission.faculty_id,
            facultyName: names.get(permission.faculty_id) ?? null,
            status: toViewStatus(permission.status),
            createdAt: permission.created_at,
            decidedAt: permission.decision_timestamp ?? null,
            remarks: permission.remarks ?? null,
          })),
        );
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Something went wrong.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, enabled]);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setAttempt((current) => current + 1);
  }, []);

  return { items, loading, error, retry };
}
