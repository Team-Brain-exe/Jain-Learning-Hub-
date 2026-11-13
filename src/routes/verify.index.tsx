import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { btn, input } from "@/components/studio/ui";

export const Route = createFileRoute("/verify/")({
  head: () => ({ meta: [{ title: "Verify a certificate — JAIN FET Learning Hub" }, { name: "description", content: "Check the authenticity of a JAIN FET Learning Hub certificate." }] }),
  component: () => {
    const [code, setCode] = useState("");
    const navigate = useNavigate();
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <h1 className="text-3xl font-extrabold tracking-tight">Verify a certificate</h1>
        <p className="mt-2 text-muted-foreground">Enter the certificate ID printed on the certificate (e.g. JFET-XXXXXX).</p>
        <form className="mt-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) navigate({ to: "/verify/$certificateId", params: { certificateId: code.trim() } }); }}>
          <input className={input + " mt-0"} value={code} onChange={(e) => setCode(e.target.value)} placeholder="JFET-…" aria-label="Certificate ID" />
          <button className={btn}>Verify</button>
        </form>
      </div>
    );
  },
});
