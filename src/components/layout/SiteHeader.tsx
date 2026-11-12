import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, ChevronDown, CircleHelp, Menu, Search, User } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { categories } from "@/data/courses";
import { CategoryIcon } from "@/components/courses/CategoryIcon";
import { Brand } from "./Brand";

export function SearchBox({ size = "md", initial = "" }: { size?: "md" | "lg"; initial?: string }) {
  const [q, setQ] = useState(initial);
  const navigate = useNavigate();
  const lg = size === "lg";
  return (
    <form
      role="search"
      onSubmit={(e) => { e.preventDefault(); navigate({ to: "/courses", search: { q: q.trim() || undefined } }); }}
      className={`flex w-full items-center rounded-full border border-border bg-card transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 ${lg ? "h-14 pl-5 pr-1.5" : "h-10 pl-4 pr-1"}`}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search courses"
        placeholder="What do you want to learn?"
        className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground ${lg ? "text-base" : "text-sm"}`}
      />
      <button type="submit" aria-label="Search" className={`grid place-items-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/90 ${lg ? "h-11 w-11" : "h-8 w-8"}`}>
        <Search className={lg ? "h-5 w-5" : "h-4 w-4"} />
      </button>
    </form>
  );
}

const drawerLinks = [
  { to: "/", label: "Home" },
  { to: "/courses", label: "Explore Courses" },
  { to: "/courses", label: "Categories", hash: "filters" },
  { to: "/my-learning", label: "My Learning" },
  { to: "/become-a-creator", label: "Become a Creator" },
  { to: "/about", label: "About Learning Hub" },
  { to: "/login", label: "Sign In" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const iconBtn = "grid h-10 w-10 place-items-center rounded-full text-foreground/80 transition hover:bg-accent hover:text-primary";
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <button aria-label="Open menu" onClick={() => setOpen(true)} className={iconBtn}><Menu className="h-6 w-6" /></button>
        <Brand />
        <DropdownMenu>
          <DropdownMenuTrigger className="ml-2 hidden items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold text-primary transition hover:bg-accent md:flex">
            Explore <ChevronDown className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Browse by category</DropdownMenuLabel>
            {categories.map((c) => (
              <DropdownMenuItem key={c.name} asChild>
                <Link to="/courses" search={{ category: c.name }} className="cursor-pointer gap-2">
                  <CategoryIcon name={c.icon} className="h-4 w-4 text-primary" /> {c.name}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link to="/courses" className="cursor-pointer font-semibold text-primary">View all courses</Link></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="mx-4 hidden max-w-md flex-1 lg:block"><SearchBox /></div>
        <div className="ml-auto flex items-center gap-1">
          <Link to="/my-learning" className="hidden rounded-md px-3 py-2 text-sm font-semibold text-foreground/80 transition hover:bg-accent hover:text-primary md:block">My Learning</Link>
          <Link to="/courses" aria-label="Search" className={`${iconBtn} lg:hidden`}><Search className="h-5 w-5" /></Link>
          <Link to="/about" hash="help" aria-label="Help" className={`${iconBtn} hidden sm:grid`}><CircleHelp className="h-5 w-5" /></Link>
          <Popover>
            <PopoverTrigger aria-label="Notifications" className={iconBtn}><Bell className="h-5 w-5" /></PopoverTrigger>
            <PopoverContent align="end" className="w-72">
              <p className="text-sm font-semibold">Notifications</p>
              <p className="mt-2 text-sm text-muted-foreground">Welcome to JAIN FET Learning Hub! New faculty-reviewed courses are added every month.</p>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Account" className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-navy text-navy-foreground"><User className="h-4 w-4" /></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild><Link to="/login" className="cursor-pointer">Sign in</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/my-learning" className="cursor-pointer">My Learning</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/become-a-creator" className="cursor-pointer">Become a Creator</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-80">
          <SheetHeader><SheetTitle asChild><div><Brand /></div></SheetTitle></SheetHeader>
          <div className="mt-4 px-4 md:hidden"><SearchBox /></div>
          <nav className="mt-4 flex flex-col px-2">
            {drawerLinks.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                hash={"hash" in l ? l.hash : undefined}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-[15px] font-medium text-foreground transition hover:bg-accent hover:text-primary"
                activeProps={{ className: "text-primary" }}
                activeOptions={{ exact: true }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
