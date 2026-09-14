import { estanAlDia, fraseDeuda, Reparto } from "@/lib/calculos";

export default function DebtCard({ reparto }: { reparto: Reparto }) {
  const alDia = estanAlDia(reparto);

  return (
    <div
      className={`rounded-3xl p-6 text-center shadow-sm ${
        alDia ? "bg-good/10" : "bg-accent/10"
      }`}
    >
      <p className="text-sm font-medium text-muted">Balance del mes</p>
      <p
        className={`mt-2 text-2xl leading-snug font-extrabold ${
          alDia ? "text-good" : "text-foreground"
        }`}
      >
        {alDia && "✅ "}
        {fraseDeuda(reparto)}
      </p>
    </div>
  );
}
