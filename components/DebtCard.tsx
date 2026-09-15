import { estanAlDia, fraseDeuda, Reparto } from "@/lib/calculos";

export default function DebtCard({ reparto }: { reparto: Reparto }) {
  const alDia = estanAlDia(reparto);
  const tinte = alDia ? "var(--good)" : "var(--accent)";

  return (
    <div
      className="glass-strong relative overflow-hidden rounded-[32px] p-6 text-center"
      style={{
        background: `linear-gradient(155deg, color-mix(in srgb, ${tinte} 22%, var(--glass-surface-strong)), var(--glass-surface-strong) 70%)`,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full"
        style={{
          background: `radial-gradient(circle, color-mix(in srgb, ${tinte} 35%, transparent), transparent 70%)`,
        }}
      />
      <p className="relative text-sm font-medium text-muted">Balance del mes</p>
      <p
        className={`relative mt-2 text-2xl leading-snug font-extrabold ${
          alDia ? "text-good" : "text-foreground"
        }`}
      >
        {alDia && "✅ "}
        {fraseDeuda(reparto)}
      </p>
    </div>
  );
}
