import { z } from "zod";

import type { ContentCategory, ContentFormat } from "@/data/upload-permissions";

export const CONSENT_CATEGORIES = [
  "Academic",
  "Non-academic",
] as const satisfies readonly ContentCategory[];
export const CONSENT_FORMATS = [
  "video",
  "audio",
  "ppt",
  "pdf",
  "docx",
  "image",
] as const satisfies readonly ContentFormat[];

export const consentMessages = {
  title: "Enter a title (at least 5 characters).",
  titleTooLong: "Keep the title to 100 characters or fewer.",
  category: "Choose a category.",
  format: "Choose a content format.",
  description: "Describe the content and its purpose (at least 30 characters).",
  facultyEmail: "Enter a valid faculty email address.",
  consent: "You must accept the consent declaration to continue.",
} as const;

export const consentSchema = z.object({
  title: z.string().trim().min(5, consentMessages.title).max(100, consentMessages.titleTooLong),
  category: z.enum(CONSENT_CATEGORIES, { errorMap: () => ({ message: consentMessages.category }) }),
  format: z.enum(CONSENT_FORMATS, { errorMap: () => ({ message: consentMessages.format }) }),
  description: z.string().trim().min(30, consentMessages.description),
  facultyEmail: z.string().trim().email(consentMessages.facultyEmail),
  consent: z.boolean().refine((v) => v, { message: consentMessages.consent }),
  proposalName: z.string().trim().optional(),
});

export type ConsentFormValues = z.infer<typeof consentSchema>;
