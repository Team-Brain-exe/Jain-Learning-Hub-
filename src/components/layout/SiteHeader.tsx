import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, ChevronDown, CircleHelp, Menu, Search, User } from "lucide-react";
import { useAuth, signOut } from "@/hooks/use-auth";
import { markAllRead, usePlatform } from "@/data/platform";
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

const roleLinks = {
  creator: [{ to: "/creator", label: "Creator Studio" }],
  reviewer: [{ to: "/faculty", label: "Review Queue" }],
  admin: [{ to: "/admin", label: "Admin" }, { to: "/faculty", label: "Review Queue" }],
  learner: [],
} as const;

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
  const { user } = useAuth();
  const notes = usePlatform().notifications.filter((n) => n.userId === user?.id);
  const unread = notes.filter((n) => !n.read).length;
  const extra = user ? roleLinks[user.role] : [];
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
            <PopoverTrigger aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className={`${iconBtn} relative`}>
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{unread}</span>}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <div className="flex items-center justify-between"><p className="text-sm font-semibold">Notifications</p>{unread > 0 && user && <button className="text-xs font-semibold text-primary" onClick={() => markAllRead(user.id)}>Mark all read</button>}</div>
              {!user && <p className="mt-2 text-sm text-muted-foreground">Sign in to see your notifications.</p>}
              <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto">
                {notes.slice(0, 15).map((n) => (
                  <li key={n.id} className={`rounded-md p-2 text-sm ${n.read ? "text-muted-foreground" : "bg-secondary font-medium"}`}>
                    {n.href ? <Link to={n.href} className="block">{n.text}</Link> : n.text}
                  </li>
                ))}
                {user && !notes.length && <li className="text-sm text-muted-foreground">You're all caught up.</li>}
              </ul>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Account" className="ml-1 grid h-10 w-10 place-items-center rounded-full bg-navy text-navy-foreground"><User className="h-4 w-4" /></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {user ? (
                <>
                  <DropdownMenuLabel>{user.name}<span className="block text-xs font-normal capitalize text-muted-foreground">{user.role}</span></DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {extra.map((l) => <DropdownMenuItem key={l.to} asChild><Link to={l.to} className="cursor-pointer font-semibold text-primary">{l.label}</Link></DropdownMenuItem>)}
                  <DropdownMenuItem asChild><Link to="/my-learning" className="cursor-pointer">My Learning</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/certificates" className="cursor-pointer">Certificates</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/profile" className="cursor-pointer">Profile</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/login" className="cursor-pointer">Switch demo account</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => signOut()} className="cursor-pointer">Sign out</DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild><Link to="/login" className="cursor-pointer">Sign in</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/my-learning" className="cursor-pointer">My Learning</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/become-a-creator" className="cursor-pointer">Become a Creator</Link></DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-80">
          <SheetHeader><SheetTitle asChild><div><Brand /></div></SheetTitle></SheetHeader>
          <div className="mt-4 px-4 md:hidden"><SearchBox /></div>
          <nav className="mt-4 flex flex-col px-2">
            {[...drawerLinks.filter((l) => !(user && l.to === "/login")), ...extra.map((l) => ({ ...l, to: l.to as string })), ...(user ? [{ to: "/certificates", label: "Certificates" }] : [])].map((l) => (
              <Link
                key={l.label}
                to={l.to as "/"}
                {..."hash" in l ? { hash: l.hash } : {}}
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
