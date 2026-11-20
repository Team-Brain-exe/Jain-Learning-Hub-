import { FileTypeIcon } from "@/components/consent/FileTypeIcon";
import { fileTypes } from "@/data/file-types";
import type { ContentFormat } from "@/data/upload-permissions";
import { cn } from "@/lib/utils";

const formats = Object.keys(fileTypes) as ContentFormat[];

export function SupportedFileTypes({ className }: { className?: string }) {
  return (
    <section
      aria-label="Supported file types and upload limits"
      className={cn("w-full rounded-2xl border border-border bg-card p-5 shadow-card", className)}
    >
      <div className="mb-4">
        <h3 className="text-base font-bold text-foreground">Supported File Formats & Limits</h3>
        <p className="text-xs text-muted-foreground">
          Accepted file formats and maximum upload size limits per lesson asset
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {formats.map((fmt) => {
          const info = fileTypes[fmt];
          return (
            <div
              key={fmt}
              className="flex flex-col items-center rounded-xl border border-border/80 bg-background/50 p-3.5 text-center transition hover:border-primary/40 hover:bg-card"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                <FileTypeIcon format={fmt} className="h-5 w-5" />
              </div>

              <p className="mt-2 text-xs font-bold text-foreground">{info.label}</p>

              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {info.extensions.map((ext) => `.${ext}`).join(", ")}
              </p>

              <span className="mt-2.5 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Up to {info.maxMB} MB
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
