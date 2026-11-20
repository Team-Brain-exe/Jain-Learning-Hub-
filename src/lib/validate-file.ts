import { fileTypes } from "@/data/file-types";
import type { ContentFormat } from "@/data/upload-permissions";

/**
 * Validates a file's extension and size against the configured limits for its content format.
 * Extension check is case-insensitive (e.g. `LESSON.MP4` is valid).
 *
 * @returns An error string if invalid, or `null` if valid.
 */
export function validateFile(
  file: { name: string; size: number },
  format: ContentFormat,
): string | null {
  const config = fileTypes[format];
  if (!config) {
    return "Unknown content format.";
  }

  const dotIndex = file.name.lastIndexOf(".");
  if (dotIndex === -1 || dotIndex === file.name.length - 1) {
    return `That file type isn't allowed for ${config.label}. Use: ${config.extensions.join(", ")}.`;
  }

  const extension = file.name.slice(dotIndex + 1).toLowerCase();

  if (!config.extensions.includes(extension)) {
    return `That file type isn't allowed for ${config.label}. Use: ${config.extensions.join(", ")}.`;
  }

  const maxBytes = config.maxMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File is too large (max ${config.maxMB} MB).`;
  }

  return null;
}
