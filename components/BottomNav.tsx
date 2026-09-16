"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/historial", label: "Historial", icon: "📋" },
  { href: "/ingresos", label: "Finanzas", icon: "💰" },
  { href: "/configuracion", label: "Ajustes", icon: "⚙️" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="glass fixed inset-x-0 bottom-0 z-30 flex items-center justify-around gap-1 rounded-t-[28px] px-2 pt-2"
      style={{ paddingBottom: "calc(0.5rem + var(--safe-bottom))" }}
    >
      {TABS.map((tab) => {
        const activo = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 text-[11px] font-semibold transition-colors ${
              activo ? "bg-accent/15 text-accent" : "text-subtle"
            }`}
          >
            <span className="text-xl leading-none" aria-hidden>
              {tab.icon}
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
