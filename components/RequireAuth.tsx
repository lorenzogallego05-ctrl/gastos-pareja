"use client";

import { useAuth } from "@/lib/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, perfil, cargando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (cargando) return;
    if (!session) {
      router.replace("/login");
    } else if (!perfil) {
      router.replace("/onboarding");
    }
  }, [cargando, session, perfil, router]);

  if (cargando || !session || !perfil) return null;

  return <>{children}</>;
}
