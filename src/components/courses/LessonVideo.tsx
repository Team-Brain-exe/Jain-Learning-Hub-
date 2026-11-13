import { useState } from "react";
import { AlertTriangle } from "lucide-react";

/** Turns a user-supplied link into a safe player. Only http(s) URLs are accepted. */
function parse(url: string): { kind: "iframe" | "video"; src: string } | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtu.be") return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}` };
  if (host.endsWith("youtube.com") && u.searchParams.get("v")) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${u.searchParams.get("v")}` };
  if (host === "vimeo.com") return { kind: "iframe", src: `https://player.vimeo.com/video/${u.pathname.split("/").filter(Boolean)[0]}` };
  return { kind: "video", src: u.toString() };
}

export function LessonVideo({ url, captionsUrl, title }: { url: string; captionsUrl?: string | undefined; title: string }) {
  const [failed, setFailed] = useState(false);
  const p = parse(url);
  if (!p || failed)
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-navy px-6 text-center text-navy-foreground" role="alert">
        <AlertTriangle className="h-8 w-8" />
        <p className="font-semibold">This video couldn't be played</p>
        <p className="text-sm text-navy-foreground/70">The link may be invalid, private or unavailable. Open the lesson resources or contact the course creator.</p>
        <a href={url} target="_blank" rel="noreferrer noopener" className="text-sm underline">Open the link directly</a>
      </div>
    );
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      {p.kind === "iframe"
        ? <iframe src={p.src} title={title} className="h-full w-full" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="no-referrer" />
        : <video controls preload="metadata" className="h-full w-full" onError={() => setFailed(true)} crossOrigin="anonymous">
            <source src={p.src} />
            {captionsUrl && <track kind="captions" src={captionsUrl} srcLang="en" label="English" default />}
          </video>}
    </div>
  );
}
