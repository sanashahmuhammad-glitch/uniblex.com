"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";
import { consentPermitsAnalytics, hostConsentState } from "@/lib/ads/consent";

export function ConsentControlledAnalytics({ measurementId }: { measurementId?: string }) {
  const consent = useSyncExternalStore(hostConsentState.subscribe, hostConsentState.getSnapshot, hostConsentState.getServerSnapshot);
  if (!measurementId || !consentPermitsAnalytics(consent)) return null;
  return <>
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`} strategy="afterInteractive" />
    <Script id="google-analytics" strategy="afterInteractive">
      {`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${measurementId.replace(/[^A-Za-z0-9_-]/g, "")}');
      `}
    </Script>
  </>;
}
