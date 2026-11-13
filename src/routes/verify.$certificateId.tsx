import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, BadgeX } from "lucide-react";
import { usePlatform } from "@/data/platform";
import { btnOutline, fmtDate } from "@/components/studio/ui";

export const Route = createFileRoute("/verify/$certificateId")({
  head: () => ({ meta: [{ title: "Certificate verification — JAIN FET Learning Hub" }, { name: "robots", content: "noindex" }] }),
  component: Verify,
});

function Verify() {
  const { certificateId } = Route.useParams();
  const cert = usePlatform().certificates.find((c) => c.id.toLowerCase() === certificateId.toLowerCase());
  const ok = cert?.status === "issued";
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      {ok ? <BadgeCheck className="mx-auto h-14 w-14 text-success" /> : <BadgeX className="mx-auto h-14 w-14 text-destructive" />}
      <h1 className="mt-4 text-2xl font-bold">{ok ? "Certificate is valid" : "Certificate not found"}</h1>
      {ok && cert ? (
        <dl className="mx-auto mt-6 max-w-sm space-y-3 rounded-xl border border-border bg-card p-5 text-left text-sm">
          {[["Certificate ID", cert.id], ["Holder", cert.learnerName], ["Course", cert.courseTitle], ["Issued", fmtDate(cert.issuedAt)], ["Authorised by", cert.issuedBy ?? "—"]].map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
        </dl>
      ) : <p className="mt-2 text-sm text-muted-foreground">No issued certificate matches “{certificateId}”. Check the ID and try again.</p>}
      <p className="mt-6 text-xs text-muted-foreground">Demo: verification reads certificates stored in this browser. A live deployment verifies against the university database.</p>
      <Link to="/verify" className={`${btnOutline} mt-6`}>Verify another</Link>
    </div>
  );
}
