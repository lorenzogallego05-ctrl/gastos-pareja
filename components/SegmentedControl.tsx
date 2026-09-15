"use client";

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="glass flex gap-1 rounded-full p-1">
      {options.map((opt) => {
        const activo = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`min-h-[38px] flex-1 rounded-full text-sm font-semibold transition-colors ${
              activo
                ? "bg-accent text-white shadow-sm"
                : "text-muted"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
