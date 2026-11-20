import { useSystemCheck } from "@/hooks/use-system-check";
import { card } from "@/components/studio/ui";

interface SystemCheckProps {
  singleTab: boolean;
}

function Row({ label, ok }: { label: string; ok: boolean | null }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2 text-sm">
      <span>{label}</span>
      {ok === null ? (
        <span className="text-muted-foreground">Checking…</span>
      ) : ok ? (
        <span className="font-semibold text-success">✓ Yes</span>
      ) : (
        <span className="font-semibold text-destructive">✕ No</span>
      )}
    </li>
  );
}

/** Pre-exam browser checks. Fullscreen is advisory: without it the exam runs warn-only. */
export function SystemCheck({ singleTab }: SystemCheckProps) {
  const { ready, fullscreen, screenOk, storageOk } = useSystemCheck();
  const v = (ok: boolean): boolean | null => (ready ? ok : null);
  return (
    <section className={card} aria-labelledby="system-check-title">
      <h2 id="system-check-title" className="text-base font-semibold">
        System check
      </h2>
      <ul className="mt-2 divide-y divide-border">
        <Row label="Fullscreen supported" ok={v(fullscreen)} />
        <Row label="Screen size is enough" ok={v(screenOk)} />
        <Row label="Browser storage works" ok={v(storageOk)} />
        <Row label="Exam is open in one tab" ok={singleTab} />
      </ul>
      {ready && !fullscreen && (
        <p className="mt-3 rounded-md bg-muted p-3 text-sm text-muted-foreground">
          Fullscreen isn't available on this device, so the exam runs in warn-only mode.
        </p>
      )}
    </section>
  );
}
