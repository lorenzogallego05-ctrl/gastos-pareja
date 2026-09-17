"use client";

import Image from "next/image";
import { infoDeEntidad } from "@/lib/entidades";

export default function EntidadLogo({
  entidad,
  icono,
  tamano = 36,
}: {
  entidad: string;
  icono?: string | null;
  tamano?: number;
}) {
  const info = infoDeEntidad(entidad);

  if (!info.logo) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-xl"
        style={{ width: tamano, height: tamano, backgroundColor: info.color }}
        aria-hidden
      >
        <span style={{ fontSize: tamano * 0.55, lineHeight: 1 }}>
          {icono ?? "🏦"}
        </span>
      </div>
    );
  }

  return (
    <div
      className="shrink-0 overflow-hidden rounded-xl"
      style={{
        width: tamano,
        height: tamano,
        backgroundColor: info.ajuste === "contain" ? "#ffffff" : undefined,
      }}
      aria-hidden
    >
      <Image
        src={info.logo}
        alt=""
        width={tamano}
        height={tamano}
        className={
          info.ajuste === "cover"
            ? "h-full w-full object-cover"
            : "h-full w-full object-contain p-1.5"
        }
      />
    </div>
  );
}
