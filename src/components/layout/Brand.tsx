import { Link } from "@tanstack/react-router";
import logo from "@/assets/jgi-logo.png.asset.json";

export function JgiLogo({ className = "h-9 w-9" }: { className?: string }) {
  return <img src={logo.url} alt="JAIN (Deemed-to-be University) JGI logo" className={`${className} shrink-0 rounded-full object-cover`} />;
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <JgiLogo />
      <span className="leading-tight">
        <span className="block text-[17px] font-bold tracking-tight text-primary">JAIN FET</span>
        {!compact && <span className="block text-xs font-semibold text-navy">Learning Hub</span>}
      </span>
    </Link>
  );
}
