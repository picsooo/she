// components/analytics/PixelPageView.tsx
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Re-déclenche PageView à chaque changement de route (le App Router ne recharge pas la page).
 * IMPORTANT : à wrapper dans <Suspense> dans le layout (à cause de useSearchParams).
 */
export default function PixelPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fbq = (window as any).fbq;
    if (typeof fbq === "function") {
      fbq("track", "PageView");
    }
  }, [pathname, searchParams]);

  return null;
}
