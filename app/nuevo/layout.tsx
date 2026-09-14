import RequireAuth from "@/components/RequireAuth";

export default function NuevoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth>{children}</RequireAuth>;
}
