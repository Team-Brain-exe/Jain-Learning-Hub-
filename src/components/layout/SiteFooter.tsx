import { Link } from "@tanstack/react-router";
import { categories } from "@/data/courses";
import { JgiLogo } from "./Brand";

export function SiteFooter() {
  const h = "text-sm font-semibold text-foreground";
  const a = "text-sm text-muted-foreground transition hover:text-primary";
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <JgiLogo className="h-11 w-11" />
            <div>
              <p className="font-bold text-primary">JAIN FET Learning Hub</p>
              <p className="text-xs text-muted-foreground">Faculty of Engineering and Technology</p>
            </div>
          </div>
          <p className="mt-4 text-sm font-medium text-navy">Learn. Create. Share Knowledge.</p>
        </div>
        <div className="space-y-2.5">
          <p className={h}>Explore</p>
          <Link to="/courses" className={`block ${a}`}>Explore Courses</Link>
          <Link to="/my-learning" className={`block ${a}`}>My Learning</Link>
          <Link to="/become-a-creator" className={`block ${a}`}>Become a Creator</Link>
          <Link to="/verify" className={`block ${a}`}>Verify a certificate</Link>
          <Link to="/about" className={`block ${a}`}>About</Link>
          <Link to="/about" hash="help" className={`block ${a}`}>Help</Link>
        </div>
        <div className="space-y-2.5">
          <p className={h}>Learning Categories</p>
          {categories.slice(0, 5).map((c) => (
            <Link key={c.name} to="/courses" search={{ category: c.name }} className={`block ${a}`}>{c.name}</Link>
          ))}
        </div>
        <div className="space-y-2.5">
          <p className={h}>Contact</p>
          <p className="text-sm text-muted-foreground">Faculty of Engineering and Technology<br />JAIN (Deemed-to-be University)<br />Bengaluru, Karnataka</p>
          <p className="text-sm break-words text-muted-foreground">learninghub@example.edu (placeholder)</p>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted-foreground sm:px-6">
          <p>© {new Date().getFullYear()} JAIN FET Learning Hub. All rights reserved.</p>
          <p className="mt-1">Official university branding and certification are subject to institutional approval.</p>
        </div>
      </div>
    </footer>
  );
}
