import type { ContentFormat } from "@/data/upload-permissions";

// TODO: confirm with backend
export const fileTypes: Record<
  ContentFormat,
  { label: string; extensions: string[]; maxMB: number }
> = {
  video: { label: "Video", extensions: ["mp4", "webm"], maxMB: 500 },
  audio: { label: "Audio", extensions: ["mp3", "wav", "m4a"], maxMB: 100 },
  ppt: { label: "Presentation", extensions: ["ppt", "pptx"], maxMB: 50 },
  pdf: { label: "PDF", extensions: ["pdf"], maxMB: 25 },
  docx: { label: "Document", extensions: ["doc", "docx"], maxMB: 25 },
  image: { label: "Image", extensions: ["png", "jpg", "jpeg", "webp"], maxMB: 10 },
};
