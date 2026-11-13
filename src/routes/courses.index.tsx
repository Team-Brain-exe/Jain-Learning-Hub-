import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { categories, courses, durationBuckets, filterCourses, type SortKey } from "@/data/courses";
import { CourseCard } from "@/components/courses/CourseCard";

type CatalogSearch = { q?: string; category?: string };

export const Route = createFileRoute("/courses/")({
  validateSearch: (s: Record<string, unknown>): CatalogSearch => ({
    q: typeof s["q"] === "string" && s["q"] ? s["q"] : undefined,
    category: typeof s["category"] === "string" && s["category"] ? s["category"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Explore Courses — JAIN FET Learning Hub" },
      { name: "description", content: "Search and filter faculty-reviewed courses by category, level, duration and type." },
      { property: "og:title", content: "Explore Courses — JAIN FET Learning Hub" },
      { property: "og:description", content: "Find the right course to build your next skill." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Catalog,
});

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function Group({ title, options, value, onChange }: { title: string; options: { id: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset className="border-b border-border py-5 first:pt-0">
      <legend className="mb-3 text-sm font-bold text-foreground">{title}</legend>
      <div className="space-y-2.5">
        {options.map((o) => (
          <label key={o.id} className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground/85">
            <input type="checkbox" checked={value.includes(o.id)} onChange={() => onChange(toggle(value, o.id))} className="h-4 w-4 accent-primary" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Catalog() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/courses/" });
  const [q, setQ] = useState(search.q ?? "");
  const [cats, setCats] = useState<string[]>(search.category ? [search.category] : []);
  const [levels, setLevels] = useState<string[]>([]);
  const [durations, setDurations] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("popular");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { setQ(search.q ?? ""); }, [search.q]);
  useEffect(() => { setCats(search.category ? [search.category] : []); }, [search.category]);

  const results = useMemo(() => filterCourses(courses, { q, categories: cats, levels, durations, types, sort }), [q, cats, levels, durations, types, sort]);
  const active = cats.length + levels.length + durations.length + types.length + (q ? 1 : 0);

  const clear = () => {
    setQ(""); setCats([]); setLevels([]); setDurations([]); setTypes([]);
    navigate({ search: {} });
  };

  return (
    <div>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Explore Courses</h1>
          <p className="mt-2 text-muted-foreground">Find the right course to build your next skill.</p>
          <div className="mt-6 flex h-12 max-w-2xl items-center gap-2 rounded-full border border-border bg-card px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search courses" placeholder="Search by title, category, instructor or keyword" className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
            {q && <button aria-label="Clear search" onClick={() => setQ("")}><X className="h-4 w-4 text-muted-foreground" /></button>}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[260px_1fr]">
        <aside id="filters" className={`${showFilters ? "block" : "hidden"} h-fit rounded-xl border border-border bg-card p-5 lg:block`}>
          <div className="mb-5 flex items-center justify-between">
            <p className="font-bold">Filters</p>
            <button onClick={clear} disabled={!active} className="text-sm font-semibold text-primary disabled:text-muted-foreground">Clear all</button>
          </div>
          <Group title="Category" options={categories.map((c) => ({ id: c.name, label: c.name }))} value={cats} onChange={setCats} />
          <Group title="Level" options={["Beginner", "Intermediate", "Advanced"].map((l) => ({ id: l, label: l }))} value={levels} onChange={setLevels} />
          <Group title="Duration" options={durationBuckets.map((d) => ({ id: d.id, label: d.label }))} value={durations} onChange={setDurations} />
          <Group title="Course type" options={["Faculty Course", "Student Creator"].map((t) => ({ id: t, label: t }))} value={types} onChange={setTypes} />
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{results.length}</span> {results.length === 1 ? "result" : "results"}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowFilters((s) => !s)} className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-semibold lg:hidden">
                <SlidersHorizontal className="h-4 w-4" /> Filters{active ? ` (${active})` : ""}
              </button>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Sort by
                <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-10 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground">
                  <option value="popular">Most Popular</option>
                  <option value="recent">Recently Added</option>
                  <option value="name">Course Name</option>
                </select>
              </label>
            </div>
          </div>
          {results.length ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((c) => <CourseCard key={c.slug} course={c} />)}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <p className="text-lg font-semibold">No courses match your filters</p>
              <p className="mt-1 text-sm text-muted-foreground">New courses in this area are coming soon. Try a different search.</p>
              <button onClick={clear} className="mt-5 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">Clear filters</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
