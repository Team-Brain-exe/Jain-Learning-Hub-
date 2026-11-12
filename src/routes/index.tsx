import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, BookOpenCheck, Bot, Compass, FileUp, GraduationCap, ShieldCheck, Timer, UserCheck, ChevronRight } from "lucide-react";
import { categories, courses } from "@/data/courses";
import { CourseCard } from "@/components/courses/CourseCard";
import { CategoryIcon } from "@/components/courses/CategoryIcon";
import { SearchBox } from "@/components/layout/SiteHeader";
import { JgiLogo } from "@/components/layout/Brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JAIN FET Learning Hub — Learn. Create. Share Knowledge." },
      { name: "description", content: "Discover faculty-reviewed courses in programming, AI, data science and more from JAIN Faculty of Engineering and Technology." },
      { property: "og:title", content: "JAIN FET Learning Hub" },
      { property: "og:description", content: "Discover faculty-reviewed courses from your university community." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Flow({ steps }: { steps: { icon: typeof Compass; label: string; text: string }[] }) {
  return (
    <ol className="grid gap-4 md:grid-cols-4">
      {steps.map((s, i) => (
        <li key={s.label} className="relative rounded-xl border border-border bg-card p-6 shadow-card">
          {i < steps.length - 1 && <ChevronRight className="absolute -right-4 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 rounded-full bg-secondary p-1 text-primary md:block" />}
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary"><s.icon className="h-5 w-5" /></span>
            <span className="text-xs font-bold text-muted-foreground">STEP {i + 1}</span>
          </div>
          <p className="mt-4 font-semibold text-foreground">{s.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

function Home() {
  const btn = "inline-flex h-12 items-center justify-center rounded-md px-6 text-[15px] font-semibold transition";
  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-navy">
              <JgiLogo className="h-5 w-5" /> JAIN (Deemed-to-be University) · Faculty of Engineering and Technology
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Learn. Create.<br /><span className="text-primary">Share Knowledge.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Discover new skills, learn from your university community and share your expertise through faculty-reviewed courses.
            </p>
            <div className="mt-8 max-w-xl"><SearchBox size="lg" /></div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/courses" className={`${btn} bg-primary text-primary-foreground hover:bg-primary/90`}>Explore Courses</Link>
              <Link to="/become-a-creator" className={`${btn} border border-primary text-primary hover:bg-secondary`}>Become a Course Creator</Link>
            </div>
          </div>
          <div className="hidden rounded-2xl border border-border bg-background p-5 lg:block">
            <p className="text-sm font-semibold text-muted-foreground">Continue learning</p>
            <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
              <img src={courses[0].thumbnail} alt="" width={1024} height={640} className="aspect-[16/9] w-full object-cover" />
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Course 1/5 · Programming</p>
                <p className="mt-1 text-lg font-bold">Python Programming Fundamentals</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full w-2/5 rounded-full bg-primary" /></div>
                  <span className="text-sm text-muted-foreground">40% complete</span>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              {[["6+", "Courses"], ["9k+", "Learners"], ["100%", "Faculty reviewed"]].map(([n, l]) => (
                <div key={l} className="rounded-lg border border-border bg-card py-3"><p className="text-xl font-bold text-navy">{n}</p><p className="text-xs text-muted-foreground">{l}</p></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Explore learning by category</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <Link key={c.name} to="/courses" search={{ category: c.name }} className="group rounded-xl border border-border bg-card p-5 shadow-card transition hover:border-primary hover:shadow-hover">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-secondary text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <CategoryIcon name={c.icon} className="h-5 w-5" />
              </span>
              <p className="mt-4 font-semibold text-foreground">{c.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Popular courses to get you started</h2>
            <Link to="/courses" className="text-sm font-semibold text-primary hover:underline">View all courses →</Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => <CourseCard key={c.slug} course={c} />)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Your learning journey starts here</h2>
        <div className="mt-8">
          <Flow steps={[
            { icon: Compass, label: "Discover a Course", text: "Browse categories or search for the skill you need." },
            { icon: Timer, label: "Learn at Your Pace", text: "Short lessons that fit around your timetable." },
            { icon: BookOpenCheck, label: "Complete Assessments", text: "Practice questions and quizzes check your progress." },
            { icon: Award, label: "Earn Recognition", text: "Show what you have learned to your peers and faculty." },
          ]} />
        </div>
      </section>

      <section className="bg-navy text-navy-foreground">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Knowledge is better when shared.</h2>
            <p className="mt-4 text-navy-foreground/80">Turn what you know into something others can learn. Create educational courses, contribute to your university learning community and earn recognition for your work.</p>
            <Link to="/become-a-creator" className={`${btn} mt-8 bg-primary-foreground text-navy hover:bg-secondary`}>Become a Creator</Link>
          </div>
          <ul className="space-y-4">
            {[["Plan your course", "Outline modules, lessons and learning outcomes."], ["Build your content", "Add lessons, examples and assessments."], ["Submit for review", "Faculty review your course before it is published."]].map(([t, d], i) => (
              <li key={t} className="flex gap-4 rounded-xl border border-navy-foreground/15 p-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold text-sm font-bold text-navy">{i + 1}</span>
                <div><p className="font-semibold">{t}</p><p className="text-sm text-navy-foreground/75">{d}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-success"><ShieldCheck className="h-5 w-5" /> Faculty-verified learning</div>
        <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Learning with an additional layer of trust.</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">Every student-created course goes through AI-assisted checks and faculty review before publication. AI provides supporting findings on accuracy and originality — faculty members always make the final decision.</p>
        <div className="mt-8">
          <Flow steps={[
            { icon: FileUp, label: "Course Submission", text: "A creator submits their completed course." },
            { icon: Bot, label: "AI-Assisted Checks", text: "Automated checks flag possible issues for reviewers." },
            { icon: UserCheck, label: "Faculty Review", text: "Faculty assess quality and make the final decision." },
            { icon: GraduationCap, label: "Approved Publication", text: "Approved courses are published to learners." },
          ]} />
        </div>
      </section>
    </>
  );
}
