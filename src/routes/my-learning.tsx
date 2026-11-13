import { createFileRoute, Link } from "@tanstack/react-router";
import { courses } from "@/data/courses";
import { useEnrollments } from "@/hooks/use-enrollment";

export const Route = createFileRoute("/my-learning")({
  head: () => ({
    meta: [
      { title: "My Learning — JAIN FET Learning Hub" },
      { name: "description", content: "Courses you have enrolled in on JAIN FET Learning Hub." },
      { property: "og:title", content: "My Learning — JAIN FET Learning Hub" },
      { property: "og:description", content: "Courses you have enrolled in on JAIN FET Learning Hub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyLearning,
});

function MyLearning() {
  const slugs = useEnrollments();
  const list = courses.filter((c) => slugs.includes(c.slug));
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">My Learning</h1>
      <p className="mt-2 text-muted-foreground">Demo view — enrollments are saved on this device. The full learner dashboard is coming soon.</p>
      {list.length ? (
        <div className="mt-8 space-y-4">
          {list.map((c) => (
            <Link key={c.slug} to="/courses/$slug" params={{ slug: c.slug }} className="flex gap-5 rounded-xl border border-border bg-card p-4 shadow-card transition hover:shadow-hover">
              <img src={c.thumbnail} alt="" className="hidden h-24 w-40 rounded-lg object-cover sm:block" />
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase text-primary">{c.category}</p>
                <p className="mt-1 text-lg font-bold">{c.title}</p>
                <div className="mt-3 flex items-center gap-3"><div className="h-2 flex-1 rounded-full bg-muted"><div className="h-full w-0 rounded-full bg-primary" /></div><span className="text-sm text-muted-foreground">0% complete</span></div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-lg font-semibold">You haven't enrolled in any courses yet</p>
          <Link to="/courses" className="mt-5 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">Explore Courses</Link>
        </div>
      )}
    </div>
  );
}
