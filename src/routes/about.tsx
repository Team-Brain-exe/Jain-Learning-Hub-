import { createFileRoute, Link } from "@tanstack/react-router";
import { JgiLogo } from "@/components/layout/Brand";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About & Help — JAIN FET Learning Hub" },
      { name: "description", content: "About JAIN FET Learning Hub and answers to common questions." },
      { property: "og:title", content: "About & Help — JAIN FET Learning Hub" },
      { property: "og:description", content: "About JAIN FET Learning Hub and answers to common questions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

const faqs = [
  ["Who can use the Learning Hub?", "Students and faculty of JAIN Faculty of Engineering and Technology."],
  ["How are student courses checked?", "AI-assisted checks provide supporting findings; faculty make the final publication decision."],
  ["Is enrollment saved to my account?", "Not yet — in this version enrollments are a demo saved on your device."],
  ["Do I get a certificate?", "Certification is planned and subject to institutional approval."],
];

function About() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="flex items-center gap-4"><JgiLogo className="h-16 w-16" /><div><h1 className="text-3xl font-extrabold tracking-tight">About Learning Hub</h1><p className="text-muted-foreground">JAIN (Deemed-to-be University) · Faculty of Engineering and Technology</p></div></div>
      <p className="mt-8 text-lg text-foreground/80">JAIN FET Learning Hub is a university learning platform where students learn from faculty and from each other. Students can become creators, and every student course is reviewed by faculty before it is published.</p>
      <h2 id="help" className="mt-14 scroll-mt-24 text-2xl font-bold">Help & FAQs</h2>
      <div className="mt-5 divide-y divide-border rounded-xl border border-border bg-card">
        {faqs.map(([q, a]) => (<details key={q} className="group p-5"><summary className="cursor-pointer font-semibold marker:text-primary">{q}</summary><p className="mt-2 text-sm text-muted-foreground">{a}</p></details>))}
      </div>
      <Link to="/courses" className="mt-10 inline-flex h-11 items-center rounded-md bg-primary px-6 font-semibold text-primary-foreground">Explore Courses</Link>
    </div>
  );
}
