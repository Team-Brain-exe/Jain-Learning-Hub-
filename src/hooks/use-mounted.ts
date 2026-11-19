import { useEffect, useState } from "react";

/**
 * `false` on the server and on the first client render, `true` once the component has mounted.
 * Use it to show a skeleton during hydration instead of a flash of localStorage-dependent content:
 *
 *   const mounted = useMounted();
 *   if (!mounted) return <PermissionListSkeleton />;
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
