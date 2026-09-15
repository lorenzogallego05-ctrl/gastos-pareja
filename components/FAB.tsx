import Link from "next/link";

export default function FAB() {
  return (
    <Link
      href="/nuevo"
      aria-label="Cargar gasto nuevo"
      className="fixed right-5 z-40 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full text-2xl font-bold text-white ring-4 ring-background transition-transform active:scale-95"
      style={{
        bottom: "calc(5.25rem + var(--safe-bottom))",
        background:
          "linear-gradient(160deg, color-mix(in srgb, var(--accent) 100%, white 18%), var(--accent) 55%, var(--accent-strong))",
        boxShadow: "0 10px 26px -6px color-mix(in srgb, var(--accent) 65%, transparent)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 32% 22%, rgba(255,255,255,0.55), transparent 55%)",
        }}
      />
      <span className="relative">+</span>
    </Link>
  );
}
