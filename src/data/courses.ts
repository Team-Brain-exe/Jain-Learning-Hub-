import python from "@/assets/course-python.jpg";
import dsa from "@/assets/course-dsa.jpg";
import mern from "@/assets/course-mern.jpg";
import ml from "@/assets/course-ml.jpg";
import dbms from "@/assets/course-dbms.jpg";
import git from "@/assets/course-git.jpg";

export type Level = "Beginner" | "Intermediate" | "Advanced";
export type CourseType = "Faculty Course" | "Student Creator";

export interface LessonResource { title: string; url: string }
export interface Lesson {
  title: string;
  minutes: number;
  /** Optional real content (set for creator-published courses). */
  kind?: "video" | "reading" | "quiz" | undefined;
  description?: string | undefined;
  videoUrl?: string | undefined;
  captionsUrl?: string | undefined;
  resources?: LessonResource[] | undefined;
  transcript?: string | undefined;
}
export interface Module { title: string; lessons: Lesson[] }
export interface Course {
  slug: string;
  title: string;
  category: string;
  level: Level;
  weeks: number;
  type: CourseType;
  instructor: { name: string; role: string };
  description: string;
  overview: string;
  keywords: string[];
  thumbnail: string;
  learners: number;
  rating: number;
  addedOn: string;
  outcomes: string[];
  prerequisites: string[];
  modules: Module[];
}

export const categories = [
  { name: "Programming", icon: "Code2", description: "Core languages, logic and problem solving." },
  { name: "Artificial Intelligence", icon: "Brain", description: "Machine learning, models and intelligent systems." },
  { name: "Data Science", icon: "BarChart3", description: "Analyse, visualise and reason with data." },
  { name: "Cloud Computing", icon: "Cloud", description: "Deploy and scale on modern cloud platforms." },
  { name: "Cybersecurity", icon: "ShieldCheck", description: "Protect systems, networks and information." },
  { name: "Web Development", icon: "Globe", description: "Build responsive, full-stack web applications." },
  { name: "Database Management", icon: "Database", description: "Design, query and manage relational data." },
] as const;

const L = (title: string, minutes: number): Lesson => ({ title, minutes });

