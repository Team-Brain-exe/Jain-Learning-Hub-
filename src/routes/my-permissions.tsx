import { createFileRoute } from "@tanstack/react-router";
import { StudentPermissionStatus } from "@/components/consent/StudentPermissionStatus";

export const Route = createFileRoute("/my-permissions")({
  head: () => ({ meta: [{ title: "My Upload Permissions — JAIN FET Learning Hub" }] }),
  component: StudentPermissionStatus,
});
