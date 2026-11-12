import { BarChart3, Brain, Cloud, Code2, Database, Globe, ShieldCheck, type LucideIcon } from "lucide-react";
const map: Record<string, LucideIcon> = { Code2, Brain, BarChart3, Cloud, ShieldCheck, Globe, Database };
export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const I = map[name] ?? Code2;
  return <I className={className} />;
}