export const courses: Course[] = [
  {
    slug: "python-programming-fundamentals",
    title: "Python Programming Fundamentals",
    category: "Programming",
    level: "Beginner",
    weeks: 6,
    type: "Faculty Course",
    instructor: { name: "Dr. Kavya Raghunath", role: "Associate Professor, Computer Science & Engineering" },
    description: "Write your first programs and build a strong foundation in Python syntax, logic and data structures.",
    overview: "A hands-on introduction to Python for first-year engineers. You will move from installing Python to writing structured, reusable programs that solve real problems.",
    keywords: ["python", "basics", "loops", "functions"],
    thumbnail: python,
    learners: 1840,
    rating: 4.8,
    addedOn: "2026-06-12",
    outcomes: ["Write, run and debug Python programs", "Use variables, operators and conditional logic", "Build reusable functions and loops", "Work with lists, tuples, dictionaries and sets"],
    prerequisites: ["No prior programming experience required", "Basic computer literacy and a laptop"],
    modules: [
      { title: "Introduction to Python", lessons: [L("What is Python?", 8), L("Installing Python", 12), L("First Python Program", 15)] },
      { title: "Programming Fundamentals", lessons: [L("Variables and Data Types", 18), L("Operators", 14), L("Conditional Statements", 20)] },
      { title: "Control Flow", lessons: [L("Loops", 22), L("Functions", 25), L("Basic Problem Solving", 30)] },
      { title: "Data Structures", lessons: [L("Lists", 18), L("Tuples", 10), L("Dictionaries", 16), L("Sets", 12)] },
      { title: "Final Assessment", lessons: [L("Practice Questions", 30), L("Final Quiz", 25)] },
    ],
  },
  {
    slug: "data-structures-and-algorithms",
    title: "Data Structures and Algorithms",
    category: "Programming",
    level: "Intermediate",
    weeks: 8,
    type: "Faculty Course",
    instructor: { name: "Prof. Arjun Menon", role: "Assistant Professor, Computer Science & Engineering" },
    description: "Master arrays, trees, graphs and the algorithms that power efficient software and technical interviews.",
    overview: "Learn to analyse complexity and choose the right data structure for each problem, with weekly coding practice.",
    keywords: ["dsa", "algorithms", "trees", "graphs", "interview"],
    thumbnail: dsa,
    learners: 1320,
    rating: 4.7,
    addedOn: "2026-07-03",
    outcomes: ["Analyse time and space complexity", "Implement stacks, queues, trees and graphs", "Apply sorting, searching and recursion", "Solve common interview-style problems"],
    prerequisites: ["Comfort with one programming language", "Basic understanding of loops and functions"],
    modules: [
      { title: "Complexity Analysis", lessons: [L("Big-O Notation", 20), L("Analysing Loops", 18)] },
      { title: "Linear Structures", lessons: [L("Arrays and Strings", 22), L("Linked Lists", 25), L("Stacks and Queues", 20)] },
      { title: "Trees and Graphs", lessons: [L("Binary Trees", 28), L("Binary Search Trees", 24), L("Graph Traversal", 30)] },
      { title: "Algorithms", lessons: [L("Sorting", 26), L("Searching", 18), L("Recursion and DP", 35)] },
      { title: "Final Assessment", lessons: [L("Coding Challenges", 45), L("Final Quiz", 25)] },
    ],
  },
  {
    slug: "mern-full-stack-development",
    title: "MERN Full Stack Development",
    category: "Web Development",
    level: "Intermediate",
    weeks: 10,
    type: "Student Creator",
    instructor: { name: "Rohan Shetty", role: "Student Creator, B.Tech CSE (Final Year)" },
    description: "Build and deploy full-stack apps with MongoDB, Express, React and Node.js, from idea to production.",
    overview: "A project-driven course where you build a complete web application end to end. Faculty reviewed before publication.",
    keywords: ["mern", "react", "node", "mongodb", "express", "javascript"],
    thumbnail: mern,
    learners: 960,
    rating: 4.6,
    addedOn: "2026-09-20",
    outcomes: ["Build REST APIs with Node.js and Express", "Model data with MongoDB", "Create interactive interfaces with React", "Deploy a full-stack application"],
    prerequisites: ["HTML, CSS and JavaScript basics", "Familiarity with the command line"],
    modules: [
      { title: "JavaScript Refresher", lessons: [L("Modern JavaScript", 25), L("Async and Promises", 22)] },
      { title: "Backend with Node & Express", lessons: [L("Setting Up a Server", 20), L("Routing and Middleware", 24), L("REST API Design", 28)] },
      { title: "MongoDB", lessons: [L("Documents and Collections", 18), L("Mongoose Models", 22)] },
      { title: "Frontend with React", lessons: [L("Components and State", 26), L("Fetching Data", 20), L("Forms and Validation", 24)] },
      { title: "Capstone Project", lessons: [L("Building the App", 60), L("Deployment", 30), L("Final Review", 20)] },
    ],
  },
  {
    slug: "introduction-to-machine-learning",
    title: "Introduction to Machine Learning",
    category: "Artificial Intelligence",
    level: "Beginner",
    weeks: 7,
    type: "Faculty Course",
    instructor: { name: "Dr. Meera Iyer", role: "Professor, Artificial Intelligence & Machine Learning" },
    description: "Understand how machines learn from data and train your first regression and classification models.",
    overview: "A gentle, intuitive introduction to core machine learning concepts using Python and scikit-learn.",
    keywords: ["ml", "ai", "regression", "classification", "scikit-learn", "data"],
    thumbnail: ml,
    learners: 1575,
    rating: 4.8,
    addedOn: "2026-08-15",
    outcomes: ["Explain supervised and unsupervised learning", "Prepare and explore datasets", "Train regression and classification models", "Evaluate model performance"],
    prerequisites: ["Basic Python programming", "High-school level mathematics"],
    modules: [
      { title: "What is Machine Learning?", lessons: [L("ML in the Real World", 15), L("Types of Learning", 18)] },
      { title: "Working with Data", lessons: [L("Data Cleaning", 22), L("Exploratory Analysis", 24)] },
      { title: "Supervised Learning", lessons: [L("Linear Regression", 28), L("Logistic Regression", 26), L("Decision Trees", 24)] },
      { title: "Model Evaluation", lessons: [L("Train/Test Splits", 16), L("Metrics", 20)] },
      { title: "Final Assessment", lessons: [L("Mini Project", 45), L("Final Quiz", 25)] },
    ],
  },
  {
    slug: "database-management-systems",
    title: "Database Management Systems",
    category: "Database Management",
    level: "Beginner",
    weeks: 5,
    type: "Faculty Course",
    instructor: { name: "Prof. Sandeep Kulkarni", role: "Assistant Professor, Information Science & Engineering" },
    description: "Design relational databases, write SQL queries and understand how data is stored and kept consistent.",
    overview: "Covers ER modelling, normalisation and SQL, with practical exercises on a real relational database.",
    keywords: ["dbms", "sql", "database", "normalisation", "er"],
    thumbnail: dbms,
    learners: 1105,
    rating: 4.5,
    addedOn: "2026-05-28",
    outcomes: ["Design ER models for real systems", "Normalise relational schemas", "Write SQL queries with joins", "Understand transactions and ACID"],
    prerequisites: ["No prior database knowledge required", "Basic logical reasoning"],
    modules: [
      { title: "Database Concepts", lessons: [L("Why Databases?", 12), L("DBMS Architecture", 18)] },
      { title: "Data Modelling", lessons: [L("ER Diagrams", 24), L("Relational Model", 20)] },
      { title: "SQL", lessons: [L("SELECT and Filtering", 22), L("Joins", 26), L("Aggregations", 20)] },
      { title: "Design & Transactions", lessons: [L("Normalisation", 28), L("Transactions and ACID", 22)] },
      { title: "Final Assessment", lessons: [L("Practice Queries", 30), L("Final Quiz", 20)] },
    ],
  },
  {
    slug: "git-and-github-for-beginners",
    title: "Git and GitHub for Beginners",
    category: "Programming",
    level: "Beginner",
    weeks: 3,
    type: "Student Creator",
    instructor: { name: "Ananya Prakash", role: "Student Creator, B.Tech ISE (Third Year)" },
    description: "Track your code, collaborate with teammates and contribute to projects using Git and GitHub.",
    overview: "A short, practical course on version control workflows every engineer uses daily. Faculty reviewed before publication.",
    keywords: ["git", "github", "version control", "collaboration"],
    thumbnail: git,
    learners: 2210,
    rating: 4.9,
    addedOn: "2026-10-05",
    outcomes: ["Initialise and manage Git repositories", "Commit, branch and merge confidently", "Collaborate with pull requests", "Resolve merge conflicts"],
    prerequisites: ["Basic computer and terminal usage"],
    modules: [
      { title: "Version Control Basics", lessons: [L("Why Version Control?", 10), L("Installing Git", 12)] },
      { title: "Core Git Workflow", lessons: [L("Commits", 18), L("Branches", 20), L("Merging", 18)] },
      { title: "Working with GitHub", lessons: [L("Remotes and Push", 16), L("Pull Requests", 20), L("Resolving Conflicts", 22)] },
      { title: "Final Assessment", lessons: [L("Hands-on Exercise", 25), L("Final Quiz", 15)] },
    ],
  },
];

