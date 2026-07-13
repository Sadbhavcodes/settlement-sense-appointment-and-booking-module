"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Root entry point → /login
 * The login page redirects authenticated users to /appointments.
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return null;
}
