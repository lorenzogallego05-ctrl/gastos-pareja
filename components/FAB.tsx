import Link from "next/link";

export default function FAB() {
  return (
    <Link
      href="/nuevo"
      aria-label="Cargar gasto nuevo"
      className="fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl font-bold text-white shadow-lg ring-4 ring-background transition-transform active:scale-95"
      style={{ bottom: "calc(5.75rem + var(--safe-bottom))" }}
    >
      +
    </Link>
  );
}