export const getCourse = (slug: string) => courses.find((c) => c.slug === slug);

export const durationBuckets = [
  { id: "short", label: "Under 5 weeks", test: (w: number) => w < 5 },
  { id: "medium", label: "5–8 weeks", test: (w: number) => w >= 5 && w <= 8 },
  { id: "long", label: "Over 8 weeks", test: (w: number) => w > 8 },
] as const;

export type SortKey = "popular" | "recent" | "name";

export interface CourseFilters {
  q?: string;
  categories?: string[];
  levels?: string[];
  durations?: string[];
  types?: string[];
  sort?: SortKey;
}

export function filterCourses(list: Course[], f: CourseFilters): Course[] {
  const q = f.q?.trim().toLowerCase();
  const out = list.filter((c) => {
    if (q) {
      const hay = [c.title, c.category, c.instructor.name, c.description, ...c.keywords].join(" ").toLowerCase();
      if (!q.split(/\s+/).every((t) => hay.includes(t))) return false;
    }
    if (f.categories?.length && !f.categories.includes(c.category)) return false;
    if (f.levels?.length && !f.levels.includes(c.level)) return false;
    if (f.types?.length && !f.types.includes(c.type)) return false;
    if (f.durations?.length && !durationBuckets.some((b) => f.durations!.includes(b.id) && b.test(c.weeks))) return false;
    return true;
  });
  const sort = f.sort ?? "popular";
  return [...out].sort((a, b) =>
    sort === "name" ? a.title.localeCompare(b.title) : sort === "recent" ? b.addedOn.localeCompare(a.addedOn) : b.learners - a.learners,
  );
}

