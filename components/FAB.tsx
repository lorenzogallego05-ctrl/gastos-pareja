import Link from "next/link";

export default function FAB() {
  return (
    <Link
      href="/nuevo"
      aria-label="Cargar gasto nuevo"
      className="fixed right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-3xl font-bold text-white shadow-lg transition-transform active:scale-95"
      style={{ bottom: "calc(5.75rem + var(--safe-bottom))" }}
    >
      +
    </Link>
  );
}
