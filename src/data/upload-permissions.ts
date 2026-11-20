import { createStore } from "@/lib/create-store";
import type { AppUser } from "@/data/platform";

export type PermissionStatus = "pending" | "approved" | "rejected";
export type ContentFormat = "video" | "audio" | "ppt" | "pdf" | "docx" | "image";
export type ContentCategory = "Academic" | "Non-academic";

export interface UploadPermission {
  id: string;
  studentId: string;
  studentName: string;
  department: string;
  title: string;
  category: ContentCategory;
  format: ContentFormat;
  description: string;
  facultyEmail: string;
  consent: boolean;
  proposalName?: string | undefined; // optional supporting proposal (file name only, no real upload)
  status: PermissionStatus;
  facultyRemarks?: string | undefined; // shown to the student when rejected
  createdAt: string;
  decidedAt?: string;
  /** which of the 10 workflow steps the student is on (1-10). See Mandhan's stepper. */
  step: number;
}

const now = () => new Date().toISOString();
const uid = () => `up-${Math.random().toString(36).slice(2, 9)}`;

const seed = (): UploadPermission[] => [
  {
    id: "up-seed-pending",
    studentId: "u-creator",
    studentName: "Ananya Rao",
    department: "B.Tech CSE, Year 4",
    title: "Intro to Docker",
    category: "Academic",
    format: "video",
    description: "A 20 minute beginner walkthrough of containers.",
    facultyEmail: "reviewer@demo.jain.edu",
    consent: true,
    status: "pending",
    createdAt: now(),
    step: 4,
  },
  {
    id: "up-seed-approved",
    studentId: "u-creator",
    studentName: "Ananya Rao",
    department: "B.Tech CSE, Year 4",
    title: "Git Branching Basics",
    category: "Academic",
    format: "ppt",
    description: "Slides explaining branches, merges and rebases.",
    facultyEmail: "reviewer@demo.jain.edu",
    consent: true,
    status: "approved",
    createdAt: now(),
    decidedAt: now(),
    step: 7,
  },
  {
    id: "up-seed-rejected",
    studentId: "u-creator",
    studentName: "Ananya Rao",
    department: "B.Tech CSE, Year 4",
    title: "Campus Fest Recap",
    category: "Non-academic",
    format: "video",
    description: "Highlights from the annual fest.",
    facultyEmail: "reviewer2@demo.jain.edu",
    consent: true,
    status: "rejected",
    facultyRemarks:
      "Please add a learning objective; this does not yet fit the learning-hub scope.",
    createdAt: now(),
    decidedAt: now(),
    step: 6,
  },
];

export const uploadPermissions = createStore<UploadPermission[]>(
  "jfet-upload-permissions-v1",
  seed,
);
export const useUploadPermissions = uploadPermissions.use;

/** → POST /api/upload-permissions */
export function requestUploadPermission(
  student: AppUser,
  form: Pick<
    UploadPermission,
    "title" | "category" | "format" | "description" | "facultyEmail" | "consent" | "proposalName"
  >,
): string {
  const id = uid();
  uploadPermissions.update((list) => [
    {
      ...form,
      id,
      studentId: student.id,
      studentName: student.name,
      department: student.department ?? "",
      status: "pending",
      createdAt: now(),
      step: 4,
    },
    ...list,
  ]);
  return id;
}

/** → POST /api/faculty/upload-permissions/{id}/decision */
export function decideUploadPermission(
  id: string,
  decision: "approved" | "rejected",
  remarks?: string,
) {
  uploadPermissions.update((list) =>
    list.map((p) =>
      p.id === id
        ? {
            ...p,
            status: decision,
            facultyRemarks: remarks,
            decidedAt: now(),
            step: decision === "approved" ? 7 : 6,
          }
        : p,
    ),
  );
}

/** → GET /api/upload-permissions/me */
export const myUploadPermissions = (list: UploadPermission[], studentId: string) =>
  list.filter((p) => p.studentId === studentId);

export const resetUploadPermissions = () => uploadPermissions.reset();