export interface FlatLesson extends Lesson { id: string; moduleIndex: number; moduleTitle: string; index: number }

export function flattenLessons(course: Course): FlatLesson[] {
  const out: FlatLesson[] = [];
  course.modules.forEach((m, mi) =>
    m.lessons.forEach((l, li) => out.push({ ...l, id: `${mi + 1}-${li + 1}`, moduleIndex: mi, moduleTitle: m.title, index: out.length })),
  );
  return out;
}

export function courseProgress(course: Course, completed: string[] = []) {
  const all = flattenLessons(course);
  const done = all.filter((l) => completed.includes(l.id)).length;
  return { done, total: all.length, percent: all.length ? Math.round((done / all.length) * 100) : 0 };
}

/** Lesson to resume: last visited, else first incomplete, else first. */
export function resumeLessonId(course: Course, last?: string, completed: string[] = []) {
  const all = flattenLessons(course);
  if (last && all.some((l) => l.id === last)) return last;
  return (all.find((l) => !completed.includes(l.id)) ?? all[0])!.id;
}

export function lessonContent(course: Course, lesson: FlatLesson) {
  if (lesson.description || lesson.videoUrl || lesson.resources?.length || lesson.transcript) {
    return {
      description: lesson.description || `Lesson from "${lesson.moduleTitle}" in ${course.title}.`,
      resources: (lesson.resources ?? []).map((r) => ({ title: r.title, kind: "Link", meta: r.url, url: r.url })),
      transcript: (lesson.transcript ?? "")
        .split("\n").map((l) => l.trim()).filter(Boolean)
        .map((l) => { const m = l.match(/^\[?(\d{1,2}:\d{2})\]?\s*(.*)$/); return (m ? [m[1], m[2]] : ["", l]) as [string, string]; }),
      real: true as const,
    };
  }
  return {
    real: false as const,
    description: `In this lesson from "${lesson.moduleTitle}", ${course.instructor.name} walks through ${lesson.title.toLowerCase().replace(/\.$/, "")} with worked examples tied to ${course.title}. Watch the video, review the resources and mark the lesson complete when you are ready to move on.`,
    resources: [
      { title: `${lesson.title} — lecture slides`, kind: "PDF", meta: "Sample resource", url: "" },
      { title: `Practice worksheet: ${lesson.title}`, kind: "Worksheet", meta: "Sample resource", url: "" },
      { title: `Further reading on ${course.category}`, kind: "Reading", meta: "Sample resource", url: "" },
    ],
    transcript: [
      ["00:00", `Welcome back. In this lesson we'll focus on ${lesson.title.toLowerCase()}.`],
      ["00:42", `First, let's connect this to what we covered earlier in ${lesson.moduleTitle}.`],
      ["02:15", "Now let's work through an example together, step by step."],
      ["05:30", "Pause here and try the practice exercise from the resources tab."],
      [`${String(Math.max(lesson.minutes - 1, 1)).padStart(2, "0")}:00`, "That wraps up this lesson. Mark it complete and continue to the next one."],
    ] as [string, string][],
  };
}
