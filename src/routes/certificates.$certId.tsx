import { createFileRoute, Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { usePlatform } from "@/data/platform";
import { JgiLogo } from "@/components/layout/Brand";
import { btn, btnOutline, Empty, fmtDate, RequireRole } from "@/components/studio/ui";

export const Route = createFileRoute("/certificates/$certId")({
  head: () => ({ meta: [{ title: "Certificate — JAIN FET Learning Hub" }, { name: "robots", content: "noindex" }] }),
  component: () => <RequireRole roles={["learner", "creator", "reviewer", "admin"]}><View /></RequireRole>,
});

function View() {
  const { certId } = Route.useParams();
  const cert = usePlatform().certificates.find((c) => c.id === certId && c.status === "issued");
  if (!cert) return <div className="mx-auto max-w-xl px-4 py-16"><Empty title="Certificate not found or not yet issued"><Link to="/certificates" className={btn}>Back</Link></Empty></div>;
  const url = typeof window !== "undefined" ? `${window.location.origin}/verify/${cert.id}` : `/verify/${cert.id}`;
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-4 flex justify-between print:hidden"><Link to="/certificates" className="text-sm font-semibold text-primary">← Certificates</Link><button className={btnOutline} onClick={() => window.print()}><Printer className="h-4 w-4" />Print / Save as PDF</button></div>
      <div className="rounded-2xl border-8 border-double border-primary bg-card p-10 text-center shadow-card print:shadow-none">
        <JgiLogo className="mx-auto h-16 w-16" />
        <p className="mt-2 text-sm font-semibold uppercase tracking-widest text-primary">JAIN Faculty of Engineering and Technology</p>
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight">Certificate of Completion</h1>
        <p className="mt-6 text-muted-foreground">This certifies that</p>
        <p className="mt-2 text-3xl font-bold text-navy">{cert.learnerName}</p>
        <p className="mt-4 text-muted-foreground">has successfully completed the course</p>
        <p className="mt-2 text-2xl font-semibold">{cert.courseTitle}</p>
        {cert.quizScore !== undefined && <p className="mt-2 text-sm text-muted-foreground">Assessment score: {cert.quizScore}%</p>}
        <div className="mt-10 flex items-end justify-between text-left text-sm">
          <div><p className="text-muted-foreground">Issued on</p><p className="font-semibold">{fmtDate(cert.issuedAt)}</p><p className="mt-3 text-muted-foreground">Authorised by</p><p className="font-semibold">{cert.issuedBy}</p></div>
          <div className="text-right"><QRCodeSVG value={url} size={88} className="ml-auto" /><p className="mt-2 font-mono text-xs">{cert.id}</p><p className="text-xs text-muted-foreground">Verify at /verify/{cert.id}</p></div>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">Demo certificate — layout and wording pending institutional approval.</p>
      </div>
    </div>
  );
}
