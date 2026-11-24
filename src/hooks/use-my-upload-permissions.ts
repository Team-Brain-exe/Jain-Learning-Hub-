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

export function useMyUploadPermissions() {
  const [items, setItems] = useState<MyPermissionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchMyUploadPermissions(),
      fetchFacultyDirectory().catch((): FacultyDirectoryItem[] => []),
    ])
      .then(([permissions, faculty]) => {
        if (cancelled) return;
        const names = new Map<string, string>(faculty.map((f): [string, string] => [f.id, f.name]));
        setItems(
          permissions.map((p) => ({
            id: p.id,
            title: p.title,
            facultyId: p.faculty_id,
            facultyName: names.get(p.faculty_id) ?? null,
            status: toViewStatus(p.status),
            createdAt: p.created_at,
            decidedAt: p.decision_timestamp ?? null,
            remarks: p.remarks ?? null,
          })),
        );
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  return { items, loading, error, retry };
}
