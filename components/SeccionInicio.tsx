"use client";

// Envuelve cada recuadro de Inicio para que se pueda ocultar. En modo
// "Personalizar" los recuadros se reemplazan por una fila con su nombre y
// un ojo para mostrarlos/ocultarlos — la misma idea que el modo Editar de
// "Tus cuentas".
export default function SeccionInicio({
  titulo,
  visible,
  personalizando,
  onAlternar,
  children,
}: {
  titulo: string;
  visible: boolean;
  personalizando: boolean;
  onAlternar: () => void;
  children: React.ReactNode;
}) {
  if (personalizando) {
    return (
      <div
        className={`glass flex items-center gap-3 rounded-2xl px-4 py-3 transition-opacity ${
          visible ? "" : "opacity-40"
        }`}
      >
        <span className="flex-1 text-sm font-medium text-foreground">
          {titulo}
        </span>
        <button
          type="button"
          onClick={onAlternar}
          aria-label={visible ? `Ocultar ${titulo}` : `Mostrar ${titulo}`}
          className="flex h-9 w-9 items-center justify-center rounded-full text-base active:bg-border/60"
        >
          {visible ? "👁️" : "🙈"}
        </button>
      </div>
    );
  }

  if (!visible) return null;

  return <>{children}</>;
}
