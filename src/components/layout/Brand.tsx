import { Link } from "@tanstack/react-router";
import logo from "@/assets/jain-logo.png";

export function JgiLogo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <img
      src={logo}
      alt="JAIN (Deemed-to-be University) JGI logo"
      className={`${className} shrink-0 object-contain`}
    />
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <JgiLogo />
      <span className="inline-flex flex-col leading-tight">
        <span className="block font-sans text-[21px] font-extrabold tracking-tight text-navy border-b border-navy/50 pb-1">
          JAIN
        </span>
        {!compact && (
          <span className="block pt-1 text-xs font-semibold text-navy">
            Learning Hub
          </span>
        )}
      </span>
    </Link>
  );
}
