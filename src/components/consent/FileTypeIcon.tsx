import {
  FileAudio,
  FileText,
  FileType as LucideFileType,
  FileVideo,
  Image as LucideImage,
  Presentation,
  type LucideIcon,
} from "lucide-react";

import type { ContentFormat } from "@/data/upload-permissions";

const iconMap: Record<ContentFormat, LucideIcon> = {
  video: FileVideo,
  audio: FileAudio,
  ppt: Presentation,
  pdf: FileText,
  docx: LucideFileType,
  image: LucideImage,
};

export function FileTypeIcon({ format, className }: { format: ContentFormat; className?: string }) {
  const Icon = iconMap[format];
  return <Icon className={className} aria-hidden="true" />;
}
