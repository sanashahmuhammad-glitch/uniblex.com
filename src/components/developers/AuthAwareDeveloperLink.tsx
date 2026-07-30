"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AuthAwareDeveloperLinkProps = {
  authenticatedHref: string;
  guestHref: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
};

export function AuthAwareDeveloperLink({
  authenticatedHref,
  guestHref,
  children,
  className,
  onClick,
  ariaLabel
}: AuthAwareDeveloperLinkProps) {
  const [href, setHref] = useState(guestHref);

  useEffect(() => {
    let active = true;
    const updateHref = (authenticated: boolean) => {
      if (active) setHref(authenticated ? authenticatedHref : guestHref);
    };

    void supabase?.auth.getSession().then(({ data }) => updateHref(Boolean(data.session)));
    const listener = supabase?.auth.onAuthStateChange((_event, session) => updateHref(Boolean(session)));

    return () => {
      active = false;
      listener?.data.subscription.unsubscribe();
    };
  }, [authenticatedHref, guestHref]);

  return (
    <Link href={href} className={className} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
